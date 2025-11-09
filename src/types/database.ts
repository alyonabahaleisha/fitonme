// Database types for Supabase

export type AuthProvider = 'google' | 'magic_link';
export type PlanType = 'free' | 'weekly' | 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trialing' | 'past_due';
export type PaymentProvider = 'stripe' | 'appstore' | 'googleplay';

export interface User {
  id: string;
  email: string | null;
  auth_provider: AuthProvider;
  oauth_id: string | null;
  plan_type: PlanType;
  plan_expiry: string | null;
  credits_remaining: number;
  total_try_ons: number;
  outfits_saved: string[]; // JSON array of outfit IDs
  last_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  subscription_id: string | null; // Stripe subscription ID
  plan: 'weekly' | 'monthly' | 'annual';
  status: SubscriptionStatus;
  start_date: string;
  end_date: string | null;
  payment_provider: PaymentProvider;
  stripe_customer_id: string | null;
  stripe_price_id: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface TryOnHistory {
  id: string;
  user_id: string;
  outfit_id: string;
  photo_url: string | null;
  result_url: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Subscription, 'id' | 'created_at' | 'updated_at'>>;
      };
      try_on_history: {
        Row: TryOnHistory;
        Insert: Omit<TryOnHistory, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<TryOnHistory, 'id' | 'created_at'>>;
      };
    };
  };
}
