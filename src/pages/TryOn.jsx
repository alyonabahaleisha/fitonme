import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, ArrowLeft, Upload, User } from 'lucide-react';
import { toast } from 'sonner';

import StyleSelector from '../components/StyleSelector';
import FirstLook from '../components/FirstLook';
import MoreLooks from '../components/MoreLooks';
import OutfitDetails from '../components/OutfitDetails';
import ShareModal from '../components/ShareModal';
import PhotoGuidelinesModal from '../components/PhotoGuidelinesModal';
import SignUpModal from '../components/SignUpModal';
import PricingModal from '../components/PricingModal';
import { Button } from '../components/ui/button';

import useAppStore from '../store/useAppStore';
import { useOutfitOverlay } from '../hooks/useOutfitOverlay';
import { useAuth } from '../contexts/AuthContext';
import { checkUserCredits, decrementUserCredits, recordTryOn } from '../lib/supabase';
import { compressImage } from '../lib/image-processor';
import {
  trackPhotoUploaded,
  trackTryOnStarted,
  trackTryOnCompleted,
  trackFreeLimitReached,
  trackCreditsDepletedModalShown,
  trackPhotoGuidelinesModalOpened,
} from '../services/analytics';

// Flow steps
const STEPS = {
  UPLOAD: 'upload',
  STYLE: 'style',
  GENERATING: 'generating',
  FIRST_LOOK: 'first_look',
  MORE_LOOKS: 'more_looks',
};

