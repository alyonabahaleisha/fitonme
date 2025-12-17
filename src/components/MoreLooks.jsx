import { useState } from 'react';
import { Heart, Share2, Info, RefreshCw } from 'lucide-react';
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
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  const handleSave = (lookId) => {
    onSaveLook?.(lookId);
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 2000);
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
    <div className="h-[100dvh] flex flex-col bg-background">
      {/* Header - fixed */}
      <div className="px-4 pt-4 pb-3 text-center flex-shrink-0 border-b border-border/50">
        <h2 className="text-lg font-serif font-semibold text-foreground">
          More options for you
        </h2>
        <p className="text-xs text-muted-foreground">
          {looks.length} look{looks.length !== 1 ? 's' : ''} generated
        </p>
      </div>

      {/* Vertical scrollable list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {looks.map((look, index) => (
          <div
            key={look.outfitId || index}
            className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg"
          >
            <img
              src={look.image}
              alt={`Look ${index + 1}`}
              className="w-full h-full object-cover"
              onClick={() => onSelectLook?.(look)}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

            {/* Look number badge */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm">
              <span className="text-white text-xs font-medium">Look {index + 1}</span>
            </div>

            {/* Actions overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
              <button
                onClick={() => onViewDetails?.(look)}
                className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium hover:bg-white/30 transition-all flex items-center gap-1.5"
              >
                <Info className="w-3.5 h-3.5" />
                Details
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(look.outfitId)}
                  className={`p-2.5 rounded-full backdrop-blur-sm transition-all duration-300 ${
                    savedLooks.includes(look.outfitId)
                      ? 'bg-brand text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                  aria-label="Save look"
                >
                  <Heart className={`w-4 h-4 ${savedLooks.includes(look.outfitId) ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => onShareLook?.(look)}
                  className="p-2.5 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all"
                  aria-label="Share look"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Generate more button - inside scroll area */}
        {canGenerateMore && looks.length < 7 && (
          <Button
            onClick={onGenerateMore}
            disabled={isGeneratingMore}
            variant="outline"
            className="w-full py-4 rounded-xl text-sm"
          >
            {isGeneratingMore ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate more options
              </>
            )}
          </Button>
        )}

        {/* Bottom padding for safe area */}
        <div className="h-4" />
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
