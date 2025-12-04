-- FitOnMe Database Schema
-- This schema defines the users and subscriptions tables for authentication and payment tracking

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  auth_provider TEXT NOT NULL CHECK (auth_provider IN ('google', 'magic_link')),
  oauth_id TEXT,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'weekly', 'monthly', 'annual', 'day_pass')),
  plan_expiry TIMESTAMP WITH TIME ZONE,
  credits_remaining INTEGER NOT NULL DEFAULT 5,
  total_try_ons INTEGER NOT NULL DEFAULT 0,
  outfits_saved JSONB DEFAULT '[]'::jsonb,
  last_photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure either email or oauth_id exists
  CONSTRAINT email_or_oauth CHECK (email IS NOT NULL OR oauth_id IS NOT NULL)
);

-- Subscriptions table (synced with Stripe)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id TEXT UNIQUE, -- Stripe subscription ID
  plan TEXT NOT NULL CHECK (plan IN ('weekly', 'monthly', 'annual', 'day_pass')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'trialing', 'past_due')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  payment_provider TEXT NOT NULL DEFAULT 'stripe' CHECK (payment_provider IN ('stripe', 'appstore', 'googleplay')),
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Try-on history table (for tracking usage)
CREATE TABLE IF NOT EXISTS public.try_on_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  outfit_id TEXT NOT NULL,
  photo_url TEXT,
  result_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_oauth_id ON public.users(oauth_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_id ON public.subscriptions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_try_on_history_user_id ON public.try_on_history(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.try_on_history ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can read their own data
CREATE POLICY "Users can view own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own data (for sign-up)
CREATE POLICY "Users can insert own data"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Subscriptions table policies
-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for Stripe webhooks)
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Try-on history policies
-- Users can view their own history
CREATE POLICY "Users can view own try-on history"
  ON public.try_on_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own history
CREATE POLICY "Users can insert own try-on history"
  ON public.try_on_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to check if user has available credits
CREATE OR REPLACE FUNCTION check_user_credits(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan TEXT;
  user_credits INTEGER;
  user_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT plan_type, credits_remaining, plan_expiry
  INTO user_plan, user_credits, user_expiry
  FROM public.users
  WHERE id = user_uuid;

  -- Paid plans have unlimited credits
  IF user_plan IN ('weekly', 'monthly', 'annual', 'day_pass') THEN
    -- Check if plan is still active
    IF user_expiry IS NULL OR user_expiry > NOW() THEN
      RETURN TRUE;
    ELSE
      -- Plan expired, revert to free
      UPDATE public.users
      SET plan_type = 'free',
          credits_remaining = 0,
          plan_expiry = NULL
      WHERE id = user_uuid;
      RETURN FALSE;
    END IF;
  END IF;

  -- Free plan - check credits
  RETURN user_credits > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement user credits
CREATE OR REPLACE FUNCTION decrement_user_credits(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan TEXT;
  user_credits INTEGER;
BEGIN
  SELECT plan_type, credits_remaining
  INTO user_plan, user_credits
  FROM public.users
  WHERE id = user_uuid;

  -- Paid plans don't consume credits
  IF user_plan IN ('weekly', 'monthly', 'annual', 'day_pass') THEN
    UPDATE public.users
    SET total_try_ons = total_try_ons + 1
    WHERE id = user_uuid;
    RETURN TRUE;
  END IF;

  -- Free plan - check and decrement credits
  IF user_credits > 0 THEN
    UPDATE public.users
    SET credits_remaining = credits_remaining - 1,
        total_try_ons = total_try_ons + 1
    WHERE id = user_uuid;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, auth_provider, oauth_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'magic_link'),
    NEW.raw_user_meta_data->>'sub'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic user creation on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
