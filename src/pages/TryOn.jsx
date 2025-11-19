import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, User, MoreVertical, Upload } from 'lucide-react';
import { toast } from 'sonner';
import Navigation from '../components/Navigation';
import OutfitCarousel from '../components/OutfitCarousel';
import ShareModal from '../components/ShareModal';
import PhotoGuidelinesModal from '../components/PhotoGuidelinesModal';
import ShoppingPanel from '../components/ShoppingPanel';
import SignUpModal from '../components/SignUpModal';
import PricingModal from '../components/PricingModal';
import ProductRow from '../components/ProductRow';
import useAppStore from '../store/useAppStore';
import { useOutfitOverlay } from '../hooks/useOutfitOverlay';
import { useAuth } from '../contexts/AuthContext';
import { checkUserCredits, decrementUserCredits, recordTryOn } from '../lib/supabase';
import {
  trackPhotoUploaded,
  trackGenderFilterChanged,
  trackCategoryFilterChanged,
  trackOutfitSelected,
  trackTryOnStarted,
  trackTryOnCompleted,
  trackRegenerateClicked,
  trackFreeLimitReached,
  trackCreditsDepletedModalShown,
  trackPricingModalOpened,
  trackPhotoGuidelinesModalOpened,
} from '../services/analytics';

const TryOn = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    userPhoto,
    outfits,
    currentOutfit,
    setCurrentOutfit,
    setUserPhoto,
    guestTryOns,
    incrementGuestTryOns,
    hasReachedFreeLimit,
    showSignUpModal,
    setShowSignUpModal,
  } = useAppStore();
  const { user, userData, isAuthenticated } = useAuth();
  const [displayImage, setDisplayImage] = useState(null);
  const [hasAppliedOutfit, setHasAppliedOutfit] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedGender, setSelectedGender] = useState('woman'); // 'man' or 'woman'
  const [showShoppingPanel, setShowShoppingPanel] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const fileInputRef = useRef(null);
  const { applyOutfit, isProcessing} = useOutfitOverlay();

  // Check for successful payment redirect from Stripe
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      console.log('[PAYMENT] Payment successful! Session ID:', sessionId);

      // Show success message
      toast.success('Payment Successful!', {
        description: 'Your subscription is now active. Enjoy unlimited try-ons!',
        duration: 5000,
      });

      // Remove session_id from URL
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });

      // Optionally refresh user data to get updated subscription status
      // This would require a refetch of user data from your auth context
    }
  }, [searchParams, setSearchParams]);

  const categories = ['All', 'Casual', 'Work', 'Evening', 'Date Night'];

  // Filter by gender and category
  const filteredOutfits = outfits
    .filter(outfit => outfit.gender === selectedGender)
    .filter(outfit => selectedCategory === 'All' || outfit.category === selectedCategory);

  useEffect(() => {
    // Set first outfit as current if none selected
    if (!currentOutfit && outfits.length > 0) {
      setCurrentOutfit(outfits[0]);
    }
  }, [outfits]);

  useEffect(() => {
    // Reset display image when user photo is removed
    if (!userPhoto) {
      setDisplayImage(null);
      setHasAppliedOutfit(false);
    }
  }, [userPhoto]);

  const handleTryOnOutfit = async (forceRefresh = false) => {
    if (!currentOutfit || !userPhoto) return;

    // Check if user has permission to try on
    const canTryOn = await checkTryOnPermission();
    if (!canTryOn) return;

    console.log('Applying outfit:', currentOutfit.name, 'forceRefresh:', forceRefresh);

    // Track try-on started
    const userType = isAuthenticated ? userData?.plan_type || 'free' : 'guest';
    trackTryOnStarted(currentOutfit.id, currentOutfit.name, user?.id, userType);

    const result = await applyOutfit(currentOutfit, forceRefresh);

    if (result) {
      setDisplayImage(result);
      setHasAppliedOutfit(true);
      console.log('Outfit applied successfully');

      // Track try-on completed
      trackTryOnCompleted(currentOutfit.id, currentOutfit.name, user?.id, userType, true);

      // Track the try-on in database
      await trackTryOn(currentOutfit.id, result);
    } else {
      console.error('Failed to apply outfit:', currentOutfit.name);

      // Track try-on failed
      trackTryOnCompleted(currentOutfit.id, currentOutfit.name, user?.id, userType, false);

      alert(`Failed to apply outfit "${currentOutfit.name}". Please try another outfit or check your connection.`);
    }
  };

  // Check if user has permission to try on (credits or subscription)
  const checkTryOnPermission = async () => {
    // Development mode OR UAT environment: Skip all checks for easy testing
    const isDevelopment = import.meta.env.DEV;
    const isUAT = window.location.hostname === 'fitonme.vercel.app';

    if (isDevelopment || isUAT) {
      console.log(isDevelopment ? '🔧 DEV MODE: Skipping authentication and credit checks' : '🧪 UAT MODE: Skipping authentication and credit checks');
      return true;
    }

    // Authenticated users - check credits/subscription
    if (isAuthenticated && user) {
      const hasCredits = await checkUserCredits(user.id);

      if (!hasCredits) {
        // No credits left - show pricing modal
        trackCreditsDepletedModalShown(user.id, userData?.plan_type || 'free');
        setShowPricing(true);
        return false;
      }

      return true;
    }

    // Guest users - check local limit
    if (hasReachedFreeLimit()) {
      trackFreeLimitReached(guestTryOns);
      setShowSignUpModal(true);
      return false;
    }

    return true;
  };

  // Track the try-on attempt
  const trackTryOn = async (outfitId, resultUrl) => {
    // Development mode OR UAT environment: Skip tracking
    const isDevelopment = import.meta.env.DEV;
    const isUAT = window.location.hostname === 'fitonme.vercel.app';

    if (isDevelopment || isUAT) {
      console.log(isDevelopment ? '🔧 DEV MODE: Skipping try-on tracking' : '🧪 UAT MODE: Skipping try-on tracking');
      return;
    }

    if (isAuthenticated && user) {
      // Authenticated user - decrement credits and record in database
      try {
        await decrementUserCredits(user.id);
        await recordTryOn(user.id, outfitId, userPhoto, resultUrl);
      } catch (error) {
        console.error('Error tracking try-on:', error);
      }
    } else {
      // Guest user - increment local counter
      incrementGuestTryOns();
    }
  };

  const handleRegenerate = async () => {
    console.log('Regenerating current outfit...');

    // Track regenerate
    trackRegenerateClicked(currentOutfit.id, currentOutfit.name, user?.id);

    // Reset display to show processing
    setDisplayImage(null);
    setHasAppliedOutfit(false);

    // Small delay to ensure state updates
    await new Promise(resolve => setTimeout(resolve, 100));

    // Call the same function as try on with forceRefresh=true to bypass cache
    await handleTryOnOutfit(true);
  };

  const handleOutfitSelect = async (outfit) => {
    console.log('handleOutfitSelect called:', { outfitId: outfit.id, currentOutfitId: currentOutfit?.id });

    // Track outfit selection
    trackOutfitSelected(outfit.id, outfit.name, outfit.gender, user?.id);

    setCurrentOutfit(outfit);

    // Automatically apply the outfit if user photo is available
    if (userPhoto) {
      // Check if user has permission to try on
      const canTryOn = await checkTryOnPermission();
      if (!canTryOn) return;

      try {
        console.log('Applying outfit:', outfit.name);
        const result = await applyOutfit(outfit);
        if (result) {
          setDisplayImage(result);
          setHasAppliedOutfit(true);
          console.log('Outfit applied successfully');

          // Track the try-on
          await trackTryOn(outfit.id, result);
        } else {
          console.error('Failed to apply outfit:', outfit.name);
          alert(`Failed to apply outfit "${outfit.name}". Please try another outfit or check your connection.`);
        }
      } catch (error) {
        console.error('Error applying outfit:', error);
        alert(`Error applying outfit "${outfit.name}": ${error.message}`);
      }
    }
  };

  const handlePhotoUpload = () => {
    trackPhotoGuidelinesModalOpened(user?.id);
    setShowGuidelines(true);
  };

  const handleChoosePhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUserPhoto(event.target.result);
        // Track photo upload
        trackPhotoUploaded(user?.id);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <Navigation />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <section className="min-h-screen gradient-bg pt-20 pb-12 md:pt-24 md:pb-20">
        <div className="mx-auto max-w-7xl px-3 md:px-4">
        <div className="grid lg:grid-cols-[auto_1fr] gap-8 lg:gap-12">
          {/* Left Sidebar - Avatar */}
          <div className="space-y-4">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="relative rounded-3xl overflow-hidden bg-white shadow-[var(--shadow-glow)] border-2 border-accent/30 hover:border-accent/50 transition-all duration-300 group mx-auto lg:mx-0" style={{ width: 'fit-content', maxWidth: '100%' }}>
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-[var(--gradient-shine)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-10 animate-shimmer" />

                {/* Avatar Image */}
                <div className="bg-white relative" style={{ aspectRatio: '4/7', height: 'calc(55vh + 10px)', width: 'calc((4/7) * (55vh + 10px))', maxWidth: '100%' }}>
                  {hasAppliedOutfit && displayImage ? (
                    <>
                      <img
                        src={displayImage}
                        alt="Your avatar with outfit"
                        className="h-full w-full object-cover"
                      />
                      {/* Three Dots Menu - On top of the outfit image */}
                      <button
                        onClick={handlePhotoUpload}
                        className="absolute top-4 right-4 z-30 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-300 hover:scale-110"
                        aria-label="Change photo"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-700" />
                      </button>
                    </>
                  ) : userPhoto ? (
                    <>
                      <img
                        src={userPhoto}
                        alt="Your photo"
                        className="h-full w-full object-cover"
                      />
                      {/* Three Dots Menu - On top of the image */}
                      <button
                        onClick={handlePhotoUpload}
                        className="absolute top-4 right-4 z-30 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-300 hover:scale-110"
                        aria-label="Change photo"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-700" />
                      </button>
                    </>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <User className="w-24 h-24 mx-auto mb-4 opacity-30" strokeWidth={1} />
                        <p className="text-lg font-medium">No photo uploaded</p>
                        <p className="text-sm mt-2">Upload your photo below</p>
                      </div>
                    </div>
                  )}

                  {/* Processing Overlay - Shows on top of existing image */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40 animate-fade-in">
                      <div className="text-center">
                        <div className="relative mb-4">
                          <Sparkles className="w-16 h-16 text-accent mx-auto animate-pulse" />
                        </div>
                        <p className="text-white text-xl font-semibold">AI Magic is happening</p>
                        <div className="flex gap-1 justify-center mt-3">
                          <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Gradient Overlay - Only show when no photo uploaded */}
                  {!userPhoto && (
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/50 to-transparent" />
                  )}
                </div>

                {/* Upload Button Overlay - Only show when no photo uploaded */}
                {!userPhoto && (
                  <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4 z-20">
                    <div className="relative">
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-[var(--gradient-upload)] blur-2xl opacity-90 group-hover:opacity-100 transition-opacity animate-pulse" />

                      <button
                        onClick={handlePhotoUpload}
                        className="w-full relative bg-gradient-to-r from-accent via-secondary-500 to-accent text-white font-bold text-lg py-3 px-4 rounded-xl shadow-lg hover:shadow-[var(--shadow-glow)] transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <Upload className="h-5 w-5" />
                        Upload Your Photo
                      </button>
                    </div>

                    <p className="text-sm text-center text-accent font-medium animate-pulse">
                      ✨ Start your AI fashion experience
                    </p>
                  </div>
                )}
              </div>

              {/* Product Row - Shows items when outfit is generated */}
              {hasAppliedOutfit && currentOutfit && (
                <div className="mx-auto lg:mx-0" style={{ width: 'calc((4/7) * (55vh + 10px) + 40px)', maxWidth: '100%' }}>
                  <ProductRow outfit={currentOutfit} />
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Outfit Grid */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-accent" />
                <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900">
                  Try On Outfits
                </h2>
              </div>
              <p className="text-gray-600">
                Select an outfit and click "Try On" to see it on your photo
              </p>

              {/* Gender Filter Switch */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Style:</span>
                <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
                  <button
                    onClick={() => {
                      setSelectedGender('woman');
                      trackGenderFilterChanged('woman', user?.id);
                    }}
                    className={`px-4 py-1.5 rounded-md font-medium text-sm transition-all duration-200 ${
                      selectedGender === 'woman'
                        ? 'bg-coral-500 text-white shadow-sm'
                        : 'text-gray-700 hover:text-coral-600'
                    }`}
                    style={selectedGender === 'woman' ? { backgroundColor: '#ff6b5a' } : {}}
                  >
                    Women
                  </button>
                  <div className="relative inline-block">
                    <button
                      onClick={() => {
                        setSelectedGender('man');
                        trackGenderFilterChanged('man', user?.id);
                      }}
                      className={`px-4 py-1.5 rounded-md font-medium text-sm transition-all duration-200 ${
                        selectedGender === 'man'
                          ? 'bg-coral-500 text-white shadow-sm'
                          : 'text-gray-700 hover:text-coral-600'
                      }`}
                      style={selectedGender === 'man' ? { backgroundColor: '#ff6b5a' } : {}}
                    >
                      Men
                    </button>
                    <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-white bg-gradient-to-r from-green-500 via-yellow-400 to-orange-500 rounded-full shadow-lg">
                      New
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      trackCategoryFilterChanged(category, user?.id);
                    }}
                    className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 ${
                      selectedCategory === category
                        ? 'bg-coral-500 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-coral-400 hover:text-coral-600'
                    }`}
                    style={selectedCategory === category ? { backgroundColor: '#ff6b5a' } : {}}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <OutfitCarousel
              outfits={filteredOutfits}
              selectedOutfit={currentOutfit}
              onSelectOutfit={handleOutfitSelect}
              onRegenerate={handleRegenerate}
              hasAppliedOutfit={hasAppliedOutfit}
            />
          </div>
        </div>
        </div>
      </section>

      <ShareModal
        imageToShare={displayImage || userPhoto}
        outfitName={currentOutfit?.name}
      />

      <PhotoGuidelinesModal
        isOpen={showGuidelines}
        onClose={() => setShowGuidelines(false)}
        onChoosePhoto={handleChoosePhoto}
      />

      <ShoppingPanel
        isOpen={showShoppingPanel}
        onClose={() => setShowShoppingPanel(false)}
        outfit={currentOutfit}
      />

      <SignUpModal
        isOpen={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
        onShowPricing={() => setShowPricing(true)}
        tryOnsUsed={guestTryOns}
      />

      <PricingModal
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
      />
    </>
  );
};

export default TryOn;
