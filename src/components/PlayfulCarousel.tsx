import { useState, useEffect, useRef } from "react";

export interface Outfit {
  id: string;
  image: string;
  label: string;
}

interface PlayfulCarouselProps {
  outfits: Outfit[];
  autoPlayMs?: number;
  onSelect: (outfitId: string) => void;
}

const PlayfulCarousel = ({ outfits, autoPlayMs = 2500, onSelect }: PlayfulCarouselProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const lastInteractionRef = useRef<number>(0);
  const onSelectRef = useRef(onSelect);

  // Keep ref updated
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Auto-advance on mount
  useEffect(() => {
    onSelectRef.current(outfits[0].id);
  }, []);

  useEffect(() => {
    if (isHovered || isPaused) return;

    let timeoutId: NodeJS.Timeout;
    let currentDelay = autoPlayMs;

    const advance = () => {
      setSelectedIndex((prev) => {
        const next = (prev + 1) % outfits.length;
        onSelectRef.current(outfits[next].id);

        // Calm and happy heartbeat pattern: gentle rhythm
        // Two gentle beats, then a relaxed pause
        if ((next + 1) % 3 === 0) {
          currentDelay = autoPlayMs * 1.8; // Relaxed pause after 2 gentle beats
        } else {
          currentDelay = autoPlayMs * 1.2; // Gentle beat
        }

        return next;
      });

      timeoutId = setTimeout(advance, currentDelay);
    };

    timeoutId = setTimeout(advance, currentDelay);

    return () => clearTimeout(timeoutId);
  }, [isHovered, isPaused, autoPlayMs, outfits.length]);

  const handleCardClick = (index: number) => {
    setSelectedIndex(index);
    onSelect(outfits[index].id);
    lastInteractionRef.current = Date.now();
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 4000);
  };

  const getCardStyle = (index: number) => {
    const total = outfits.length;
    // Calculate position relative to selected card
    let offset = index - selectedIndex;
    
    // Normalize offset to be in range [-total/2, total/2]
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
    
    // Create 3D arc effect with responsive values
    const width = window.innerWidth;
    const isMobile = width < 1024;
    const isWide = width >= 1536; // xl breakpoint
    
    const translateZ = Math.abs(offset) * (isMobile ? -50 : isWide ? -85 : -70);
    const translateX = offset * (isMobile ? 150 : isWide ? 200 : 185);
    const scale = 1 - Math.abs(offset) * (isWide ? 0.09 : 0.11);
    const opacity = offset === 0 ? 1 : Math.max(0.5, 0.88 - Math.abs(offset) * 0.1);
    const rotateY = offset * (isMobile ? 18 : isWide ? 12 : 15);

    return {
      transform: `
        translateX(${translateX}px) 
        translateZ(${translateZ}px) 
        rotateY(${-rotateY}deg) 
        scale(${scale})
      `,
      opacity,
      zIndex: 100 - Math.abs(offset),
    };
  };

  return (
    <div
      className="relative w-full overflow-visible max-w-5xl mx-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="relative h-[280px] lg:h-[360px] xl:h-[380px] flex items-center justify-center pt-8 lg:pt-12"
        style={{ perspective: '1600px', perspectiveOrigin: 'center center' }}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {outfits.map((outfit, index) => {
            const isCenter = index === selectedIndex;
            
            return (
              <button
                key={outfit.id}
                onClick={() => handleCardClick(index)}
                className={`
                  absolute w-[130px] h-[180px] lg:w-[165px] lg:h-[230px] xl:w-[180px] xl:h-[250px] rounded-2xl overflow-hidden
                  transition-all duration-500 ease-out
                  hover:scale-105 cursor-pointer
                  ${isCenter ? "shadow-2xl ring-2 ring-brand" : "shadow-lg"}
                `}
                style={getCardStyle(index)}
              >
                <img
                  src={outfit.image}
                  alt={outfit.label}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 right-2">
                  <span className="inline-block px-2 py-1 rounded-lg bg-background/90 backdrop-blur-sm text-xs font-medium text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                    {outfit.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation hint */}
      <div className="flex justify-center gap-2 mt-6">
        {outfits.map((_, index) => (
          <button
            key={index}
            onClick={() => handleCardClick(index)}
            className={`transition-all duration-300 rounded-full ${
              selectedIndex === index 
                ? "bg-brand w-8 h-2" 
                : "bg-muted hover:bg-muted-foreground/30 w-2 h-2"
            }`}
            aria-label={`Go to outfit ${index + 1}`}
          />
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-4">
        Hover to pause • Click to select
      </p>
    </div>
  );
};

export default PlayfulCarousel;
