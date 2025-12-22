import { useState, useRef, useEffect, useMemo } from 'react';
import { Heart, Share2, ChevronDown } from 'lucide-react';
import SaveLookSheet from './SaveLookSheet';

// Varied generating copy to make AI feel alive
const generatingPhrases = [
  "Styling your next look",
  "Exploring another side of you",
  "Finding a new direction",
  "Refining the silhouette",
  "Adjusting tone and balance",
];

const MoreLooks = ({
  looks = [],
  onSelectLook,
  onSaveLook,
  onShareLook,
  onViewDetails,
  onGenerateMore,
  onEmailLook,
  onSaveToProfile,
  savedLooks = [],
  canGenerateMore = true,
  isGeneratingMore = false,
  isAuthenticated = false,
  isSendingEmail = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [showGenerating, setShowGenerating] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [savedLookForSheet, setSavedLookForSheet] = useState(null);
  const [hasShownSheet, setHasShownSheet] = useState(false);
  const containerRef = useRef(null);

  // Pick a random phrase when generation starts
  const generatingPhrase = useMemo(() => {
    return generatingPhrases[Math.floor(Math.random() * generatingPhrases.length)];
  }, [isGeneratingMore]);

  // Auto-generate next look when viewing the last one
  useEffect(() => {
    if (currentIndex === looks.length - 1 && canGenerateMore && !isGeneratingMore && looks.length < 7) {
      onGenerateMore?.();
    }
  }, [currentIndex, looks.length, canGenerateMore, isGeneratingMore, onGenerateMore]);

  // Show generating text after 200ms delay (prevent flicker on fast generations)
  useEffect(() => {
    if (isGeneratingMore) {
      const timer = setTimeout(() => setShowGenerating(true), 200);
      return () => clearTimeout(timer);
    } else {
      setShowGenerating(false);
    }
  }, [isGeneratingMore]);

  const handleSave = (look, index) => {
    const wasAlreadySaved = savedLooks.includes(look.outfitId);
    const isFirstSave = !wasAlreadySaved;

    console.log('[MoreLooks] handleSave called', { isAuthenticated, wasAlreadySaved, isFirstSave, hasShownSheet, savedLooksCount: savedLooks.length });

    onSaveLook?.(look.outfitId);
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 2000);

    // Show sheet on first save of any look (if not authenticated and not shown before)
    if (!isAuthenticated && isFirstSave && !hasShownSheet) {
      console.log('[MoreLooks] Showing save sheet in 600ms');
      setHasShownSheet(true);
      setSavedLookForSheet(look);
      // Delay to let the heart animation complete first
      setTimeout(() => {
        setShowSaveSheet(true);
      }, 600);
    }
  };

  const handleEmailSubmit = (email) => {
    if (savedLookForSheet) {
      onEmailLook?.(savedLookForSheet, email);
    }
  };

  const handleSaveToProfile = () => {
    setShowSaveSheet(false);
    onSaveToProfile?.(savedLookForSheet);
  };

  const handleCloseSheet = () => {
    setShowSaveSheet(false);
    setSavedLookForSheet(null);
  };

  const handleScroll = (e) => {
    const container = e.target;
    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < looks.length) {
      setCurrentIndex(newIndex);
    }
  };

  if (looks.length === 0) {
    return (
      <div className="h-[100dvh] flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          No looks generated yet
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Full-screen snap scroll container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto snap-y snap-mandatory"
        onScroll={handleScroll}
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {looks.map((look, index) => (
          <div
            key={look.outfitId || index}
            className="h-[100dvh] snap-start snap-always relative"
            style={{ scrollSnapAlign: 'start' }}
          >
            {/* Full-screen image - object-contain, positioned slightly higher to reduce top whitespace */}
            <img
              src={look.image}
              alt="Your look"
              className="absolute inset-x-0 top-[-5%] bottom-0 w-full h-[105%] object-contain bg-neutral-100"
              onClick={() => onViewDetails?.(look)}
            />

            {/* Gradient overlay at bottom for text readability */}
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white via-white/80 to-transparent" />

            {/* Top actions (subtle) - positioned below nav bar */}
            <div className="absolute top-20 right-4 flex gap-2 z-10">
              <button
                onClick={() => handleSave(look, index)}
                className={`p-2.5 rounded-full backdrop-blur-sm transition-all duration-300 ${
                  savedLooks.includes(look.outfitId)
                    ? 'bg-brand text-white'
                    : 'bg-black/20 text-white hover:bg-black/30'
                }`}
                aria-label={savedLooks.includes(look.outfitId) ? 'Saved' : 'Save look'}
              >
                <Heart className={`w-5 h-5 ${savedLooks.includes(look.outfitId) ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => onShareLook?.(look)}
                className="p-2.5 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/30 transition-all duration-300"
                aria-label="Share look"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Bottom content - floats over gradient */}
            <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-6 pt-2">
              {/* When generating on last look: show dedicated pause moment */}
              {index === looks.length - 1 && showGenerating && isGeneratingMore ? (
                <div className="flex flex-col items-center justify-center py-4 space-y-4">
                  {/* Calm spinner - thin stroke, slow animation, brand color */}
                  <div className="w-10 h-10 rounded-full border-2 border-brand/30 border-t-brand animate-[spin_1.5s_linear_infinite]" />
                  {/* Single line of copy - no stacking */}
                  <p className="text-sm text-muted-foreground/70 font-serif">
                    {generatingPhrase}
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  {/* Main message - varied copy to stay human */}
                  <div className="space-y-0.5">
                    <h2 className="text-lg font-serif font-semibold text-foreground">
                      {index === 0 ? 'Your first look' :
                       index === 1 ? 'Another look for you' :
                       index === 2 ? 'A different direction' :
                       'A new side of you'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {look.outfit?.description || "Styled to complement your shape"}
                    </p>
                  </div>

                  {/* Status: scroll hint (first look only) or end message */}
                  <div className="h-8 flex items-center justify-center">
                    {index === looks.length - 1 ? (
                      // Last look - end message only (generating handled above)
                      !canGenerateMore || looks.length >= 7 ? (
                        <p className="text-xs text-muted-foreground/40 font-serif italic">
                          That's your collection
                        </p>
                      ) : null
                    ) : (
                      // Not last look - show scroll hint only on first
                      index === 0 ? (
                        <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground/50">
                          <ChevronDown className="w-4 h-4 animate-bounce" />
                          <span className="font-serif italic">More looks below</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Favorite feedback toast */}
      {showSavedFeedback && (
        <div className="fixed bottom-24 inset-x-0 flex justify-center z-50 pointer-events-none">
          <div className="px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium shadow-lg animate-fade-in">
            Added to favorites
          </div>
        </div>
      )}

      {/* Save Look Sheet - shown after liking last look */}
      <SaveLookSheet
        isOpen={showSaveSheet}
        onClose={handleCloseSheet}
        onEmailSubmit={handleEmailSubmit}
        onSaveToProfile={handleSaveToProfile}
        isAuthenticated={isAuthenticated}
        isSending={isSendingEmail}
      />
    </div>
  );
};

export default MoreLooks;
