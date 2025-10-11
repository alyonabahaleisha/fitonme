import { useState, useEffect } from 'react';
import { initGemini, getOutfitRecommendations, analyzeOutfitStyle } from '../lib/gemini-client';

export const useGemini = (apiKey) => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (apiKey) {
      initGemini(apiKey);
      setIsInitialized(true);
    }
  }, [apiKey]);

  return {
    isInitialized,
    getRecommendations: getOutfitRecommendations,
    analyzeStyle: analyzeOutfitStyle
  };
};
