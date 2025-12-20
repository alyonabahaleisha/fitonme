import { useState, useRef, useEffect } from 'react';
import { Heart, Share2, ChevronDown } from 'lucide-react';

const MoreLooks = ({
  looks = [],
  onSelectLook,
  onSaveLook,
  onShareLook,
  onViewDetails,
  onGenerateMore,
  savedLooks = [],
  canGenerateMore = true,
  isGeneratingMore = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const containerRef = useRef(null);

  // Auto-generate next look when viewing the last one
  useEffect(() => {
    if (currentIndex === looks.length - 1 && canGenerateMore && !isGeneratingMore && looks.length < 7) {
      onGenerateMore?.();
    }
  }, [currentIndex, looks.length, canGenerateMore, isGeneratingMore, onGenerateMore]);

  const handleSave = (lookId) => {
    onSaveLook?.(lookId);
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 2000);
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
            {/* Full-screen image - object-contain to show full body including shoes */}
            <img
              src={look.image}
              alt="Your look"
              className="absolute inset-0 w-full h-full object-contain bg-neutral-100"
              onClick={() => onViewDetails?.(look)}
            />

            {/* Gradient overlay at bottom for text readability */}
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white via-white/80 to-transparent" />

            {/* Top actions (subtle) */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <button
                onClick={() => handleSave(look.outfitId)}
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
              <div className="text-center space-y-3">
                {/* Main message */}
                <div className="space-y-0.5">
                  <h2 className="text-lg font-serif font-semibold text-foreground">
                    {index === 0 ? 'Your first look' : 'Another look for you'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {look.outfit?.description || "Styled to complement your shape"}
                  </p>
                </div>

                {/* Next look prompt or generating state */}
                {index === looks.length - 1 ? (
                  isGeneratingMore ? (
                    <p className="text-sm text-muted-foreground/70 py-1">
                      Styling your next look...
                    </p>
                  ) : canGenerateMore && looks.length < 7 ? (
                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground/70 py-1">
                      <ChevronDown className="w-4 h-4 animate-bounce" />
                      <span>Scroll for next look</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 py-1">
                      You've seen all your looks
                    </p>
                  )
                ) : (
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground/70 py-1">
                    <ChevronDown className="w-4 h-4" />
                    <span>Scroll for next look</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Saved feedback toast */}
      {showSavedFeedback && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium shadow-lg animate-fade-in z-50">
          Look saved
        </div>
      )}
    </div>
  );
};

export default MoreLooks;
