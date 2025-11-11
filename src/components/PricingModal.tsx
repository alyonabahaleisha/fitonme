import { useState } from "react";
import { X, Check } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { useAuth } from "../contexts/AuthContext";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const PricingModal = ({ isOpen, onClose }: PricingModalProps) => {
  const { user } = useAuth();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  if (!isOpen) return null;

  const tiers = [
    {
      name: "Free Preview",
      price: "$0",
      period: "",
      description: "Perfect to see the magic",
      features: [
        "2 AI try-ons",
        "Browse 10 looks",
        "Basic outfit recommendations",
        "Standard quality",
      ],
      cta: "Get Started",
      popular: false,
      variant: "outlined" as const,
      stripePriceId: null, // Free plan - no Stripe
    },
    {
      name: "Weekly Pass",
      price: "$6.99",
      period: "/week",
      description: "Ideal for events & trips",
      features: [
        "30 AI try-ons per week",
        "Full catalog access",
        "50 women's looks",
        "20 men's looks",
        "Priority support",
      ],
      cta: "Try Weekly",
      popular: false,
      variant: "outlined" as const,
      stripePriceId: "price_weekly_placeholder", // Replace with your Stripe Price ID
    },
    {
      name: "Monthly Plan",
      price: "$14.99",
      period: "/month",
      description: "Best value for regular use",
      features: [
        "Unlimited AI try-ons",
        "Full catalog access",
        "New looks added weekly",
        "HD quality renders",
        "Save favorite looks",
        "Priority support",
      ],
      cta: "Start Free Trial",
      popular: true,
      variant: "filled" as const,
      stripePriceId: "price_monthly_placeholder", // Replace with your Stripe Price ID
    },
    {
      name: "Annual Pro Closet",
      price: "$59",
      period: "/year",
      description: "For power users & influencers",
      features: [
        "Everything in Monthly",
        "Closet sync feature",
        "AI capsule wardrobe updates",
        "Early access to new features",
        "Dedicated support",
      ],
      cta: "Go Pro",
      popular: false,
      variant: "outlined" as const,
      stripePriceId: "price_annual_placeholder", // Replace with your Stripe Price ID
    },
  ];

  const handleCheckout = async (priceId: string | null) => {
    if (!priceId) {
      // Free plan - just close modal
      onClose();
      return;
    }

    if (!user) {
      alert("Please sign in to subscribe");
      return;
    }

    setLoadingPriceId(priceId);

    try {
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (stripe && data.sessionId) {
        await stripe.redirectToCheckout({ sessionId: data.sessionId });
      } else if (data.url) {
        // Fallback: redirect directly to checkout URL
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPriceId(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
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
            {tiers.map((tier, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-xl p-4 transition-all duration-300 flex flex-col ${
                  tier.popular
                    ? 'border-2 shadow-xl'
                    : 'border border-gray-200 shadow-md'
                }`}
                style={tier.popular ? { borderColor: '#ff6b5a' } : {}}
              >
                {/* Popular Badge */}
                {tier.popular && (
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
                  onClick={() => handleCheckout(tier.stripePriceId)}
                  disabled={loadingPriceId === tier.stripePriceId}
                  className={`w-full py-2.5 px-5 rounded-full text-sm font-semibold transition-all duration-300 mt-auto disabled:opacity-50 disabled:cursor-not-allowed ${
                    tier.variant === 'filled'
                      ? 'text-white shadow-md hover:shadow-lg'
                      : 'border-2 bg-white hover:bg-opacity-5'
                  }`}
                  style={
                    tier.variant === 'filled'
                      ? { backgroundColor: '#ff6b5a' }
                      : { borderColor: '#ff6b5a', color: '#ff6b5a' }
                  }
                  onMouseEnter={(e) => {
                    if (tier.variant === 'filled') {
                      e.currentTarget.style.backgroundColor = '#ff5544';
                    } else {
                      e.currentTarget.style.backgroundColor = '#ff6b5a10';
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
                  {loadingPriceId === tier.stripePriceId ? 'Loading...' : tier.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Bottom Note */}
          <div className="text-center mt-6 pb-4">
            <p className="text-gray-600 text-sm">
              All plans include secure payment processing and can be cancelled anytime.
            </p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default PricingModal;
