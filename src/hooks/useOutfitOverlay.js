import { useState, useCallback } from 'react';
import { overlayOutfitOnPhoto } from '../lib/image-processor';
import useAppStore from '../store/useAppStore';

export const useOutfitOverlay = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { userPhoto, getProcessedImage, cacheProcessedImage } = useAppStore();

  const applyOutfit = useCallback(async (outfit) => {
    if (!userPhoto || !outfit) return null;

    // Check cache first
    const cached = getProcessedImage(outfit.id);
    if (cached) return cached;

    setIsProcessing(true);
    try {
      const result = await overlayOutfitOnPhoto(userPhoto, outfit.imageUrl);
      cacheProcessedImage(outfit.id, result);
      return result;
    } catch (error) {
      console.error('Error applying outfit:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [userPhoto, getProcessedImage, cacheProcessedImage]);

  return { applyOutfit, isProcessing };
};
