# FitOnMe Authentication & Subscription Setup Guide

This guide walks you through setting up the complete authentication and subscription flow for the FitOnMe application.

## Overview

The authentication system includes:
- **Guest Mode**: 2 free AI try-ons without account
- **Sign-Up Modal**: Appears after free limit
- **OAuth (Google)**: One-click sign-in with Google
- **Magic Link**: Passwordless email authentication
- **Subscription Tracking**: Stripe integration for paid plans
- **User Dashboard**: Profile and subscription management

## Prerequisites

Before starting, ensure you have:
- A Supabase project (already configured with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)
- Access to your Supabase project dashboard
- A Google Cloud Console account (for OAuth)
- A Stripe account (for payments - can be set up later)

---

## Step 1: Apply Database Schema

### Option A: Using Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file `/supabase/schema.sql` in your code editor
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)

You should see a success message. The schema creates:
- `users` table for user profiles
- `subscriptions` table for subscription tracking
- `try_on_history` table for analytics
- Helper functions for credit management
- Row Level Security (RLS) policies
- Automatic triggers

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Apply the migration
supabase db push
```

### Verify Schema Installation

Run this query in SQL Editor to verify tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'subscriptions', 'try_on_history');
```

You should see all three tables listed.

---

## Step 2: Enable Google OAuth

### 2.1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen if prompted:
   - User Type: **External**
   - App name: **FitOnMe**
   - User support email: Your email
   - Authorized domains: Add your domain
6. Application type: **Web application**
7. Add Authorized redirect URIs:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
8. Click **Create**
9. Copy the **Client ID** and **Client Secret**

### 2.2: Configure in Supabase

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** and toggle it on
3. Paste your **Client ID**
4. Paste your **Client Secret**
5. Click **Save**

### 2.3: Add Redirect URLs

Still in Authentication settings:

1. Navigate to **URL Configuration**
2. Add your site URL:
   - Development: `http://localhost:5173`
   - Production: `https://your-domain.com`
3. Add redirect URLs:
   - `http://localhost:5173/auth/callback`
   - `https://your-domain.com/auth/callback`

---

## Step 3: Configure Magic Link Email

Magic Link (passwordless email) is enabled by default in Supabase.

### 3.1: Customize Email Template (Optional)

1. Go to **Authentication** → **Email Templates**
2. Select **Magic Link**
3. Customize the template if desired
4. The default template works fine

### 3.2: Configure SMTP (Production)

For production, set up custom SMTP:

1. Go to **Project Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Configure your email provider:
   - **SendGrid** (recommended)
   - **AWS SES**
   - **Mailgun**
   - Or custom SMTP server
4. Test by sending a test email

---

## Step 4: Test Authentication Flow

### Test Google OAuth:

1. Start your dev server: `npm run dev`
2. Navigate to `/try-on` page
3. Upload a photo and try on 2 outfits (uses free credits)
4. On the 3rd try-on attempt, sign-up modal should appear
5. Click **Continue with Google**
6. Complete OAuth flow
7. You should be redirected to `/auth/callback` then back to `/try-on`
8. Check if user appears in Supabase **Authentication** → **Users**

### Test Magic Link:

1. In the sign-up modal, enter your email
2. Click **Send Magic Link**
3. Check your email inbox
4. Click the magic link
5. You should be redirected and authenticated

### Verify Database Records:

After signing in, check in SQL Editor:

```sql
-- Check if user was created
SELECT * FROM public.users ORDER BY created_at DESC LIMIT 1;

-- Check credits
SELECT email, plan_type, credits_remaining, total_try_ons
FROM public.users
ORDER BY created_at DESC
LIMIT 5;
```

---

## Step 5: Understanding the Free Trial Flow

### Guest User Flow (No Account):

1. User visits site
2. Can perform 2 AI try-ons (tracked in localStorage via Zustand)
3. On 3rd attempt, `SignUpModal` appears
4. User must sign up to continue

### New Authenticated User:

1. User signs up via Google or Magic Link
2. Trigger `handle_new_user()` creates user in `users` table
3. Default values applied:
   - `plan_type`: `'free'`
   - `credits_remaining`: `2`
   - `total_try_ons`: `0`
4. User can perform 2 more try-ons (database-tracked)
5. After that, pricing modal appears prompting upgrade

### Paid User:

1. User subscribes (via Stripe - Step 6)
2. `plan_type` updated to `'weekly'`, `'monthly'`, or `'annual'`
3. Unlimited try-ons (credits not consumed)
4. Tracked in `subscriptions` table

---

## Step 6: Stripe Integration (Payment Processing)

**Status**: Ready for implementation (requires Stripe account)

### 6.1: Create Stripe Account

