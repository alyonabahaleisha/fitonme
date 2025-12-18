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
      {/* Stronger container with border and shadow */}
      <div className="relative w-full max-w-[260px] aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 ring-1 ring-black/10">
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
            <div className="flex flex-col items-center h-full">
              {/* Vertical line */}
              <div className="w-[3px] flex-1 bg-white shadow-[0_0_12px_rgba(0,0,0,0.4)]" />
              {/* Handle button with arrows */}
              <div className="w-11 h-11 rounded-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex items-center justify-center gap-1">
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="text-gray-700">
                  <path d="M7 1L1 7L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="text-gray-700">
                  <path d="M1 1L7 7L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {/* Vertical line */}
              <div className="w-[3px] flex-1 bg-white shadow-[0_0_12px_rgba(0,0,0,0.4)]" />
            </div>
          }
          position={50}
          style={{
            width: '100%',
            height: '100%',
          }}
        />

        {/* Subtle dots indicator - shows outfit variety */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
          {afterImages.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                index === currentAfterIndex ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BeforeAfterSlider;
