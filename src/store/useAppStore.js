import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbStorage } from '../lib/indexedDB';

const useAppStore = create(
  persist(
    (set, get) => ({
      // User photo state
      userPhoto: null,
      setUserPhoto: (photo) => set({ userPhoto: photo, processedImages: {}, generatedLooks: [] }), // Clear cache on new photo

      // Current outfit
      currentOutfit: null,
      setCurrentOutfit: (outfit) => set({ currentOutfit: outfit }),

      // Style preference (for outfit generation)
      stylePreference: null, // 'feminine' | 'masculine'
      setStylePreference: (style) => set({ stylePreference: style }),

      // Flow step management
      currentStep: 'upload', // 'upload' | 'style' | 'first_look' | 'more_looks' | 'details'
      setCurrentStep: (step) => set({ currentStep: step }),

      // Generated looks for the current session
      generatedLooks: [], // Array of { outfitId, image, outfit }
      addGeneratedLook: (look) => set((state) => ({
        generatedLooks: [...state.generatedLooks, look]
      })),
      setGeneratedLooks: (looks) => set({ generatedLooks: looks }),
      clearGeneratedLooks: () => set({ generatedLooks: [] }),

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

      // Closet item count
      closetCount: 0,
      setClosetCount: (count) => set((state) => {
        if (state.closetCount === count) return {};
        return { closetCount: count };
      }),
      incrementClosetCount: () => set((state) => {
        console.log('[STORE] Incrementing closet count. Current:', state.closetCount);
        return { closetCount: (state.closetCount || 0) + 1 };
      }),
      decrementClosetCount: () => set((state) => ({ closetCount: Math.max(0, (state.closetCount || 0) - 1) })),

      // Reset state (for sign out)
      resetState: () => set({
        userPhoto: null,
        currentOutfit: null,
        processedImages: {},
        favorites: [],
        guestTryOns: 0,
        showShareModal: false,
        showSignUpModal: false,
        closetCount: 0,
        stylePreference: null,
        currentStep: 'upload',
        generatedLooks: [],
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
        closetCount: state.closetCount,
        stylePreference: state.stylePreference,
        generatedLooks: state.generatedLooks,
        // Note: currentStep intentionally NOT persisted - should reset to 'upload' on page load
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
          return await idbStorage.getItem(name);
        },
        setItem: async (name, value) => {
          await idbStorage.setItem(name, value);
        },
        removeItem: async (name) => {
          await idbStorage.removeItem(name);
        },
      },
    }
  )
);

export default useAppStore;
