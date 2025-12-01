import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { trackPlanSelected, trackCheckoutStarted } from "../services/analytics";
import SignUpModal from "./SignUpModal";
import { getStripe } from "../lib/stripe";

import { useScrollLock } from "../hooks/useScrollLock";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PricingModal = ({ isOpen, onClose }: PricingModalProps) => {
  useScrollLock(isOpen);
  const { user, userData } = useAuth();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<{ priceId: string; planName: string } | null>(null);

  // Map user's plan_type to tier name
  const getCurrentPlanName = () => {
    if (!userData?.plan_type) return 'Free Preview';
    switch (userData.plan_type) {
      case 'free': return 'Free Preview';
      case 'weekly': return 'Weekly Pass';
      case 'monthly': return 'Monthly Plan';
      case 'annual': return 'Annual Pro Closet';
      default: return 'Free Preview';
    }
  };

  const currentPlanName = getCurrentPlanName();

  // When user signs in and we have a pending checkout, proceed automatically
  useEffect(() => {
    if (user && pendingCheckout && !showSignUp) {
      // User just authenticated, proceed with checkout
      handleCheckout(pendingCheckout.priceId, pendingCheckout.planName);
      setPendingCheckout(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pendingCheckout, showSignUp]);

  if (!isOpen) return null;

  const tiers = [
    {
      name: "1-Day Pass",
      price: "$4.99",
      period: "",
      description: "Try outfits instantly. No subscription.",
      features: [
        "Unlimited AI try-ons for 24 hours",
        "Access to the full outfit catalog",
        "No commitment — pay only when you need it",
      ],
      cta: "Get 1-Day Pass",
      popular: false,
      variant: "outlined" as const,
      stripePriceId: "price_1SZHIxB6P0idJ9t78DYrfpdm",
      mode: 'payment', // One-time payment
    },
    {
      name: "7-Day Pass",
      price: "$6.99",
      period: "",
      description: "A full week of unlimited outfit try-ons.",
      features: [
        "Unlimited AI try-ons for 7 days",
        "Full access to all collections",
        "New outfits available instantly",
      ],
      cta: "Get 7-Day Pass",
      popular: false,
      variant: "outlined" as const,
      stripePriceId: "price_1SZOhVB6P0idJ9t7YAUC8B3g",
      mode: 'payment', // One-time payment
    },
    {
      name: "Monthly",
      price: "$19.99",
      period: "/month",
      description: "Unlimited AI try-ons + fresh styles added every month.",
      features: [
        "Unlimited try-ons all month",
        "50+ new outfits added monthly",
        "Access to all categories & trends"
      ],
      cta: "Get Monthly",
      popular: true,
      variant: "filled" as const,
      stripePriceId: "price_1SZOiaB6P0idJ9t7BElcuhU1",
      mode: 'subscription',
    },
    {
      name: "Annual",
      price: "$199",
      period: "/year",
      description: "Save big, unlock everything, and get the fastest access.",
      features: [
        "Unlimited try-ons all year",
        "50+ new outfits added monthly(600+ per year)",
        "Save 17% compared to monthly",
      ],
      cta: "Get Annual",
      popular: false,
      variant: "outlined" as const,
      stripePriceId: "price_1SZOjiB6P0idJ9t7xjYKuwHl",
      mode: 'subscription',
    },
  ];

  const handleCheckout = async (priceId: string | null, planName: string, mode: string = 'subscription') => {
    if (!priceId) return;

    if (!user) {
      // Store the pending checkout and show sign-up modal
      setPendingCheckout({ priceId, planName });
      setShowSignUp(true);
      return;
    }

    // Track plan selection
    const planType = planName.toLowerCase().includes('day') ? 'day_pass' :
      planName.toLowerCase().includes('weekly') || planName.includes('7-Day') ? 'weekly' :
        planName.toLowerCase().includes('monthly') ? 'monthly' :
          planName.toLowerCase().includes('annual') ? 'annual' : 'unknown';

    trackPlanSelected(planType, priceId, user.id);

    setLoadingPriceId(priceId);

    try {
      trackCheckoutStarted(planType, priceId, user.id);
      console.log('[CHECKOUT] Starting checkout for priceId:', priceId, 'Mode:', mode);

      // Create checkout session
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          userEmail: user.email,
          mode, // Pass the mode (payment or subscription)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Invalid checkout response - missing URL');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPriceId(null);
    }
  };

  return (
    createPortal(
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="min-h-full flex items-start md:items-center justify-center p-0 md:p-4">
            <div
              className="bg-[#e8e0d5] w-full md:rounded-2xl md:max-w-5xl p-4 md:p-6 relative min-h-screen md:min-h-0 md:my-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 bg-white rounded-full p-2 shadow-md"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="text-center mb-6 pt-2">
                <h2 className="text-xl md:text-3xl font-serif font-semibold text-gray-900 mb-2">
                  Choose Your Plan
                </h2>
                <p className="text-gray-600 text-sm md:text-base">
                  Find the perfect fit for your style journey
                </p>
              </div>

              {/* Pricing Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {tiers.map((tier, index) => {
                  const isCurrentPlan = tier.name === currentPlanName;
                  const isUpgrade = !isCurrentPlan && tier.name !== 'Free Preview' && (
                    (currentPlanName === 'Free Preview') ||
                    (currentPlanName === 'Weekly Pass' && (tier.name === 'Monthly Plan' || tier.name === 'Annual Pro Closet')) ||
                    (currentPlanName === 'Monthly Plan' && tier.name === 'Annual Pro Closet')
                  );
                  const shouldDisable = isCurrentPlan || !isUpgrade && tier.name !== 'Free Preview';

                  return (
                    <div
                      key={index}
                      className={`relative bg-white rounded-xl p-4 transition-all duration-300 flex flex-col ${isCurrentPlan || tier.popular
                        ? 'border-2 shadow-xl'
                        : 'border border-gray-200 shadow-md'
                        }`}
                      style={isCurrentPlan || tier.popular ? { borderColor: '#ff6b5a' } : {}}
                    >
                      {/* Current Plan or Popular Badge */}
                      {isCurrentPlan ? (
                        <div
                          className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1.5 rounded-full text-white text-xs font-semibold whitespace-nowrap"
                          style={{ backgroundColor: '#4CAF50' }}
                        >
                          Current Plan
                        </div>
                      ) : tier.popular && (
                        <div
                          className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1.5 rounded-full text-white text-xs font-semibold whitespace-nowrap"
                          style={{ backgroundColor: '#ff6b5a' }}
                        >
                          Most Popular
                        </div>
                      )}

                      {/* Tier Name */}
                      <h3 className="text-xl font-serif font-semibold text-gray-900 mb-1 mt-1">
                        {tier.name}
                      </h3>

                      {/* Description */}
                      <p className="text-gray-500 text-sm mb-4">{tier.description}</p>

                      {/* Price */}
                      <div className="mb-4">
                        <span className="text-4xl font-semibold text-gray-900">{tier.price}</span>
                        {tier.period && (
                          <span className="text-gray-500 text-base ml-1">{tier.period}</span>
                        )}
                      </div>

                      {/* Features */}
                      <ul className="space-y-2.5 mb-6 flex-grow">
                        {tier.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <Check
                              className="w-5 h-5 flex-shrink-0 mt-0.5"
                              style={{ color: '#ff6b5a' }}
                            />
                            <span className="text-gray-600 text-sm leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA Button */}
                      <button
                        onClick={() => handleCheckout(tier.stripePriceId, tier.name, tier.mode)}
                        disabled={shouldDisable || loadingPriceId === tier.stripePriceId}
                        className={`w-full py-2.5 px-5 rounded-full text-sm font-semibold transition-all duration-300 mt-auto disabled:opacity-50 disabled:cursor-not-allowed ${tier.variant === 'filled'
                          ? 'text-white shadow-md hover:shadow-lg'
                          : 'border-2 bg-white hover:bg-opacity-5'
                          }`}
                        style={
                          tier.variant === 'filled'
                            ? { backgroundColor: '#ff6b5a' }
                            : { borderColor: '#ff6b5a', color: '#ff6b5a' }
                        }
                        onMouseEnter={(e) => {
                          if (!isCurrentPlan && isUpgrade) {
                            if (tier.variant === 'filled') {
                              e.currentTarget.style.backgroundColor = '#ff5544';
                            } else {
                              e.currentTarget.style.backgroundColor = '#ff6b5a10';
                            }
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (tier.variant === 'filled') {
                            e.currentTarget.style.backgroundColor = '#ff6b5a';
                          } else {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {loadingPriceId === tier.stripePriceId
                          ? 'Loading...'
                          : isCurrentPlan
                            ? 'Current Plan'
                            : isUpgrade
                              ? `Upgrade to ${tier.name.split(' ')[0]}`
                              : tier.cta}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Note */}
              <div className="text-center mt-6 pb-4">
                <p className="text-gray-600 text-sm mb-2">
                  All plans include secure payment processing and can be cancelled anytime.
                </p>
                <p className="text-xs text-gray-500">
                  <strong>Subscription Terms:</strong> Plans auto-renew at the end of each period.
                  <br />
                  <strong>Refund Policy:</strong> If you're not satisfied, contact us within 7 days of your first purchase for a full refund.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Up Modal - shown when user tries to checkout without authentication */}
        <SignUpModal
          isOpen={showSignUp}
          onClose={() => {
            setShowSignUp(false);
            setPendingCheckout(null);
          }}
          onShowPricing={() => {
            // User can view pricing again after closing sign-up
            setShowSignUp(false);
          }}
        />
      </>,
      document.body
    )
  );
};

export default PricingModal;
