import { useState } from 'react';
import { Heart, Share2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SaveLookSheet from './SaveLookSheet';

const FirstLook = ({
  image,
  description,
  onSeeMore,
  onSave,
  onShare,
  onEmailLook,
  onSaveToProfile,
  isSaved = false,
  isAuthenticated = false,
  isSendingEmail = false,
  look,
}) => {
  const [showSaved, setShowSaved] = useState(false);
  const [showSaveSheet, setShowSaveSheet] = useState(false);

  const handleSave = () => {
    const isFirstSave = !isSaved;
    onSave?.();
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);

    // Show sheet on first save (if not authenticated)
    if (!isAuthenticated && isFirstSave) {
      setTimeout(() => {
        setShowSaveSheet(true);
      }, 600);
    }
  };

  const handleEmailSubmit = (email) => {
    onEmailLook?.(look, email);
  };

  const handleSaveToProfile = () => {
    setShowSaveSheet(false);
    onSaveToProfile?.(look);
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
      <div className="absolute top-20 right-4 flex gap-2 z-10">
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
        <div className="absolute top-32 right-4 px-3 py-1.5 rounded-full bg-brand text-white text-sm font-medium animate-fade-in z-10">
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

      {/* Save Look Sheet - shown after liking */}
      <SaveLookSheet
        isOpen={showSaveSheet}
        onClose={() => setShowSaveSheet(false)}
        onEmailSubmit={handleEmailSubmit}
        onSaveToProfile={handleSaveToProfile}
        isAuthenticated={isAuthenticated}
        isSending={isSendingEmail}
      />
    </div>
  );
};

export default FirstLook;
