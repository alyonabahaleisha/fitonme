import { useState, useEffect } from 'react';
import { Heart, Share2, ArrowLeft, Shuffle } from 'lucide-react';
import { useOutfitOverlay } from '../hooks/useOutfitOverlay';
import useAppStore from '../store/useAppStore';

const OutfitViewer = ({ outfit, onBack, onShuffle }) => {
  const [displayImage, setDisplayImage] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const { applyOutfit, isProcessing } = useOutfitOverlay();
  const { userPhoto, favorites, toggleFavorite, setShowShareModal } = useAppStore();
  const isFavorite = favorites.includes(outfit?.id);

  useEffect(() => {
    if (outfit && userPhoto) {
      loadOutfitImage();
    }
  }, [outfit]);

  const loadOutfitImage = async () => {
    const result = await applyOutfit(outfit);
    if (result) {
      setDisplayImage(result);
    }
  };

  if (!outfit) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-500">No outfit selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="glass-card fixed top-0 left-0 right-0 z-10 px-4 py-3 flex items-center justify-between md:right-[400px]">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>

        <h1 className="text-xl font-display font-bold text-gradient">
          GodLovesMe AI
        </h1>

        <button
          onClick={onShuffle}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Shuffle className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* Main outfit display */}
      <div className="pt-20 pb-8 px-4 md:pr-[400px]">
        <div className="max-w-4xl mx-auto">
          {/* Outfit image */}
          <div className="relative mb-6 animate-fade-in">
            <div className="glass-card p-4 overflow-hidden">
              {isProcessing ? (
                <div className="aspect-[3/4] max-h-[calc(100vh-12rem)] flex items-center justify-center bg-gray-100 rounded-xl">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Applying outfit...</p>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl">
                  <img
                    src={showComparison ? userPhoto : displayImage || userPhoto}
                    alt={outfit.name}
                    className="w-full h-auto max-h-[calc(100vh-12rem)] object-contain transition-opacity duration-300"
                  />

                  {/* Before/After Toggle */}
                  <button
                    onMouseDown={() => setShowComparison(true)}
                    onMouseUp={() => setShowComparison(false)}
                    onMouseLeave={() => setShowComparison(false)}
                    onTouchStart={() => setShowComparison(true)}
                    onTouchEnd={() => setShowComparison(false)}
                    className="absolute bottom-4 left-4 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm"
                  >
                    {showComparison ? 'Original' : 'Hold to Compare'}
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-4 justify-center">
              <button
                onClick={() => toggleFavorite(outfit.id)}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl font-semibold
                  transition-all duration-300 transform hover:scale-105 active:scale-95
                  ${isFavorite
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 border-2 border-gray-300'
                  }
                `}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                {isFavorite ? 'Saved' : 'Save'}
              </button>

              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>
            </div>
          </div>

          {/* Outfit details card */}
          <div className="glass-card p-6 animate-slide-up">
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
              {outfit.name}
            </h2>
            <p className="text-gray-600 mb-4">
              {outfit.description}
            </p>

            <div className="flex flex-wrap gap-2">
              {outfit.tags?.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gradient-to-r from-primary-500/10 to-primary-600/10 text-primary-600 rounded-full text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Category</span>
                <span className="font-semibold text-gray-900 capitalize">
                  {outfit.category}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutfitViewer;
