# Stripe Integration Setup Guide

This guide walks you through setting up Stripe for your FitOnMe subscription payments.

## Step 1: Create Stripe Account

1. Go to https://stripe.com
2. Click **Sign up** and create an account
3. Complete business verification (may take a few minutes)
4. You'll start in **Test mode** (perfect for development)

---

## Step 2: Get Your API Keys

1. In Stripe Dashboard, go to **Developers** → **API keys**
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (click "Reveal" to see it, starts with `sk_test_...`)

3. Copy both keys and add them to your `.env` file:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here
STRIPE_SECRET_KEY=sk_test_your_actual_key_here
```

---

## Step 3: Create Products and Prices

You need to create 3 subscription products in Stripe:

### Product 1: Weekly Pass

1. Go to **Products** in the left sidebar
2. Click **+ Add product**
3. Fill in:
   - **Name**: `Weekly Pass`
   - **Description**: `Ideal for events & trips - 30 AI try-ons per week`
   - **Pricing**:
     - Price: `$6.99`
     - Billing period: **Weekly**
     - **Recurring** (not one-time)
4. Click **Add product**
5. **Copy the Price ID** (starts with `price_...`) - you'll need this!

### Product 2: Monthly Plan (Most Popular)

1. Click **+ Add product**
2. Fill in:
   - **Name**: `Monthly Plan`
   - **Description**: `Best value for regular use - Unlimited AI try-ons`
   - **Pricing**:
     - Price: `$14.99`
     - Billing period: **Monthly**
     - **Recurring**
3. Click **Add product**
4. **Copy the Price ID**

### Product 3: Annual Pro Closet

1. Click **+ Add product**
2. Fill in:
   - **Name**: `Annual Pro Closet`
   - **Description**: `For power users & influencers - Everything + exclusive features`
   - **Pricing**:
     - Price: `$59.00`
     - Billing period: **Yearly**
     - **Recurring**
3. Click **Add product**
4. **Copy the Price ID**

---

## Step 4: Update Your Code with Price IDs

Open `/src/components/PricingModal.tsx` and replace the placeholder price IDs:

```typescript
const tiers = [
  // ... Free tier stays the same ...

  {
    name: "Weekly Pass",
    // ...
    stripePriceId: "price_1abc123...", // Your actual Weekly price ID
  },
  {
    name: "Monthly Plan",
    // ...
    stripePriceId: "price_1xyz789...", // Your actual Monthly price ID
  },
  {
    name: "Annual Pro Closet",
    // ...
    stripePriceId: "price_1def456...", // Your actual Annual price ID
  },
];
```

---

## Step 5: Set Up Webhooks (For Production)

Webhooks allow Stripe to notify your server about subscription events.

### Development Testing (Stripe CLI)

For local testing:

1. Install Stripe CLI:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. Login:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to http://localhost:3001/api/stripe/webhook
   ```

