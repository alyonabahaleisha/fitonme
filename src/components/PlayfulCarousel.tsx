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
  externalIsHovered?: boolean;
  onHoverChange?: (isHovered: boolean) => void;
  imagesLoaded?: boolean;
}

const PlayfulCarousel = ({ outfits, autoPlayMs = 2500, onSelect, externalIsHovered, onHoverChange, imagesLoaded = true }: PlayfulCarouselProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [internalIsHovered, setInternalIsHovered] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Use external hover state if provided, otherwise use internal
  const isHovered = externalIsHovered !== undefined ? externalIsHovered : internalIsHovered;

  const lastInteractionRef = useRef<number>(0);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const advanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onSelectRef = useRef(onSelect);
  const isHoveredRef = useRef(isHovered);
  const isPausedRef = useRef(isPaused);

  // Keep refs updated
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Auto-advance on mount
  useEffect(() => {
    onSelectRef.current(outfits[0].id);
  }, []);

  // Cleanup pause timeout on unmount
  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Clear any existing timeout when this effect runs
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }

    // Don't start new timeout if hovered, paused, or images not loaded
    if (isHovered || isPaused || !imagesLoaded) {
      return;
    }

    let currentDelay = autoPlayMs;

    const advance = () => {
      // Check if hovered/paused at the START to prevent race conditions
      if (isHoveredRef.current || isPausedRef.current) {
        return;
      }

      let nextIndex: number;

      setSelectedIndex((prev) => {
        nextIndex = (prev + 1) % outfits.length;

        // Calm and happy heartbeat pattern: gentle rhythm
        // Two gentle beats, then a relaxed pause
        if ((nextIndex + 1) % 3 === 0) {
          currentDelay = autoPlayMs * 1.8; // Relaxed pause after 2 gentle beats
        } else {
          currentDelay = autoPlayMs * 1.2; // Gentle beat
        }

        return nextIndex;
      });

      // Update model image
      onSelectRef.current(outfits[nextIndex!].id);

      // Schedule next advance ONLY if not hovered or paused
      if (!isHoveredRef.current && !isPausedRef.current) {
        advanceTimeoutRef.current = setTimeout(advance, currentDelay);
      }
    };

    // Start the first timeout
    advanceTimeoutRef.current = setTimeout(advance, currentDelay);

    // Cleanup: clear timeout when effect re-runs or component unmounts
    return () => {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
    };
  }, [isHovered, isPaused, autoPlayMs, outfits.length, imagesLoaded]);

  const handleCardClick = (index: number) => {
    setSelectedIndex(index);
    onSelect(outfits[index].id);
    lastInteractionRef.current = Date.now();

    // Clear any existing pause timeout
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }

    // Update ref IMMEDIATELY before state update
    isPausedRef.current = true;
    setIsPaused(true);

    // Set a timeout to unpause after 4 seconds (only if user stays hovered)
    pauseTimeoutRef.current = setTimeout(() => {
      isPausedRef.current = false;
      setIsPaused(false);
    }, 4000);
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

  const handleMouseEnter = () => {
    // Clear the advance timeout IMMEDIATELY
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }

    // Notify parent or update internal state
    if (onHoverChange) {
      onHoverChange(true);
    } else {
      setInternalIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    // Clear the pause timeout when mouse leaves, allowing carousel to resume immediately
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    isPausedRef.current = false;
    setIsPaused(false);

    // Notify parent or update internal state
    if (onHoverChange) {
      onHoverChange(false);
    } else {
      setInternalIsHovered(false);
    }
  };

  return (
    <div
      className="relative w-full overflow-visible max-w-5xl mx-auto"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
