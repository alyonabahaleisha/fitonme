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
import { compressImage, prefetchOutfitImages } from '../lib/image-processor';
import { preparePhoto, getPreparedDataUrl } from '../services/photoPrep';
import {
  trackPhotoUploaded,
  trackTryOnStarted,
  trackTryOnCompleted,
  trackFreeLimitReached,
  trackCreditsDepletedModalShown,
  trackPhotoGuidelinesModalOpened,
} from '../services/analytics';
import {
  detectCatalogFromPhoto,
  catalogToStylePreference,
} from '../services/catalogDecisionService';
import { runBatchTryOn } from '../services/tryOnBatch';

// Flow steps
const STEPS = {
  UPLOAD: 'upload',
  DETECTING: 'detecting', // AI catalog detection
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
    isLoading: isLoadingOutfits,
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
  const [isPickingFile, setIsPickingFile] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedLookForDetails, setSelectedLookForDetails] = useState(null);
  const [shareImage, setShareImage] = useState(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [catalogDecisionResult, setCatalogDecisionResult] = useState(null);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Loading phrases with variable timing (slower in middle, faster at end)
  // Each step has 2 variants for natural feel over 17s
  const loadingSteps = [
    { text: "Analyzing your photo", duration: 2000 },
    { text: "Understanding your proportions", duration: 2000 },
    { text: "Choosing outfits that fit your vibe", duration: 3000 },
    { text: "Adjusting fit and balance", duration: 4000 },
    { text: "Refining details", duration: 3000 },
    { text: "Almost ready", duration: 2000 },
    { text: "Preparing your first look", duration: 2000 },
  ];
  const loadingPhrases = loadingSteps.map(s => s.text);

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

  // Determine initial step based on state
  // Wait for outfits to be loaded before starting detection
  useLayoutEffect(() => {
    // Don't start detection until outfits are loaded
    if (isLoadingOutfits) {
      console.log('[TryOn] Waiting for outfits to load...');
      return;
    }

    if (hasInitialized.current) return;
    hasInitialized.current = true;

    console.log('[TryOn] Initialized with', outfits.length, 'outfits');

    if (!userPhoto) {
      setCurrentStep(STEPS.UPLOAD);
    } else if (generatedLooks.length > 0) {
      // If we have generated looks from a previous session, show them
      setCurrentStep(STEPS.MORE_LOOKS);
    } else {
      // User has photo but no generated looks - START DETECTION AUTOMATICALLY
      console.log('[TryOn] Photo exists but no looks, starting detection flow');
      setCurrentStep(STEPS.DETECTING);
      startDetectionFlow(userPhoto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingOutfits]);

  // Rotate loading phrases with variable timing (slower in middle, faster at end)
  useEffect(() => {
    if (currentStep !== STEPS.DETECTING && currentStep !== STEPS.GENERATING) {
      setLoadingPhraseIndex(0);
      return;
    }

    let timeoutId;
    const scheduleNext = (index) => {
      if (index >= loadingSteps.length - 1) return; // Stay on last phrase

      const duration = loadingSteps[index].duration;
      timeoutId = setTimeout(() => {
        setLoadingPhraseIndex(index + 1);
        scheduleNext(index + 1);
      }, duration);
    };

    scheduleNext(0);
    return () => clearTimeout(timeoutId);
  }, [currentStep]);

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
  // AUTH DISABLED - always allow
  const checkTryOnPermission = async () => {
    return true; // Auth disabled for now

    /* Original auth logic - uncomment to re-enable:
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
    */
  };

  // Track the try-on attempt
  // AUTH DISABLED - skip tracking
  const trackTryOnAttempt = async (outfitId, resultUrl) => {
    return; // Auth disabled for now

    /* Original tracking logic - uncomment to re-enable:
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
    */
  };

  // Single try-on fallback (used by batch service when batch fails)
  const singleTryOnFallback = async (photoDataUrl, outfit) => {
    console.log('[TryOn] Using single try-on fallback for:', outfit.name);
    const result = await applyOutfit(outfit);
    return result;
  };

  // Generate looks using batch (parallel) with fallback to single
  const generateFirstLook = async (selectedStyle) => {
    console.log(`[TryOn] generateFirstLook called with style: ${selectedStyle}`);
    setCurrentStep(STEPS.GENERATING);
    console.log('[TryOn] Step set to GENERATING');
    clearGeneratedLooks();
    setGenerationProgress(0);

    let filteredOutfits = getFilteredOutfits(selectedStyle);

    // Fallback: if no outfits for selected style, try the other style
    if (filteredOutfits.length === 0) {
      const fallbackStyle = selectedStyle === 'masculine' ? 'feminine' : 'masculine';
      console.log(`[TryOn] No ${selectedStyle} outfits, falling back to ${fallbackStyle}`);
      filteredOutfits = getFilteredOutfits(fallbackStyle);
      setStylePreference(fallbackStyle);
    }

    if (filteredOutfits.length === 0) {
      console.log('[TryOn] No outfits found, going back to UPLOAD');
      toast.error('No outfits available. Please try again.');
      setCurrentStep(STEPS.UPLOAD);
      return;
    }

    // Select up to 4 random outfits for batch generation
    const shuffled = [...filteredOutfits].sort(() => Math.random() - 0.5);
    const batchOutfits = shuffled.slice(0, 4);

    const userType = isAuthenticated ? userData?.plan_type || 'free' : 'guest';
    trackTryOnStarted(batchOutfits[0].id, batchOutfits[0].name, user?.id, userType);

    let firstLookReceived = false;
    const looksRef = { current: [] }; // Track looks for appending

    try {
      await runBatchTryOn(
        userPhoto,
        batchOutfits,
        // onFirstLook - called when first approved look is ready
        (look) => {
          console.log('[TryOn] First look received:', look.outfit?.name);
          firstLookReceived = true;
          setGenerationProgress(100);
          looksRef.current = [look];
          setGeneratedLooks([look]);
          trackTryOnCompleted(look.outfitId, look.outfit?.name, user?.id, userType, true);
          setCurrentStep(STEPS.FIRST_LOOK);
        },
        // onNewLook - called for each subsequent approved look
        (look) => {
          console.log('[TryOn] New look received:', look.outfit?.name);
          looksRef.current = [...looksRef.current, look];
          setGeneratedLooks(looksRef.current);
          trackTryOnCompleted(look.outfitId, look.outfit?.name, user?.id, userType, true);
        },
        // onProgress - called with batch progress updates
        (progress) => {
          console.log('[TryOn] Batch progress:', progress);
          // Update progress bar based on pending count
          const total = progress.approved + progress.pending + progress.rejected + progress.failed;
          const done = total - progress.pending;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          if (!firstLookReceived) {
            setGenerationProgress(Math.min(pct, 90)); // Cap at 90 until first look
          }
        },
        // fallbackSingleTryOn - called if batch fails completely
        singleTryOnFallback
      );

      // If batch completed but no looks received (shouldn't happen due to fallback)
      if (!firstLookReceived) {
        console.log('[TryOn] Batch completed but no looks, going back to UPLOAD');
        toast.error('Failed to generate look. Please try again.');
        setCurrentStep(STEPS.UPLOAD);
      }
    } catch (error) {
      console.error('[TryOn] Error in batch try-on:', error);
      if (!firstLookReceived) {
        console.log('[TryOn] Batch error, going back to UPLOAD');
        trackTryOnCompleted(batchOutfits[0].id, batchOutfits[0].name, user?.id, userType, false);
        toast.error('Failed to generate look. Please try again.');
        setCurrentStep(STEPS.UPLOAD);
      }
    }
  };

  // Generate ONE more look (up to 7 total)
  const generateMoreLooks = async () => {
    if (generatedLooks.length >= 7) return;

    const canTryOn = await checkTryOnPermission();
    if (!canTryOn) return;

    setIsGeneratingMore(true);

    const filteredOutfits = getFilteredOutfits();
    const existingIds = generatedLooks.map((l) => l.outfitId);
    const availableOutfits = filteredOutfits.filter((o) => !existingIds.includes(o.id));
    const shuffled = [...availableOutfits].sort(() => Math.random() - 0.5);
    const nextOutfit = shuffled[0]; // Just 1 more

    if (!nextOutfit) {
      toast.error('No more outfits available.');
      setIsGeneratingMore(false);
      return;
    }

    const userType = isAuthenticated ? userData?.plan_type || 'free' : 'guest';
    trackTryOnStarted(nextOutfit.id, nextOutfit.name, user?.id, userType);

    try {
      const result = await applyOutfit(nextOutfit);
      if (result) {
        const newLook = {
          outfitId: nextOutfit.id,
          image: result,
          outfit: nextOutfit,
        };
        setGeneratedLooks([...generatedLooks, newLook]);
        trackTryOnCompleted(nextOutfit.id, nextOutfit.name, user?.id, userType, true);
        await trackTryOnAttempt(nextOutfit.id, result);
      }
    } catch (error) {
      console.error('Error generating additional look:', error);
    }

    setIsGeneratingMore(false);
  };

  // Start detection flow with existing photo (called on mount if photo exists)
  const startDetectionFlow = async (photoData) => {
    console.log('[TryOn] startDetectionFlow called');
    setCatalogDecisionResult(null);

    try {
      // Prepare photo blob from existing data URL (for try-on requests)
      // This ensures the blob cache is populated even when photo comes from storage
      const prepStart = performance.now();
      await preparePhoto(photoData);
      console.log(`[TryOn] Re-prepared photo for cache: ${Math.round(performance.now() - prepStart)}ms`);

      const decision = await detectCatalogFromPhoto(photoData);
      setCatalogDecisionResult(decision);

      console.log('[TryOn] Catalog decision:', decision);
      console.log(`[TryOn] 🎯 Detected: ${decision.catalog.toUpperCase()} (confidence: ${decision.confidence}, reason: ${decision.reason})`);

      const style = catalogToStylePreference(decision.catalog);
      setStylePreference(style);

      const filteredOutfits = getFilteredOutfits(style);
      const outfitUrls = filteredOutfits.slice(0, 5).map(o => o.imageUrl);
      prefetchOutfitImages(outfitUrls, style);

      generateFirstLook(style);
    } catch (detectionError) {
      console.warn('[TryOn] Catalog detection error, using default:', detectionError);
      console.log('[TryOn] 🎯 Detected: FEMALE (fallback due to error)');
      const style = 'feminine';
      setStylePreference(style);
      prefetchOutfitImages(getFilteredOutfits(style).slice(0, 5).map(o => o.imageUrl), style);
      generateFirstLook(style);
    }
  };

  // Handle photo upload - directly open file picker, no modal
  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleChoosePhoto = () => {
    setIsPickingFile(true);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    console.log('[TryOn] handleFileChange CALLED', e.target.files);
    const file = e.target.files[0];
    setIsPickingFile(false);
    if (!file) {
      console.log('[TryOn] No file selected, returning');
      return;
    }

    // IMMEDIATELY close modal and show generating state
    setShowGuidelines(false);
    setCurrentStep(STEPS.DETECTING);
    console.log('[TryOn] Step set to DETECTING immediately');

    try {
      // Prepare photo ONCE (resize, compress, cache as blob)
      const prepStart = performance.now();
      const { blob, meta, fromCache } = await preparePhoto(file);
      console.log(`[TryOn] Photo prepared: ${meta.width}x${meta.height}, ${Math.round(meta.bytes/1024)}KB, fromCache: ${fromCache}`);

      // Get data URL for display and detection (from prepared blob)
      const dataUrl = await getPreparedDataUrl();
      setUserPhoto(dataUrl);
      console.log(`[TryOn] Photo prep total: ${Math.round(performance.now() - prepStart)}ms`);

      // Track analytics (non-blocking)
      try {
        trackPhotoUploaded(user?.id);
      } catch (e) {
        console.warn('[TryOn] Analytics error:', e);
      }
      setCatalogDecisionResult(null);

      try {
        const decision = await detectCatalogFromPhoto(dataUrl);
        setCatalogDecisionResult(decision);

        console.log('[TryOn] Catalog decision:', decision);
        console.log(`[TryOn] 🎯 Detected: ${decision.catalog.toUpperCase()} (confidence: ${decision.confidence}, reason: ${decision.reason})`);

        // Use the catalog decision (AI or fallback) - no style selector needed
        const style = catalogToStylePreference(decision.catalog);
        setStylePreference(style);

        // Pre-fetch outfit images
        const filteredOutfits = getFilteredOutfits(style);
        const outfitUrls = filteredOutfits.slice(0, 5).map(o => o.imageUrl);
        prefetchOutfitImages(outfitUrls, style);

        // Go directly to generation
        generateFirstLook(style);
      } catch (detectionError) {
        console.warn('[TryOn] Catalog detection error, using default:', detectionError);
        console.log('[TryOn] 🎯 Detected: FEMALE (fallback due to error)');
        // Use default (feminine) on error
        const style = 'feminine';
        setStylePreference(style);
        prefetchOutfitImages(getFilteredOutfits(style).slice(0, 5).map(o => o.imageUrl), style);
        generateFirstLook(style);
      }
    } catch (err) {
      console.error('[TryOn] Failed to process image:', err);
      toast.error('Failed to process image. Please try again.');
      setCurrentStep(STEPS.UPLOAD);
      console.log('[TryOn] Step set to UPLOAD due to error');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle style selection
  const handleStyleSelect = (style) => {
    setStylePreference(style);

    // Pre-fetch outfit images in the background while generating
    const filteredOutfits = getFilteredOutfits(style);
    const outfitUrls = filteredOutfits.slice(0, 5).map(o => o.imageUrl);
    prefetchOutfitImages(outfitUrls, style); // Fire and forget, deduped

    // Generate just the first look for instant gratification
    generateFirstLook(style);
  };

  // Handle navigation
  const handleBack = () => {
    switch (currentStep) {
      case STEPS.FIRST_LOOK:
      case STEPS.MORE_LOOKS:
        // Go back to upload to start over
        setCurrentStep(STEPS.UPLOAD);
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

  // Handle email look (from SaveLookSheet)
  const handleEmailLook = async (look, email) => {
    setIsSendingEmail(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/email-look`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          imageBase64: look.image,
          outfitName: look.outfit?.name || 'Your Look',
          outfitDescription: look.outfit?.description,
        }),
      });

      if (response.ok) {
        toast.success('Look sent!', {
          description: `We've sent your look to ${email}`,
        });
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('[TryOn] Email error:', error);
      toast.error('Failed to send email. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Handle save to profile (from SaveLookSheet)
  const handleSaveToProfile = (look) => {
    if (!isAuthenticated) {
      // Show sign up modal if not authenticated
      setShowSignUpModal(true);
    } else {
      // Already authenticated, look is already saved via favorite
      toast.success('Look saved to your profile!');
    }
  };

  // Render based on current step
  const renderContent = () => {
    switch (currentStep) {
      case STEPS.UPLOAD:
        return (
          <div className="h-[100dvh] flex flex-col items-center justify-center px-4 py-6">
            <div className="w-full max-w-md space-y-6 text-center">
              {/* Photo preview or placeholder */}
              <div className="aspect-[3/4] max-w-[240px] mx-auto rounded-3xl overflow-hidden bg-secondary/50 flex items-center justify-center">
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt="Your photo"
                    className="w-full h-full object-cover object-top"
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

      case STEPS.DETECTING:
      case STEPS.GENERATING:
        return (
          <div className="h-[100dvh] flex flex-col items-center justify-center px-4">
            <div className="text-center space-y-6">
              {/* User photo preview with subtle glow */}
              {userPhoto && (
                <div className="relative w-28 h-28 mx-auto">
                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-full bg-brand/20 blur-xl animate-pulse" />
                  <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white/50 shadow-xl">
                    <img
                      src={userPhoto}
                      alt="Your photo"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <h2 className="text-2xl font-serif font-semibold text-foreground">
                  Creating your looks...
                </h2>
                {/* Rotating phrases */}
                <p className="text-muted-foreground h-6 transition-opacity duration-300">
                  {loadingPhrases[loadingPhraseIndex]}
                </p>
                {/* Step indicator - 3 dots that fill as we progress through 7 steps */}
                <div className="flex justify-center gap-1.5 pt-2">
                  {[0, 1, 2].map((step) => (
                    <div
                      key={step}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        Math.floor((loadingPhraseIndex + 1) * 3 / loadingSteps.length) > step
                          ? 'bg-brand scale-110'
                          : 'bg-brand/30'
                      }`}
                    />
                  ))}
                </div>
                {/* Time estimate */}
                <p className="text-xs text-muted-foreground/60 pt-3">
                  Usually 8–15 seconds
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
            description={firstLook.outfit?.description}
            onSeeMore={() => {
              setCurrentStep(STEPS.MORE_LOOKS);
              // Start generating next look in background
              generateMoreLooks();
            }}
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
            onEmailLook={handleEmailLook}
            onSaveToProfile={handleSaveToProfile}
            savedLooks={favorites}
            canGenerateMore={generatedLooks.length < 7}
            isGeneratingMore={isGeneratingMore}
            isAuthenticated={isAuthenticated}
            isSendingEmail={isSendingEmail}
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
      <div className="h-[100dvh] overflow-hidden bg-gradient-to-b from-[hsl(20,25%,92%)] via-[hsl(25,22%,90%)] to-[hsl(30,20%,86%)]">
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
        onClose={() => !isPickingFile && setShowGuidelines(false)}
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
