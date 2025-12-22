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
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden relative">
      {/* Full-screen image - object-contain, positioned slightly higher to reduce top whitespace */}
      <img
        src={image}
        alt="Your new look"
        className="absolute inset-x-0 top-[-5%] bottom-0 w-full h-[105%] object-contain bg-neutral-100"
      />

      {/* Gradient overlay at bottom for text readability - transparent to white */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white via-white/80 to-transparent" />

      {/* Top actions (subtle) - positioned below nav bar */}
      <div className="absolute top-[104px] right-4 flex gap-2 z-10">
        <button
          onClick={handleSave}
          className={`p-2.5 rounded-full backdrop-blur-sm transition-all duration-300 ${
            isSaved || showSaved
              ? 'bg-brand text-white'
              : 'bg-black/20 text-white hover:bg-black/30'
          }`}
          aria-label={isSaved ? 'Saved' : 'Save look'}
        >
          <Heart className={`w-5 h-5 ${isSaved || showSaved ? 'fill-current' : ''}`} />
        </button>
        <button
          onClick={onShare}
          className="p-2.5 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/30 transition-all duration-300"
          aria-label="Share look"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Saved feedback */}
      {showSaved && (
        <div className="absolute top-[152px] right-4 px-3 py-1.5 rounded-full bg-brand text-white text-sm font-medium animate-fade-in z-10">
          Saved!
        </div>
      )}

      {/* Bottom content - floats over gradient, doesn't cover image */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-6 pt-2">
        <div className="text-center space-y-3">
          {/* Main message */}
          <div className="space-y-0.5">
            <h2 className="text-lg font-serif font-semibold text-foreground">
              Your first look, styled
            </h2>
            <p className="text-sm text-muted-foreground">
              {description || "Designed to flatter your shape"}
            </p>
          </div>

          {/* Primary CTA - compact */}
          <Button
            onClick={onSeeMore}
            className="w-full py-4 text-base font-semibold rounded-xl bg-brand hover:bg-brand/90 text-white"
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
