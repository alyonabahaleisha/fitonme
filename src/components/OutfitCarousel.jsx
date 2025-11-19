import { Sparkles, RefreshCw, RotateCw } from 'lucide-react';

const OutfitCarousel = ({ outfits, selectedOutfit, onSelectOutfit, onRegenerate, hasAppliedOutfit }) => {
  if (!outfits || outfits.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No outfits available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-4">
      {outfits.map((outfit) => (
        <div
          key={outfit.id}
          onClick={() => onSelectOutfit(outfit)}
          className={`group relative overflow-hidden bg-white rounded-lg shadow-sm hover:shadow-[var(--shadow-hover)] transition-all duration-300 cursor-pointer w-[calc((100%-1rem)/2)] lg:w-[calc((100%-4rem)/5)] ${
            selectedOutfit?.id === outfit.id
              ? 'border-2 shadow-lg'
              : 'border border-gray-200'
          }`}
          style={selectedOutfit?.id === outfit.id ? { borderColor: '#ff6b5a' } : {}}
        >
          {/* Outfit Image */}
          <div className="aspect-[3/4] overflow-hidden bg-white relative p-[5px]">
            <img
              src={outfit.thumbnailUrl || outfit.imageUrl}
              alt={outfit.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />

            {/* Try On Button Overlay - Shows on Hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <button
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  selectedOutfit?.id === outfit.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-900 hover:bg-primary-500 hover:text-white'
                }`}
              >
                {selectedOutfit?.id === outfit.id && hasAppliedOutfit ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </>
                ) : selectedOutfit?.id === outfit.id ? (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Selected
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Try On
                  </>
                )}
              </button>
            </div>

            {/* Retry Button - Shows on selected and applied outfit */}
            {selectedOutfit?.id === outfit.id && hasAppliedOutfit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRegenerate();
                }}
                className="absolute top-2 right-2 z-10 bg-white/95 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-300 hover:scale-110"
                style={{ color: '#ff6b5a' }}
                aria-label="Regenerate outfit"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default OutfitCarousel;
