import { useState, useEffect, useRef } from 'react';

import modelBase from '@/assets/model-base.jpg';
import generated1 from '@/assets/generated-1.png';
// TODO: Import man assets when available
// import modelManBase from '@/assets/model-man-base.jpg';
// import generatedMan1 from '@/assets/generated-man-1.png';

// Before/after image pairs - add man examples when assets are available
const examples = [
  {
    id: 'woman',
    label: 'Her look',
    before: modelBase,
    after: generated1,
  },
  // TODO: Add man example when assets are available
  // {
  //   id: 'man',
  //   label: 'His look',
  //   before: modelManBase,
  //   after: generatedMan1,
  // },
];

const BeforeAfterSlider = () => {
  const [currentExample, setCurrentExample] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isAnimating, setIsAnimating] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const animationRef = useRef(null);
  const containerRef = useRef(null);

  const example = examples[currentExample];

  // Preload images
  useEffect(() => {
    const imagesToLoad = examples.flatMap(ex => [ex.before, ex.after]);
    let loadedCount = 0;

    imagesToLoad.forEach(src => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === imagesToLoad.length) {
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === imagesToLoad.length) {
          setImagesLoaded(true);
        }
      };
      img.src = src;
    });
  }, []);

  // Auto-animate slider position
  useEffect(() => {
    if (!isAnimating || !imagesLoaded) return;

    let direction = 1;
    let position = 20;
    const speed = 0.3; // Smooth, slow movement

    const animate = () => {
      position += direction * speed;

      // Reverse direction at bounds
      if (position >= 80) {
        direction = -1;
      } else if (position <= 20) {
        direction = 1;
      }

      setSliderPosition(position);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, imagesLoaded]);

  // Cycle through examples (if more than one)
  useEffect(() => {
    if (examples.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentExample(prev => (prev + 1) % examples.length);
    }, 6000); // Switch every 6 seconds

    return () => clearInterval(interval);
  }, []);

  // Handle touch/mouse interaction
  const handleInteraction = (e) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const percentage = (x / rect.width) * 100;

    setSliderPosition(Math.max(5, Math.min(95, percentage)));
  };

  const handleInteractionStart = () => {
    setIsAnimating(false);
  };

  const handleInteractionEnd = () => {
    // Resume animation after a delay
    setTimeout(() => setIsAnimating(true), 2000);
  };

  if (!imagesLoaded) {
    return (
      <div className="w-full max-w-sm mx-auto aspect-[3/4] rounded-3xl bg-secondary/50 animate-pulse" />
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Slider Container */}
      <div
        ref={containerRef}
        className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-lg cursor-ew-resize select-none touch-none"
        onMouseDown={handleInteractionStart}
        onMouseUp={handleInteractionEnd}
        onMouseLeave={handleInteractionEnd}
        onMouseMove={(e) => !isAnimating && e.buttons === 1 && handleInteraction(e)}
        onTouchStart={handleInteractionStart}
        onTouchEnd={handleInteractionEnd}
        onTouchMove={(e) => !isAnimating && handleInteraction(e)}
      >
        {/* After Image (Full) */}
        <img
          src={example.after}
          alt="After transformation"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Before Image (Clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={example.before}
            alt="Before transformation"
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>

        {/* Slider Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          {/* Slider Handle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
              <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
          <span className="text-white text-xs font-medium">Before</span>
        </div>
        <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
          <span className="text-white text-xs font-medium">After</span>
        </div>
      </div>

      {/* Example indicators (if multiple) */}
      {examples.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {examples.map((ex, index) => (
            <button
              key={ex.id}
              onClick={() => setCurrentExample(index)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                index === currentExample
                  ? 'bg-brand text-white'
                  : 'bg-secondary text-foreground/60 hover:bg-secondary/80'
              }`}
            >
              {ex.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BeforeAfterSlider;
