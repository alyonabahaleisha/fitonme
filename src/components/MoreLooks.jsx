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

  const scrollToNext = () => {
    if (currentIndex < looks.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
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

  const currentLook = looks[currentIndex];
  const isLastLook = currentIndex === looks.length - 1;
  const isSaved = savedLooks.includes(currentLook?.outfitId);

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
            className="h-[100dvh] snap-start snap-always relative flex flex-col"
            style={{ scrollSnapAlign: 'start' }}
          >
            {/* Image area - takes most of the screen */}
            <div className="flex-1 relative min-h-0">
              <img
                src={look.image}
                alt="Your look"
                className="absolute inset-0 w-full h-full object-cover"
                onClick={() => onViewDetails?.(look)}
              />

              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Top actions (subtle) */}
              <div className="absolute top-4 right-4 flex gap-2 z-10">
                <button
                  onClick={() => handleSave(look.outfitId)}
                  className={`p-2.5 rounded-full backdrop-blur-sm transition-all duration-300 ${
                    savedLooks.includes(look.outfitId)
                      ? 'bg-brand text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                  aria-label={savedLooks.includes(look.outfitId) ? 'Saved' : 'Save look'}
                >
                  <Heart className={`w-5 h-5 ${savedLooks.includes(look.outfitId) ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => onShareLook?.(look)}
                  className="p-2.5 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-300"
                  aria-label="Share look"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Bottom content - same style as FirstLook */}
            <div className="relative z-10 px-4 py-4 -mt-20">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl space-y-3">
                {/* Main message */}
                <div className="text-center space-y-1">
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
                    <p className="text-center text-sm text-muted-foreground py-2">
                      Styling your next look...
                    </p>
                  ) : canGenerateMore && looks.length < 7 ? (
                    <button
                      onClick={scrollToNext}
                      className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Scroll for next look
                    </button>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground/60 py-2">
                      You've seen all your looks
                    </p>
                  )
                ) : (
                  <button
                    onClick={scrollToNext}
                    className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Scroll for next look
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Saved feedback toast */}
      {showSavedFeedback && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium shadow-lg animate-fade-in z-50">
          Look saved
        </div>
      )}
    </div>
  );
};

export default MoreLooks;
