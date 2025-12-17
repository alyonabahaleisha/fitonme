import { useState } from 'react';
import { Heart, Share2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FirstLook = ({ image, onSeeMore, onSave, onShare, isSaved = false }) => {
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = () => {
    onSave?.();
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-background safe-top">
      {/* Full-screen image area */}
      <div className="flex-1 relative">
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
            className={`p-3 rounded-full backdrop-blur-sm transition-all duration-300 ${
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
            className="p-3 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-300"
            aria-label="Share look"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Saved feedback */}
        {showSaved && (
          <div className="absolute top-20 right-4 px-4 py-2 rounded-full bg-brand text-white text-sm font-medium animate-fade-in">
            Saved to your looks
          </div>
        )}
      </div>

      {/* Bottom content */}
      <div className="relative z-10 px-6 py-8 -mt-24 safe-bottom">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-xl space-y-6">
          {/* Main message */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-serif font-semibold text-foreground">
              This is how you could look
            </h2>
            <p className="text-sm text-muted-foreground">
              We picked this outfit just for you
            </p>
          </div>

          {/* Primary CTA */}
          <Button
            onClick={onSeeMore}
            className="w-full py-6 text-lg font-semibold rounded-2xl bg-brand hover:bg-brand/90 text-white"
          >
            See more looks
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FirstLook;
