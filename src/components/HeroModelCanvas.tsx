import { useState, useEffect } from "react";

interface HeroModelCanvasProps {
  modelImage: string;
  appliedOutfitImage?: string;
  alt: string;
}

const HeroModelCanvas = ({ modelImage, appliedOutfitImage, alt }: HeroModelCanvasProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImageError(true);
  };

  if (imageError) {
    return (
      <div className="relative w-full aspect-[3/4] rounded-2xl bg-card border border-border flex flex-col items-center justify-center gap-4 overflow-hidden">
        <div className="text-6xl opacity-20">👗</div>
        <p className="text-muted-foreground text-sm">Outfit preview unavailable</p>
        <button
          onClick={() => {
            setImageError(false);
            setIsLoading(true);
          }}
          className="text-brand text-sm hover:underline"
        >
          Tap to retry
        </button>
      </div>
    );
  }

  // Use the generated image if available, otherwise use the base model image
  const displayImage = appliedOutfitImage || modelImage;

  return (
    <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-white border border-border shadow-card p-[30px]">
      {isLoading && (
        <div className="absolute inset-0 bg-card animate-pulse flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <img
        key={displayImage}
        src={displayImage}
        alt={alt}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className="w-full h-full object-cover rounded-lg transition-all duration-700 ease-out"
        style={{
          animation: 'fadeIn 0.7s ease-out'
        }}
      />
    </div>
  );
};

export default HeroModelCanvas;
