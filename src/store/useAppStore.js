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
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[STORAGE] Error rehydrating state:', error);
        } else {
          console.log('[STORAGE] State rehydrated successfully');
        }
      },
      storage: {
        getItem: (name) => {
          try {
            const value = localStorage.getItem(name);
            return value;
          } catch (error) {
            console.error('[STORAGE] Error reading from localStorage:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, value);
          } catch (error) {
            console.error('[STORAGE] Error writing to localStorage:', error);
            // If quota exceeded, try to clear old data
            if (error.name === 'QuotaExceededError') {
              console.warn('[STORAGE] Quota exceeded - clearing storage and retrying');
              try {
                // Clear the storage and try again
                localStorage.removeItem(name);
                localStorage.setItem(name, value);
              } catch (retryError) {
                console.error('[STORAGE] Failed to save even after clearing:', retryError);
                throw retryError;
              }
            }
            throw error;
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch (error) {
            console.error('[STORAGE] Error removing from localStorage:', error);
          }
        },
      },
    }
  )
);

export default useAppStore;
