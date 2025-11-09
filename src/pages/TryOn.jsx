import { useState, useEffect, useRef } from 'react';
import { Sparkles, User, MoreVertical, ShoppingBag, Upload } from 'lucide-react';
import Navigation from '../components/Navigation';
import OutfitCarousel from '../components/OutfitCarousel';
import ShareModal from '../components/ShareModal';
import PhotoGuidelinesModal from '../components/PhotoGuidelinesModal';
import ShoppingPanel from '../components/ShoppingPanel';
import SignUpModal from '../components/SignUpModal';
import PricingModal from '../components/PricingModal';
import useAppStore from '../store/useAppStore';
import { useOutfitOverlay } from '../hooks/useOutfitOverlay';
import { useAuth } from '../contexts/AuthContext';
import { checkUserCredits, decrementUserCredits, recordTryOn } from '../lib/supabase';

const TryOn = () => {
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
  const [showShoppingPanel, setShowShoppingPanel] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const fileInputRef = useRef(null);
  const { applyOutfit, isProcessing} = useOutfitOverlay();

  const categories = ['All', 'Casual', 'Work', 'Evening', 'Date Night'];

  const filteredOutfits = selectedCategory === 'All'
    ? outfits
    : outfits.filter(outfit => outfit.category === selectedCategory);

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
    const result = await applyOutfit(currentOutfit, forceRefresh);

    if (result) {
      setDisplayImage(result);
      setHasAppliedOutfit(true);
      console.log('Outfit applied successfully');

      // Track the try-on
      await trackTryOn(currentOutfit.id, result);
    } else {
      console.error('Failed to apply outfit:', currentOutfit.name);
      alert(`Failed to apply outfit "${currentOutfit.name}". Please try another outfit or check your connection.`);
    }
  };

  // Check if user has permission to try on (credits or subscription)
  const checkTryOnPermission = async () => {
    // Authenticated users - check credits/subscription
    if (isAuthenticated && user) {
      const hasCredits = await checkUserCredits(user.id);

      if (!hasCredits) {
        // No credits left - show pricing modal
        setShowPricing(true);
        return false;
      }

      return true;
    }

    // Guest users - check local limit
    if (hasReachedFreeLimit()) {
      setShowSignUpModal(true);
      return false;
    }

    return true;
  };

  // Track the try-on attempt
  const trackTryOn = async (outfitId, resultUrl) => {
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

      <section className="min-h-screen gradient-bg pt-20 pb-12 px-4 md:pt-24 md:pb-20">
        <div className="container mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-[auto_1fr] gap-8 lg:gap-12">
          {/* Left Sidebar - Avatar */}
          <div className="space-y-6">
            <div className="sticky top-8">
              <div className="relative rounded-3xl overflow-hidden bg-white shadow-[var(--shadow-glow)] border-2 border-accent/30 hover:border-accent/50 transition-all duration-300 group" style={{ width: 'fit-content' }}>
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-[var(--gradient-shine)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-10 animate-shimmer" />

                {/* Avatar Image */}
                <div className="bg-white relative" style={{ aspectRatio: '4/7', height: 'calc(70vh + 10px)', width: 'calc((4/7) * (70vh + 10px))' }}>
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

              {/* Shop Now Button - Shows when outfit is generated */}
              {hasAppliedOutfit && currentOutfit && (
                <button
                  onClick={() => setShowShoppingPanel(true)}
                  className="w-full bg-coral-500 hover:bg-coral-600 text-white font-semibold text-base py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#ff6b5a' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ff5544'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff6b5a'}
                >
                  <ShoppingBag className="w-5 h-5" />
                  Shop Now
                </button>
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

              {/* Category Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
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
