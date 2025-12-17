import { useState, useEffect } from 'react';

import modelBase from '@/assets/model-base.jpg';
import generated1 from '@/assets/generated-1.png';

// Before/after image pairs
const examples = [
  {
    id: 'woman',
    before: modelBase,
    after: generated1,
  },
];

const BeforeAfterSlider = () => {
  const [showAfter, setShowAfter] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const example = examples[0];

  // Preload images
  useEffect(() => {
    const imagesToLoad = [example.before, example.after];
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
  }, [example]);

  // Auto-toggle between before/after
  useEffect(() => {
    if (!imagesLoaded) return;

    const interval = setInterval(() => {
      setShowAfter(prev => !prev);
    }, 2500); // Toggle every 2.5 seconds

    return () => clearInterval(interval);
  }, [imagesLoaded]);

  if (!imagesLoaded) {
    return (
      <div className="w-full max-w-[260px] mx-auto aspect-[3/4] rounded-3xl bg-secondary/50 animate-pulse" />
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {/* Image Container */}
      <div className="relative w-full max-w-[260px] aspect-[3/4] rounded-3xl overflow-hidden shadow-xl">
        {/* Before Image */}
        <img
          src={example.before}
          alt="Before"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
            showAfter ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {/* After Image */}
        <img
          src={example.after}
          alt="After"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
            showAfter ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Label */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className={`px-4 py-1.5 rounded-full backdrop-blur-sm transition-all duration-500 ${
            showAfter
              ? 'bg-brand/80 text-white'
              : 'bg-black/50 text-white'
          }`}>
            <span className="text-sm font-medium">
              {showAfter ? 'After ✨' : 'Before'}
            </span>
          </div>
        </div>

        {/* Progress dots */}
        <div className="absolute bottom-4 right-4 flex gap-1.5">
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
            !showAfter ? 'bg-white scale-110' : 'bg-white/40'
          }`} />
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
            showAfter ? 'bg-white scale-110' : 'bg-white/40'
          }`} />
        </div>
      </div>
    </div>
  );
};

export default BeforeAfterSlider;
