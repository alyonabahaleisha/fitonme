import ReactGA from 'react-ga4';

// Initialize Google Analytics
export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!measurementId) {
    console.warn('Google Analytics Measurement ID not found');
    return;
  }

  ReactGA.initialize(measurementId, {
    gaOptions: {
      debug_mode: import.meta.env.DEV,
    },
  });

  console.log('Google Analytics initialized:', measurementId);
};

// Track page views
export const trackPageView = (path) => {
  ReactGA.send({ hitType: 'pageview', page: path });
};

// ============================================
// AUTHENTICATION EVENTS
// ============================================

export const trackSignUpStarted = (method) => {
  ReactGA.event({
    category: 'Authentication',
    action: 'sign_up_started',
    label: method, // 'google' or 'magic_link'
  });
};

export const trackSignUpCompleted = (method, userId) => {
  ReactGA.event({
    category: 'Authentication',
    action: 'sign_up_completed',
    label: method,
    userId: userId,
  });
};

export const trackLoginCompleted = (method, userId) => {
  ReactGA.event({
    category: 'Authentication',
    action: 'login_completed',
    label: method,
    userId: userId,
  });
};

export const trackLogout = (userId) => {
  ReactGA.event({
    category: 'Authentication',
    action: 'logout',
    userId: userId,
  });
};

// ============================================
// TRY-ON FLOW EVENTS
// ============================================

export const trackPhotoUploaded = (userId) => {
  ReactGA.event({
    category: 'Try-On',
    action: 'photo_uploaded',
    userId: userId || 'guest',
  });
};

export const trackGenderFilterChanged = (gender, userId) => {
  ReactGA.event({
    category: 'Try-On',
    action: 'gender_filter_changed',
    label: gender, // 'man' or 'woman'
    userId: userId || 'guest',
  });
};

export const trackCategoryFilterChanged = (category, userId) => {
  ReactGA.event({
    category: 'Try-On',
    action: 'category_filter_changed',
    label: category, // 'All', 'Casual', 'Work', etc.
    userId: userId || 'guest',
  });
};

export const trackOutfitSelected = (outfitId, outfitName, gender, userId) => {
  ReactGA.event({
    category: 'Try-On',
    action: 'outfit_selected',
    label: `${outfitName} (${outfitId})`,
    value: gender === 'man' ? 1 : 0, // 1 for men, 0 for women
    userId: userId || 'guest',
  });
};

export const trackTryOnStarted = (outfitId, outfitName, userId, userType) => {
  ReactGA.event({
    category: 'Try-On',
    action: 'try_on_started',
    label: `${outfitName} (${outfitId})`,
    userId: userId || 'guest',
    user_type: userType, // 'guest', 'free', 'weekly', 'monthly', 'annual'
  });
};

export const trackTryOnCompleted = (outfitId, outfitName, userId, userType, success = true) => {
  ReactGA.event({
    category: 'Try-On',
    action: success ? 'try_on_completed' : 'try_on_failed',
    label: `${outfitName} (${outfitId})`,
    userId: userId || 'guest',
    user_type: userType,
  });
};

export const trackRegenerateClicked = (outfitId, outfitName, userId) => {
  ReactGA.event({
    category: 'Try-On',
    action: 'regenerate_clicked',
    label: `${outfitName} (${outfitId})`,
    userId: userId || 'guest',
  });
};

export const trackFreeLimitReached = (tryOnsUsed) => {
  ReactGA.event({
    category: 'Try-On',
    action: 'free_limit_reached',
    label: 'Guest user limit',
    value: tryOnsUsed,
  });
};

export const trackCreditsDepletedModalShown = (userId, planType) => {
  ReactGA.event({
    category: 'Try-On',
    action: 'credits_depleted_modal_shown',
    label: planType,
    userId: userId,
  });
};

// ============================================
// SHOPPING FLOW EVENTS
// ============================================

export const trackShoppingPanelOpened = (outfitId, outfitName, userId) => {
  ReactGA.event({
    category: 'Shopping',
    action: 'shopping_panel_opened',
    label: `${outfitName} (${outfitId})`,
    userId: userId || 'guest',
  });
};

export const trackProductClicked = (productName, productLink, outfitId, userId) => {
  ReactGA.event({
    category: 'Shopping',
    action: 'product_clicked',
    label: `${productName} - ${outfitId}`,
    value: productLink,
    userId: userId || 'guest',
  });
};

// ============================================
// MONETIZATION FLOW EVENTS
// ============================================

export const trackPricingModalOpened = (source, userId) => {
  // source: 'navigation', 'credits_depleted', 'free_limit', etc.
  ReactGA.event({
    category: 'Monetization',
    action: 'pricing_modal_opened',
    label: source,
    userId: userId || 'guest',
  });
};

export const trackPlanSelected = (planType, priceId, userId) => {
  // planType: 'weekly', 'monthly', 'annual'
  ReactGA.event({
    category: 'Monetization',
    action: 'plan_selected',
    label: planType,
    value: priceId,
    userId: userId || 'guest',
  });
};

export const trackCheckoutStarted = (planType, priceId, userId) => {
  ReactGA.event({
    category: 'Monetization',
    action: 'checkout_started',
    label: planType,
    value: priceId,
    userId: userId,
  });
};

export const trackCheckoutCompleted = (planType, priceId, amount, userId) => {
  // This should be called from Stripe webhook
  ReactGA.event({
    category: 'Monetization',
    action: 'purchase',
    label: planType,
    value: amount,
    userId: userId,
    transaction_id: priceId,
  });
};

// ============================================
// USER PROPERTIES
// ============================================

export const setUserProperties = (userId, properties) => {
  // properties: { plan_type, credits_remaining, total_try_ons, auth_provider }
  ReactGA.set({
    userId: userId,
    ...properties,
  });
};

export const identifyUser = (userId, email, planType, authProvider) => {
  ReactGA.set({
    userId: userId,
    user_email: email,
    plan_type: planType,
    auth_provider: authProvider,
  });
};

// ============================================
// UI INTERACTION EVENTS
// ============================================

export const trackFeedbackModalOpened = (userId) => {
  ReactGA.event({
    category: 'UI',
    action: 'feedback_modal_opened',
    userId: userId || 'guest',
  });
};

export const trackPhotoGuidelinesModalOpened = (userId) => {
  ReactGA.event({
    category: 'UI',
    action: 'photo_guidelines_opened',
    userId: userId || 'guest',
  });
};

// ============================================
// ERROR TRACKING
// ============================================

export const trackError = (errorType, errorMessage, userId) => {
  ReactGA.event({
    category: 'Error',
    action: errorType,
    label: errorMessage,
    userId: userId || 'guest',
  });
};
