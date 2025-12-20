import { useState } from 'react';
import { Heart, Share2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FirstLook = ({ image, description, onSeeMore, onSave, onShare, isSaved = false }) => {
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = () => {
    onSave?.();
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Image area - takes most of the screen */}
      <div className="flex-1 relative min-h-0">
        <img
          src={image}
          alt="Your new look"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Top actions (subtle) */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            onClick={handleSave}
            className={`p-2.5 rounded-full backdrop-blur-sm transition-all duration-300 ${
              isSaved || showSaved
                ? 'bg-brand text-white'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            aria-label={isSaved ? 'Saved' : 'Save look'}
          >
            <Heart className={`w-5 h-5 ${isSaved || showSaved ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={onShare}
            className="p-2.5 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-300"
            aria-label="Share look"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Saved feedback */}
        {showSaved && (
          <div className="absolute top-16 right-4 px-3 py-1.5 rounded-full bg-brand text-white text-sm font-medium animate-fade-in">
            Saved!
          </div>
        )}
      </div>

      {/* Bottom content - fixed height */}
      <div className="relative z-10 px-4 py-4 -mt-20">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl space-y-3">
          {/* Main message */}
          <div className="text-center space-y-1">
            <h2 className="text-lg font-serif font-semibold text-foreground">
              Your first look, styled
            </h2>
            <p className="text-sm text-muted-foreground">
              {description || "Designed to flatter your shape"}
            </p>
          </div>

          {/* Primary CTA */}
          <Button
            onClick={onSeeMore}
            className="w-full py-5 text-base font-semibold rounded-xl bg-brand hover:bg-brand/90 text-white"
          >
            See my next looks
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FirstLook;
