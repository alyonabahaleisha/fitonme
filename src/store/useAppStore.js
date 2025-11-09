import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAppStore = create(
  persist(
    (set, get) => ({
      // User photo state
      userPhoto: null,
      setUserPhoto: (photo) => set({ userPhoto: photo }),

      // Current outfit
      currentOutfit: null,
      setCurrentOutfit: (outfit) => set({ currentOutfit: outfit }),

      // Outfit catalog
      outfits: [],
      setOutfits: (outfits) => set({ outfits }),
      addOutfit: (outfit) => set((state) => ({ outfits: [...state.outfits, outfit] })),

      // Favorites
      favorites: [],
      toggleFavorite: (outfitId) => set((state) => {
        const isFavorite = state.favorites.includes(outfitId);
        return {
          favorites: isFavorite
            ? state.favorites.filter(id => id !== outfitId)
            : [...state.favorites, outfitId]
        };
      }),

      // Loading states
      isLoading: false,
      setLoading: (loading) => set({ isLoading: loading }),

      // Processed image cache (in-memory only, not persisted)
      processedImages: {},
      cacheProcessedImage: (outfitId, imageData) => {
        // Store in memory but don't persist to localStorage
        const state = get();
        state.processedImages[outfitId] = imageData;
      },

      getProcessedImage: (outfitId) => get().processedImages[outfitId],

      // UI state
      showShareModal: false,
      setShowShareModal: (show) => set({ showShareModal: show }),

      // Guest user try-on tracking (for free/unauthenticated users)
      guestTryOns: 0,
      incrementGuestTryOns: () => set((state) => ({
        guestTryOns: state.guestTryOns + 1
      })),
      resetGuestTryOns: () => set({ guestTryOns: 0 }),
      hasReachedFreeLimit: () => {
        const state = get();
        const FREE_LIMIT = 2;
        return state.guestTryOns >= FREE_LIMIT;
      },

      // Sign-up modal state
      showSignUpModal: false,
      setShowSignUpModal: (show) => set({ showSignUpModal: show }),
    }),
    {
      name: 'godlovesme-storage',
      partialize: (state) => ({
        // Persist favorites, userPhoto, and guestTryOns
        favorites: state.favorites,
        userPhoto: state.userPhoto,
        guestTryOns: state.guestTryOns,
      }),
    }
  )
);

export default useAppStore;
