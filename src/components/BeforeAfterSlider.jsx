import { useState, useEffect } from 'react';
import { ReactCompareSlider, ReactCompareSliderImage, ReactCompareSliderHandle } from 'react-compare-slider';

import modelBase from '@/assets/model-base.jpg';
import generated1 from '@/assets/generated-1.png';
import generated2 from '@/assets/generated-2.png';
import generated3 from '@/assets/generated-3.png';

// Array of after images to cycle through
const afterImages = [generated1, generated2, generated3];

const BeforeAfterSlider = () => {
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [currentAfterIndex, setCurrentAfterIndex] = useState(0);

  // Preload images
  useEffect(() => {
    const imagesToLoad = [modelBase, ...afterImages];
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

  // Cycle through after images every 2 seconds
  useEffect(() => {
    if (!imagesLoaded) return;

    const interval = setInterval(() => {
      setCurrentAfterIndex(prev => (prev + 1) % afterImages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [imagesLoaded]);

  if (!imagesLoaded) {
    return (
      <div className="w-full max-w-[260px] mx-auto aspect-[3/4] rounded-3xl bg-secondary/50 animate-pulse" />
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="relative w-full max-w-[260px] aspect-[3/4] rounded-3xl overflow-hidden shadow-xl">
        <ReactCompareSlider
          itemOne={
            <ReactCompareSliderImage
              src={modelBase}
              alt="Before"
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          }
          itemTwo={
            <ReactCompareSliderImage
              src={afterImages[currentAfterIndex]}
              alt="After"
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          }
          handle={
            <ReactCompareSliderHandle
              buttonStyle={{
                backdropFilter: 'blur(4px)',
                backgroundColor: 'white',
                border: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                width: 40,
                height: 40,
              }}
              linesStyle={{
                width: 2,
                backgroundColor: 'white',
                boxShadow: '0 0 8px rgba(0,0,0,0.3)',
              }}
            />
          }
          position={50}
          style={{
            width: '100%',
            height: '100%',
          }}
        />

        {/* Labels */}
        <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm pointer-events-none">
          <span className="text-white text-xs font-medium">Before</span>
        </div>
        <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-brand/80 backdrop-blur-sm pointer-events-none">
          <span className="text-white text-xs font-medium">After</span>
        </div>

        {/* Dots indicator */}
        <div className="absolute top-4 right-4 flex gap-1.5 pointer-events-none">
          {afterImages.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentAfterIndex ? 'bg-white scale-110' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BeforeAfterSlider;
