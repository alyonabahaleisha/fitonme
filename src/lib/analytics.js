import ReactGA from "react-ga4";

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export const initGA = () => {
    if (GA_MEASUREMENT_ID) {
        ReactGA.initialize(GA_MEASUREMENT_ID);
        console.log("Google Analytics initialized:", GA_MEASUREMENT_ID);
    } else {
        console.warn("Google Analytics Measurement ID is missing.");
    }
};

export const trackEvent = (category, action, label) => {
    if (!GA_MEASUREMENT_ID) return;
    ReactGA.event({
        category,
        action,
        label,
    });
};

export const trackPageView = (path) => {
    if (!GA_MEASUREMENT_ID) return;
    ReactGA.send({ hitType: "pageview", page: path });
};

// Specific Event Helpers
export const trackLogin = (method) => {
    trackEvent("Authentication", "Login", method);
};

export const trackSignUp = (method) => {
    trackEvent("Authentication", "Sign Up", method);
};

export const trackPhotoUploaded = () => {
    trackEvent("Try-On", "Photo Uploaded");
};

export const trackPricingModalOpened = (source) => {
    trackEvent("Monetization", "Pricing Modal Opened", source);
};

export const trackPlanSelected = (planType) => {
    trackEvent("Monetization", "Plan Selected", planType);
};

export const trackFeedbackSubmitted = () => {
    trackEvent("User Interaction", "Feedback Submitted");
};
