import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbStorage } from '../lib/indexedDB';

const useAppStore = create(
  persist(
    (set, get) => ({
      // User photo state
      userPhoto: null,
      setUserPhoto: (photo) => set({ userPhoto: photo, processedImages: {} }), // Clear cache on new photo

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

      // Processed image cache
      processedImages: {},
      cacheProcessedImage: (outfitId, imageData) => {
        const state = get();
        // Create a new object to ensure state update
        set({
          processedImages: {
            ...state.processedImages,
            [outfitId]: imageData
          }
        });
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

      // New closet item badge
      hasNewClosetItem: false,
      setHasNewClosetItem: (hasNew) => set({ hasNewClosetItem: hasNew }),

      // Reset state (for sign out)
      resetState: () => set({
        userPhoto: null,
        currentOutfit: null,
        processedImages: {},
        favorites: [],
        guestTryOns: 0,
        showShareModal: false,
        showSignUpModal: false,
        hasNewClosetItem: false,
      }),
    }),
    {
      name: 'godlovesme-storage',
      partialize: (state) => ({
        // Persist favorites, userPhoto, guestTryOns, currentOutfit, and processedImages
        favorites: state.favorites,
        userPhoto: state.userPhoto,
        guestTryOns: state.guestTryOns,
        currentOutfit: state.currentOutfit,
        processedImages: state.processedImages,
        hasNewClosetItem: state.hasNewClosetItem,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('[STORAGE] Error rehydrating state:', error);
        } else {
          console.log('[STORAGE] State rehydrated successfully');
        }
      },
      storage: {
        getItem: async (name) => {
          console.log('[STORAGE] Reading from IndexedDB:', name);
          return await idbStorage.getItem(name);
        },
        setItem: async (name, value) => {
          console.log('[STORAGE] Writing to IndexedDB:', name);
          await idbStorage.setItem(name, value);
        },
        removeItem: async (name) => {
          console.log('[STORAGE] Removing from IndexedDB:', name);
          await idbStorage.removeItem(name);
        },
      },
    }
  )
);

export default useAppStore;
