# Google Analytics 4 Setup Guide

This document explains how to set up Google Analytics 4 (GA4) for FitOnMe to track user journeys and conversions.

## What We Track

### User Journey Events:
- **Authentication:**
  - Sign up started/completed
  - Login completed
  - Logout

- **Try-On Flow:**
  - Photo uploaded
  - Gender filter changed
  - Category filter changed
  - Outfit selected
  - Try-on started/completed/failed
  - Regenerate clicked
  - Free limit reached
  - Credits depleted

- **Shopping:**
  - Shopping panel opened
  - Product clicked

- **Monetization:**
  - Pricing modal opened
  - Plan selected
  - Checkout started
  - Purchase completed (via Stripe webhook)

- **UI Interactions:**
  - Feedback modal opened
  - Photo guidelines opened

- **User Properties:**
  - User ID
  - Email
  - Plan type (free/weekly/monthly/annual)
  - Auth provider (google/magic_link)

## Setup Instructions

### 1. Create GA4 Property

1. Go to [Google Analytics](https://analytics.google.com)
2. Click "Admin" (gear icon bottom left)
3. Click "Create Property"
4. Fill in property details:
   - Property name: "FitOnMe"
   - Time zone: Your timezone
   - Currency: USD
5. Click "Next" and complete setup wizard

### 2. Get Measurement ID

1. In Admin > Property column, click "Data Streams"
2. Click "Add stream" > "Web"
3. Enter your website URL:
   - **Production:** `https://your-production-domain.com`
   - **UAT:** `https://fitonme.vercel.app`
4. Stream name: "FitOnMe Web"
5. Click "Create stream"
6. Copy the **Measurement ID** (format: `G-XXXXXXXXXX`)

### 3. Add Measurement ID to Environment

#### Local Development:
```bash
# In .env file
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

#### Vercel (UAT/Production):
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add:
   - Key: `VITE_GA_MEASUREMENT_ID`
   - Value: Your GA4 Measurement ID
   - Environments: Select "Production" and/or "Preview"
5. Click "Save"
6. Redeploy your app

#### Render (Backend):
Not needed for backend - GA4 only runs on frontend

### 4. Verify Installation

1. Start your app in development:
   ```bash
   npm run dev
   ```

2. Open browser DevTools (F12)
3. Navigate through the app (upload photo, try on outfit, etc.)
4. Check console for GA logs: `Google Analytics initialized: G-XXXXXXXXXX`

5. Real-time verification:
   - Go to GA4 Dashboard
   - Click "Reports" > "Realtime"
   - You should see your active session
   - Perform actions and watch events appear

### 5. Configure Custom Dimensions (Optional)

For better reporting, add custom dimensions:

1. In GA4, go to Admin > Property > Custom Definitions
2. Click "Create custom dimension"
3. Add these dimensions:
   - **User Plan Type:**
     - Dimension name: `plan_type`
     - Event parameter: `plan_type`
   - **User Type:**
     - Dimension name: `user_type`
     - Event parameter: `user_type`
   - **Auth Provider:**
     - Dimension name: `auth_provider`
     - Event parameter: `auth_provider`

## Events Reference

### Try-On Events
```javascript
// Photo uploaded
trackPhotoUploaded(userId)

// Gender filter changed
trackGenderFilterChanged(gender, userId)  // gender: 'man' or 'woman'

// Category filter changed
trackCategoryFilterChanged(category, userId)  // category: 'All', 'Casual', etc.

// Outfit selected
trackOutfitSelected(outfitId, outfitName, gender, userId)

// Try-on started
trackTryOnStarted(outfitId, outfitName, userId, userType)

// Try-on completed
trackTryOnCompleted(outfitId, outfitName, userId, userType, success)

// Regenerate clicked
trackRegenerateClicked(outfitId, outfitName, userId)
```

### Monetization Events
```javascript
// Pricing modal opened
trackPricingModalOpened(source, userId)  // source: 'navigation', 'credits_depleted', etc.

// Plan selected
trackPlanSelected(planType, priceId, userId)  // planType: 'weekly', 'monthly', 'annual'

// Checkout started
trackCheckoutStarted(planType, priceId, userId)

// Purchase completed (called from Stripe webhook)
trackCheckoutCompleted(planType, priceId, amount, userId)
```

## Analytics Dashboard

### Key Reports to Monitor:

1. **Conversion Funnel:**
   - Photo Upload → Outfit Selection → Try-On → Shopping Panel → Purchase

2. **User Engagement:**
   - Try-ons per user
   - Most popular outfits
   - Gender filter preferences
   - Category preferences

3. **Monetization:**
   - Sign-up conversion rate
   - Free to paid conversion rate
   - Plan distribution (weekly vs monthly vs annual)
   - Revenue by plan type

4. **User Behavior:**
   - Session duration
   - Pages per session
   - Bounce rate
   - Return rate

## Troubleshooting

### Events Not Showing Up

1. **Check Measurement ID:**
   ```bash
   # Verify env variable is set
   echo $VITE_GA_MEASUREMENT_ID
   ```

2. **Check Console:**
   - Look for "Google Analytics initialized" message
   - Check for any error messages

3. **Ad Blockers:**
   - Disable ad blockers during testing
   - They often block GA4 tracking

4. **Real-time Delay:**
   - Events may take 1-2 minutes to appear in real-time reports
   - Standard reports update daily

### Dev Mode vs Production

- In development (`import.meta.env.DEV`), GA4 runs in debug mode
- Check console for detailed event logging
- Production tracking is silent unless errors occur

## Privacy & GDPR

GA4 is configured with:
- Automatic anonymization of IP addresses
- No cross-domain tracking
- Cookie consent handling (add if required by your region)

If you need to implement cookie consent:
1. Add consent banner (e.g., using `react-cookie-consent`)
2. Initialize GA4 only after user consent
3. Update `initGA()` to check consent before loading

## Next Steps

1. Get your GA4 Measurement ID
2. Add it to `.env` file and Vercel environment variables
3. Deploy and test
4. Set up custom reports in GA4 dashboard
5. Create conversion goals
6. Set up alerts for important metrics

For questions or issues, consult:
- [GA4 Documentation](https://support.google.com/analytics/answer/10089681)
- [react-ga4 GitHub](https://github.com/react-ga/react-ga)