1. Sign up at [stripe.com](https://stripe.com)
2. Complete account verification
3. Get API keys from Dashboard → Developers → API keys
4. Copy:
   - Publishable key (starts with `pk_`)
   - Secret key (starts with `sk_`)

### 6.2: Add Environment Variables

Add to your `.env` file:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 6.3: Create Products and Prices in Stripe

In Stripe Dashboard:

1. Go to **Products** → **Add Product**
2. Create 3 products:

**Weekly Pass**:
- Name: Weekly Pass
- Price: $6.99/week
- Recurring: Weekly
- Copy the Price ID (e.g., `price_1abc123`)

**Monthly Plan**:
- Name: Monthly Plan
- Price: $14.99/month
- Recurring: Monthly
- Copy the Price ID

**Annual Pro Closet**:
- Name: Annual Pro Closet
- Price: $59/year
- Recurring: Yearly
- Copy the Price ID

### 6.4: Update PricingModal with Stripe Integration

Update `/src/components/PricingModal.tsx` to integrate Stripe Checkout:

```typescript
// Import Stripe
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Add price IDs to tiers
const tiers = [
  {
    name: "Weekly Pass",
    stripePriceId: "price_xxx", // Your actual price ID
    // ...
  },
  // ...
];

// Add checkout handler
const handleCheckout = async (priceId) => {
  const stripe = await stripePromise;

  // Call your backend to create checkout session
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId }),
  });

  const session = await response.json();

  // Redirect to Stripe Checkout
  await stripe.redirectToCheckout({ sessionId: session.id });
};
```

### 6.5: Create Stripe Webhook Endpoint

Create `/server/stripe-webhook.js`:

```javascript
import Stripe from 'stripe';
import { upsertSubscription } from '../src/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
}

async function handleSubscriptionUpdate(subscription) {
  // Update subscription in Supabase
  await upsertSubscription({
    subscription_id: subscription.id,
    user_id: subscription.metadata.userId, // Pass this when creating session
    plan: subscription.items.data[0].price.recurring.interval,
    status: subscription.status,
    start_date: new Date(subscription.current_period_start * 1000),
    end_date: new Date(subscription.current_period_end * 1000),
    stripe_customer_id: subscription.customer,
    stripe_price_id: subscription.items.data[0].price.id,
  });

  // Update user plan
  // ... (implement based on your needs)
}
```

### 6.6: Register Webhook in Stripe

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to your `.env` as `STRIPE_WEBHOOK_SECRET`

---

## Step 7: Deployment Checklist

Before deploying to production:

### Supabase:
- [ ] Database schema applied
- [ ] RLS policies enabled and tested
- [ ] Google OAuth configured with production redirect URLs
- [ ] Custom SMTP configured for emails
- [ ] Environment variables updated in hosting platform

### Stripe:
- [ ] Switch from test mode to live mode
- [ ] Use live API keys (not test keys)
- [ ] Webhook endpoint updated to production URL
- [ ] Test subscription flow end-to-end

### Frontend:
- [ ] Update `VITE_STRIPE_PUBLISHABLE_KEY` to live key
- [ ] Test all authentication flows
- [ ] Verify try-on limits work correctly
- [ ] Test sign-up modal appears after free limit

---

## Current Implementation Status

✅ **Completed:**
- Database schema with users, subscriptions, try_on_history tables
- Auth context and provider
- Sign-up modal with Google OAuth and Magic Link
- Free trial tracking (2 try-ons for guests, 2 for new users)
- Try-on permission checking
- User menu in Navigation with account info
- Auth callback page
- Credit tracking and decrementing

⏳ **Pending:**
- Stripe payment integration
- Subscription checkout flow
- Webhook handler for subscription events
- User dashboard for subscription management
- Backend API permission checks

---

## Troubleshooting

### Error: "No user found" after OAuth

**Solution**: Check that `handle_new_user()` trigger is installed:

```sql
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

If not found, rerun the schema.sql file.

### Error: "Invalid redirect URL"

**Solution**: Ensure redirect URLs are added to:
1. Supabase Auth → URL Configuration
2. Google Cloud Console → OAuth Credentials

### Magic Link not received

**Solution**:
1. Check spam folder
2. Verify SMTP settings in Supabase
3. Check email templates are enabled
4. For development, use test mode (emails logged to Supabase logs)

### Credits not decrementing

**Solution**: Check RLS policies allow the function to update:

```sql
-- Test credit decrement manually
SELECT decrement_user_credits('user-uuid-here');
```

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs/guides/auth
- **Stripe Docs**: https://stripe.com/docs/billing/subscriptions/build-subscription
- **Database README**: `/supabase/README.md`
- **TypeScript Types**: `/src/types/database.ts`

---

## Next Steps

1. **Test authentication flow** with Google and Magic Link
2. **Verify try-on limits** work correctly (2 free, then sign-up)
3. **Set up Stripe account** and create products
4. **Implement Stripe Checkout** in PricingModal
5. **Deploy and monitor** user sign-ups and conversions

Your authentication system is now ready! The foundation is in place for a complete freemium subscription model.
