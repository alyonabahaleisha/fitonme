import { useState, useRef } from 'react';
import { Heart, Share2, Info, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const scrollContainerRef = useRef(null);

  const currentLook = looks[currentIndex];

  const handleSave = (lookId) => {
    onSaveLook?.(lookId);
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 2000);
  };

  const scrollTo = (index) => {
    if (index < 0 || index >= looks.length) return;
    setCurrentIndex(index);

    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.offsetWidth;
      container.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.offsetWidth;
      const newIndex = Math.round(container.scrollLeft / cardWidth);
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    }
  };

  if (looks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          No looks generated yet
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 text-center flex-shrink-0">
        <h2 className="text-lg font-serif font-semibold text-foreground">
          More options for you
        </h2>
        <p className="text-xs text-muted-foreground">
          {currentIndex + 1} of {looks.length} looks
        </p>
      </div>

      {/* Swipeable carousel */}
      <div className="flex-1 relative">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth-ios h-full"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {looks.map((look, index) => (
            <div
              key={look.outfitId || index}
              className="flex-shrink-0 w-full h-full snap-center px-4"
            >
              <div className="relative h-full rounded-3xl overflow-hidden shadow-lg">
                <img
                  src={look.image}
                  alt={`Look ${index + 1}`}
                  className="w-full h-full object-cover"
                  onClick={() => onSelectLook?.(look)}
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                {/* Actions overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <button
                    onClick={() => onViewDetails?.(look)}
                    className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium hover:bg-white/30 transition-all flex items-center gap-2"
                  >
                    <Info className="w-4 h-4" />
                    See what this look is made of
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(look.outfitId)}
                      className={`p-3 rounded-full backdrop-blur-sm transition-all duration-300 ${
                        savedLooks.includes(look.outfitId)
                          ? 'bg-brand text-white'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                      aria-label="Save look"
                    >
                      <Heart className={`w-5 h-5 ${savedLooks.includes(look.outfitId) ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={() => onShareLook?.(look)}
                      className="p-3 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all"
                      aria-label="Share look"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation arrows (desktop) */}
        <button
          onClick={() => scrollTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 shadow-lg items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => scrollTo(currentIndex + 1)}
          disabled={currentIndex === looks.length - 1}
          className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 shadow-lg items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom section */}
      <div className="flex-shrink-0 px-4 pb-4 space-y-2">
        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5">
          {looks.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-brand w-5'
                  : 'bg-border w-1.5 hover:bg-muted-foreground'
              }`}
              aria-label={`Go to look ${index + 1}`}
            />
          ))}
        </div>

        {/* Generate more button */}
        {canGenerateMore && looks.length < 7 && (
          <Button
            onClick={onGenerateMore}
            disabled={isGeneratingMore}
            variant="outline"
            className="w-full py-3 rounded-xl text-sm"
          >
            {isGeneratingMore ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                More options
              </>
            )}
          </Button>
        )}
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