4. Copy the **webhook signing secret** (starts with `whsec_...`)
5. Add to your `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

### Production Webhooks

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **+ Add endpoint**
3. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret**
7. Add to your production environment variables

---

## Step 6: Test the Payment Flow

### Prerequisites:
1. ✅ Stripe API keys added to `.env`
2. ✅ Price IDs added to `PricingModal.tsx`
3. ✅ Backend server running (`node server/index.js`)
4. ✅ Frontend running (`npm run dev`)
5. ✅ User signed in (Google OAuth)

### Test Steps:

1. **Open your app**: http://localhost:5173/try-on

2. **Sign in** with Google if not already

3. **Use your free try-ons** until you see the pricing modal

4. **Click a paid plan** (e.g., "Monthly Plan")
   - You should be redirected to Stripe Checkout
   - You'll see a secure payment page hosted by Stripe

5. **Use Stripe test cards**:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - **3D Secure**: `4000 0025 0000 3155`
   - Use any future expiry date (e.g., 12/34)
   - Use any CVC (e.g., 123)
   - Use any ZIP (e.g., 12345)

6. **Complete payment**
   - You should be redirected back to `/try-on`
   - Check Stripe Dashboard → **Payments** to see the test payment
   - Check Stripe Dashboard → **Customers** to see the new customer
   - Check Stripe Dashboard → **Subscriptions** to see the subscription

7. **Check your server logs**:
   - You should see webhook events logged
   - Example: `Checkout session completed: cs_test_...`

---

## Step 7: Verify Database Updates

After successful payment, check Supabase:

1. Go to **Table Editor** → **subscriptions**
2. You should see a new row (this will be automatic once webhook handler is complete)
3. Go to **Table Editor** → **users**
4. User's `plan_type` should be updated
5. User's `credits_remaining` should reflect unlimited (or high number)

---

## Common Test Card Numbers

| Card Number          | Description                    |
|---------------------|--------------------------------|
| `4242 4242 4242 4242` | Successful payment             |
| `4000 0000 0000 0002` | Card declined                  |
| `4000 0025 0000 3155` | 3D Secure authentication       |
| `4000 0000 0000 9995` | Insufficient funds             |

Full list: https://stripe.com/docs/testing#cards

---

## Troubleshooting

### Error: "Failed to create checkout session"

**Solution**: Check that:
1. `STRIPE_SECRET_KEY` is set in `.env`
2. Backend server is running on port 3001
3. Price IDs are valid (copy from Stripe Dashboard)

### Error: "Webhook signature verification failed"

**Solution**:
1. Make sure `STRIPE_WEBHOOK_SECRET` matches your webhook endpoint
2. For local testing, use Stripe CLI (`stripe listen`)
3. For production, use the signing secret from Stripe Dashboard

### Payment succeeds but subscription not created

**Solution**:
1. Check Stripe Dashboard → **Developers** → **Events**
2. Look for `checkout.session.completed` event
3. Check your server logs for webhook handling
4. Verify webhook endpoint is accessible (not localhost in production)

### "Please sign in to subscribe" alert

**Solution**: User must be authenticated first. Make sure:
1. User has completed Google OAuth sign-in
2. `user` object exists in `useAuth()` hook
3. Session is persisted in Supabase

---

## Going Live (Production)

When you're ready to accept real payments:

1. **Complete Stripe account verification**
   - Go to **Settings** → **Account details**
   - Complete business information
   - Add bank account for payouts

2. **Switch to Live mode**
   - Toggle from **Test mode** to **Live mode** in dashboard
   - Get new API keys (starts with `pk_live_...` and `sk_live_...`)
   - Update production environment variables

3. **Create live products**
   - Recreate your products in Live mode
   - Get new live Price IDs
   - Update production code

4. **Set up live webhook**
   - Add production webhook endpoint
   - Update `STRIPE_WEBHOOK_SECRET` for production

5. **Test with real card**
   - Use a real credit card (you can refund it after)
   - Verify full payment flow works
   - Check money appears in Stripe balance

---

## Current Implementation Status

✅ **Completed:**
- Stripe dependencies installed
- Checkout session endpoint created (`/api/create-checkout-session`)
- Webhook endpoint created (`/api/stripe/webhook`)
- PricingModal integrated with Stripe
- Loading states and error handling

⏳ **TODO (when needed):**
- Complete webhook handler to update Supabase
- Add success/cancel pages with better UX
- Add subscription management (cancel, update)
- Add invoice history for users

---

## Next Steps

1. **Get your Stripe API keys** and add to `.env`
2. **Create 3 products** in Stripe Dashboard
3. **Copy Price IDs** and update `PricingModal.tsx`
4. **Test the flow** with test cards
5. **Celebrate!** 🎉 Your payment system is working!

---

## Support Resources

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe Documentation**: https://stripe.com/docs
- **Test Cards**: https://stripe.com/docs/testing#cards
- **Webhook Testing**: https://stripe.com/docs/webhooks/test
- **Stripe CLI**: https://stripe.com/docs/stripe-cli

Your Stripe integration is ready to go! Follow this guide to complete the setup.
