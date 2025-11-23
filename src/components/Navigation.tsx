import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, User, LogOut } from "lucide-react";
import FeedbackModal from "./FeedbackModal";
import PricingModal from "./PricingModal";
import SignUpModal from "./SignUpModal";
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "../lib/supabase";
import { trackPricingModalOpened, trackFeedbackModalOpened, trackLogout } from "../services/analytics";

const Navigation = () => {
  const navigate = useNavigate();
  const { user, userData, isAuthenticated } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      trackLogout(user?.id);
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm" : "bg-transparent"
        }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-accent flex items-center justify-center shadow-md">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="font-serif font-semibold text-2xl text-brand tracking-tight">ILovMe</span>
          {import.meta.env.DEV && (
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-400 text-yellow-900">
              DEV MODE
            </span>
          )}
          {window.location.hostname === 'fitonme.vercel.app' && (
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-400 text-blue-900">
              UAT
            </span>
          )}
        </button>

        <div className="flex items-center gap-4 md:gap-6">
          <button
            onClick={() => {
              trackPricingModalOpened('navigation', user?.id);
              setShowPricing(true);
            }}
            className="text-sm font-medium hover:opacity-80 transition-opacity px-4 py-2 rounded-full"
            style={{ color: '#ff6b5a' }}
          >
            Pricing
          </button>
          <button
            onClick={() => {
              trackFeedbackModalOpened(user?.id);
              setShowFeedback(true);
            }}
            className="text-sm font-medium hover:opacity-80 transition-opacity px-4 py-2 rounded-full"
            style={{ color: '#ff6b5a' }}
          >
            Give Feedback
          </button>

          {isAuthenticated ? (
            <div className="relative flex items-center gap-2">
              {/* Subscription Badge */}
              {userData?.plan_type && (
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${userData.plan_type === 'free'
                    ? 'bg-gray-100 text-gray-700 border border-gray-300'
                    : userData.plan_type === 'weekly'
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : userData.plan_type === 'monthly'
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-purple-100 text-purple-700 border border-purple-300'
                    }`}
                >
                  {userData.plan_type === 'free'
                    ? 'Free Preview'
                    : userData.plan_type === 'weekly'
                      ? 'Weekly'
                      : userData.plan_type === 'monthly'
                        ? 'Monthly'
                        : 'Annual'}
                </div>
              )}

              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-gray-200 hover:border-gray-300 transition-all"
              >
                <User className="w-4 h-4" style={{ color: '#ff6b5a' }} />
                <span className="text-sm font-medium text-gray-700 hidden md:inline">
                  {user?.email?.split('@')[0] || 'Account'}
                </span>
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {userData?.plan_type === 'free'
                          ? `${userData?.credits_remaining || 0} try-ons remaining`
                          : `${userData?.plan_type?.charAt(0).toUpperCase() + userData?.plan_type?.slice(1)} Plan`
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowPricing(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Manage Subscription
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Sign In button for authentication */
            <button
              onClick={() => {
                setShowSignUpModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-[#ff6b5a] text-[#ff6b5a] hover:bg-[#ff6b5a]/10 transition-colors"
            >
              <User className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </div>

      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
      <SignUpModal isOpen={showSignUpModal} onClose={() => setShowSignUpModal(false)} onShowPricing={() => setShowPricing(true)} />
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </nav>
  );
};

export default Navigation;