const TryOn = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    userPhoto,
    setUserPhoto,
    outfits,
    currentStep,
    setCurrentStep,
    stylePreference,
    setStylePreference,
    generatedLooks,
    setGeneratedLooks,
    clearGeneratedLooks,
    favorites,
    toggleFavorite,
    guestTryOns,
    incrementGuestTryOns,
    hasReachedFreeLimit,
    showSignUpModal,
    setShowSignUpModal,
    showShareModal,
    setShowShareModal,
  } = useAppStore();

  const { user, userData, isAuthenticated } = useAuth();
  const { applyOutfit, isProcessing } = useOutfitOverlay();
  const fileInputRef = useRef(null);
  const hasInitialized = useRef(false);

  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedLookForDetails, setSelectedLookForDetails] = useState(null);
  const [shareImage, setShareImage] = useState(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);

  // Check for successful payment redirect from Stripe
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      toast.success('Payment Successful!', {
        description: 'Your subscription is now active. Enjoy unlimited try-ons!',
        duration: 5000,
      });
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Determine initial step based on state (only on mount)
  useLayoutEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (!userPhoto) {
      setCurrentStep(STEPS.UPLOAD);
    } else if (generatedLooks.length > 0) {
      // If we have generated looks from a previous session, show them
      setCurrentStep(STEPS.MORE_LOOKS);
    } else {
      // User has photo but no generated looks - go to style selection
      setCurrentStep(STEPS.STYLE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get outfits filtered by style preference
  const getFilteredOutfits = useCallback((style) => {
    const genderMap = {
      feminine: 'woman',
      masculine: 'man',
    };
    const gender = genderMap[style || stylePreference] || 'woman';
    return outfits.filter((outfit) => outfit.gender === gender);
  }, [outfits, stylePreference]);

  // Check if user has permission to try on
  const checkTryOnPermission = async () => {
    const isDevelopment = import.meta.env.DEV;
    if (isDevelopment) return true;

    if (isAuthenticated && user) {
      const hasCredits = await checkUserCredits(user.id);
      if (!hasCredits) {
        trackCreditsDepletedModalShown(user.id, userData?.plan_type || 'free');
        setShowPricing(true);
        return false;
      }
      return true;
    }

    if (hasReachedFreeLimit()) {
      trackFreeLimitReached(guestTryOns);
      setShowSignUpModal(true);
      return false;
    }

    return true;
  };

  // Track the try-on attempt
  const trackTryOnAttempt = async (outfitId, resultUrl) => {
    const isDevelopment = import.meta.env.DEV;
    if (isDevelopment) return;

    if (isAuthenticated && user) {
      try {
        await decrementUserCredits(user.id);
        await recordTryOn(user.id, outfitId, userPhoto, resultUrl);
      } catch (error) {
        console.error('Error tracking try-on:', error);
      }
    } else {
      incrementGuestTryOns();
    }
  };

  // Generate multiple looks after style selection
  const generateLooks = async (selectedStyle) => {
    // Don't check permissions for initial generation - let users see value first
    // Permission check happens when generating MORE looks or saving

    setCurrentStep(STEPS.GENERATING);
    clearGeneratedLooks();
    setGenerationProgress(0);

    const filteredOutfits = getFilteredOutfits(selectedStyle);
    // Select 5 random outfits
    const shuffled = [...filteredOutfits].sort(() => Math.random() - 0.5);
    const selectedOutfits = shuffled.slice(0, 5);

    const userType = isAuthenticated ? userData?.plan_type || 'free' : 'guest';
    const results = [];

    for (let i = 0; i < selectedOutfits.length; i++) {
      const outfit = selectedOutfits[i];
      trackTryOnStarted(outfit.id, outfit.name, user?.id, userType);

      try {
        const result = await applyOutfit(outfit);
        if (result) {
          results.push({
            outfitId: outfit.id,
            image: result,
            outfit: outfit,
          });
          trackTryOnCompleted(outfit.id, outfit.name, user?.id, userType, true);
          // Don't count against free limit for initial generation
        } else {
          trackTryOnCompleted(outfit.id, outfit.name, user?.id, userType, false);
        }
      } catch (error) {
        console.error('Error generating look:', error);
        trackTryOnCompleted(outfit.id, outfit.name, user?.id, userType, false);
      }

      setGenerationProgress(((i + 1) / selectedOutfits.length) * 100);
    }

    if (results.length > 0) {
      setGeneratedLooks(results);
      setCurrentStep(STEPS.FIRST_LOOK);
    } else {
      toast.error('Failed to generate looks. Please try again.');
      setCurrentStep(STEPS.STYLE);
    }
  };

  // Generate more looks (up to 7 total)
  const generateMoreLooks = async () => {
    if (generatedLooks.length >= 7) return;

    const canTryOn = await checkTryOnPermission();
    if (!canTryOn) return;

    setIsGeneratingMore(true);

    const filteredOutfits = getFilteredOutfits();
    const existingIds = generatedLooks.map((l) => l.outfitId);
    const availableOutfits = filteredOutfits.filter((o) => !existingIds.includes(o.id));
    const shuffled = [...availableOutfits].sort(() => Math.random() - 0.5);
    const selectedOutfits = shuffled.slice(0, 2); // Add 2 more

    const userType = isAuthenticated ? userData?.plan_type || 'free' : 'guest';
    const newResults = [];

    for (const outfit of selectedOutfits) {
      trackTryOnStarted(outfit.id, outfit.name, user?.id, userType);

      try {
        const result = await applyOutfit(outfit);
        if (result) {
          newResults.push({
            outfitId: outfit.id,
            image: result,
            outfit: outfit,
          });
          trackTryOnCompleted(outfit.id, outfit.name, user?.id, userType, true);
          await trackTryOnAttempt(outfit.id, result);
        }
      } catch (error) {
        console.error('Error generating additional look:', error);
      }
    }

    if (newResults.length > 0) {
      setGeneratedLooks([...generatedLooks, ...newResults]);
    }

    setIsGeneratingMore(false);
  };

  // Handle photo upload
  const handlePhotoUpload = () => {
    trackPhotoGuidelinesModalOpened(user?.id);
    setShowGuidelines(true);
  };

  const handleChoosePhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImage(file);
      setUserPhoto(compressedBase64);
      trackPhotoUploaded(user?.id);
      setShowGuidelines(false);
      setCurrentStep(STEPS.STYLE);
    } catch (err) {
      console.error('Failed to process image:', err);
      toast.error('Failed to process image. Please try again.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle style selection
  const handleStyleSelect = (style) => {
    setStylePreference(style);
    // Pass style directly to avoid closure issues
    generateLooks(style);
  };

  // Handle navigation
  const handleBack = () => {
    switch (currentStep) {
      case STEPS.STYLE:
        setCurrentStep(STEPS.UPLOAD);
        break;
      case STEPS.FIRST_LOOK:
      case STEPS.MORE_LOOKS:
        setCurrentStep(STEPS.STYLE);
        break;
      default:
        break;
    }
  };

  // Handle save/share
  const handleSaveLook = (outfitId) => {
    toggleFavorite(outfitId);
  };

  const handleShareLook = (look) => {
    setShareImage(look.image);
    setShowShareModal(true);
  };

  const handleViewDetails = (look) => {
    setSelectedLookForDetails(look);
    setShowDetails(true);
  };

  // Render based on current step
  const renderContent = () => {
    switch (currentStep) {
      case STEPS.UPLOAD:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
            <div className="w-full max-w-md space-y-8 text-center">
              {/* Photo preview or placeholder */}
              <div className="aspect-[3/4] max-w-xs mx-auto rounded-3xl overflow-hidden bg-secondary/50 flex items-center justify-center">
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt="Your photo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-8">
                    <User className="w-20 h-20 mx-auto mb-4 text-muted-foreground/30" strokeWidth={1} />
                    <p className="text-muted-foreground">Upload your photo to get started</p>
                  </div>
                )}
              </div>

              {/* Upload button */}
              <Button
                onClick={handlePhotoUpload}
                className="w-full max-w-xs mx-auto py-6 text-lg font-semibold rounded-2xl bg-brand hover:bg-brand/90 text-white"
              >
                <Upload className="w-5 h-5 mr-2" />
                {userPhoto ? 'Change photo' : 'Upload your photo'}
              </Button>

              {/* Trust text */}
              <p className="text-xs text-muted-foreground">
                Your photo is processed securely. Delete anytime.
              </p>
            </div>
          </div>
        );

      case STEPS.STYLE:
        return (
          <StyleSelector
            onSelect={handleStyleSelect}
            selectedStyle={stylePreference}
          />
        );

      case STEPS.GENERATING:
        return (
          <div className="min-h-screen flex flex-col items-center justify-center px-4">
            <div className="text-center space-y-6">
              <div className="relative">
                <Sparkles className="w-16 h-16 text-brand mx-auto animate-pulse" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-semibold text-foreground">
                  Creating your looks...
                </h2>
                <p className="text-muted-foreground">
                  AI magic is happening
                </p>
              </div>
              {/* Progress bar */}
              <div className="w-full max-w-xs mx-auto">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand transition-all duration-500 rounded-full"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {Math.round(generationProgress)}% complete
                </p>
              </div>
            </div>
          </div>
        );

      case STEPS.FIRST_LOOK:
        const firstLook = generatedLooks[0];
        if (!firstLook) return null;
        return (
          <FirstLook
            image={firstLook.image}
            onSeeMore={() => setCurrentStep(STEPS.MORE_LOOKS)}
            onSave={() => handleSaveLook(firstLook.outfitId)}
            onShare={() => handleShareLook(firstLook)}
            isSaved={favorites.includes(firstLook.outfitId)}
          />
        );

      case STEPS.MORE_LOOKS:
        return (
          <MoreLooks
            looks={generatedLooks}
            onSelectLook={(look) => handleViewDetails(look)}
            onSaveLook={handleSaveLook}
            onShareLook={handleShareLook}
            onViewDetails={handleViewDetails}
            onGenerateMore={generateMoreLooks}
            savedLooks={favorites}
            canGenerateMore={generatedLooks.length < 7}
            isGeneratingMore={isGeneratingMore}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main content */}
      <div className="min-h-screen bg-gradient-to-b from-[hsl(20,25%,92%)] via-[hsl(25,22%,90%)] to-[hsl(30,20%,86%)]">
        {/* Back button (shown during flow, not on upload) */}
        {currentStep !== STEPS.UPLOAD && currentStep !== STEPS.GENERATING && (
          <div className="fixed top-4 left-4 z-40">
            <button
              onClick={handleBack}
              className="p-3 rounded-full bg-white/90 shadow-lg hover:bg-white transition-all"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        )}

        {renderContent()}
      </div>

      {/* Modals */}
      <ShareModal
        imageToShare={shareImage}
        outfitName={selectedLookForDetails?.outfit?.name}
      />

      <PhotoGuidelinesModal
        isOpen={showGuidelines}
        onClose={() => setShowGuidelines(false)}
        onChoosePhoto={handleChoosePhoto}
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

      <OutfitDetails
        isOpen={showDetails}
        outfit={selectedLookForDetails?.outfit}
        image={selectedLookForDetails?.image}
        onClose={() => {
          setShowDetails(false);
          setSelectedLookForDetails(null);
        }}
      />
    </>
  );
};

export default TryOn;
