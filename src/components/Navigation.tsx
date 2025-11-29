import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Heart, User, LogOut, ShoppingBag, Menu, X, Sparkles } from "lucide-react";
import FeedbackModal from "./FeedbackModal";
import PricingModal from "./PricingModal";
import SignUpModal from "./SignUpModal";
import AccountSettings from "./AccountSettings";
import { useAuth } from "../contexts/AuthContext";
import { signOut, getClosetCount } from "../lib/supabase";
import { trackPricingModalOpened, trackFeedbackModalOpened, trackLogout } from "../services/analytics";
import useAppStore from "../store/useAppStore";

const Navigation = () => {
  const navigate = useNavigate();
  const { user, userData, isAuthenticated } = useAuth();
  const { closetCount, setClosetCount } = useAppStore();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch closet count on mount/auth change
  useEffect(() => {
    if (user) {
      getClosetCount(user.id).then(count => {
        if (count !== null) setClosetCount(count);
      });
    } else {
      setClosetCount(0);
    }
  }, [user, setClosetCount]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      trackLogout(user?.id);
      const { resetState } = useAppStore.getState();
      resetState();
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ${isScrolled || isMobileMenuOpen ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm" : "bg-transparent"
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
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-400 text-yellow-900 hidden sm:inline-block">
              DEV
            </span>
          )}
          {window.location.hostname === 'fitonme.vercel.app' && (
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-400 text-blue-900 hidden sm:inline-block">
              UAT
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 md:gap-6">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
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
          </div>

          {isAuthenticated ? (
            <div className="relative flex items-center gap-2">
              {/* Subscription Badge */}

              <button
                onClick={() => navigate('/try-on')}
                className={`flex items-center justify-center w-10 h-10 rounded-full border transition-all ${location.pathname === '/try-on'
                  ? 'bg-brand/10 border-brand'
                  : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                title="Try On"
              >
                <Sparkles className="w-5 h-5" style={{ color: '#ff6b5a' }} />
              </button>

              <button
                onClick={() => navigate('/closet')}
                className={`relative flex items-center justify-center w-10 h-10 rounded-full border transition-all ${location.pathname === '/closet'
                  ? 'bg-brand/10 border-brand'
                  : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                title="My Closet"
              >
                <ShoppingBag className="w-5 h-5" style={{ color: '#ff6b5a' }} />
                {closetCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full border-2 border-white text-[10px] font-bold text-white">
                    {closetCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 hover:border-gray-300 transition-all"
              >
                <User className="w-5 h-5" style={{ color: '#ff6b5a' }} />
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
                        setShowAccountSettings(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Account Settings
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
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-lg animate-in slide-in-from-top-5 duration-200">
          <div className="flex flex-col p-4 gap-2">
            <button
              onClick={() => {
                navigate('/try-on');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
            >
              Try On
            </button>
            <button
              onClick={() => {
                navigate('/closet');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
            >
              My Closet
            </button>
            <button
              onClick={() => {
                trackPricingModalOpened('navigation', user?.id);
                setShowPricing(true);
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
            >
              Pricing
            </button>
            <button
              onClick={() => {
                trackFeedbackModalOpened(user?.id);
                setShowFeedback(true);
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
            >
              Give Feedback
            </button>
          </div>
        </div>
      )}

      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
      <SignUpModal isOpen={showSignUpModal} onClose={() => setShowSignUpModal(false)} onShowPricing={() => setShowPricing(true)} tryOnsUsed={0} />
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
      <AccountSettings
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
      />
    </nav>
  );
};

export default Navigation;
