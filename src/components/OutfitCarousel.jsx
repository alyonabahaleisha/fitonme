import { Sparkles } from 'lucide-react';

const OutfitCarousel = ({ outfits, selectedOutfit, onSelectOutfit }) => {
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
          style={{ width: 'calc((100% - 3 * 1rem) / 4)' }}
          className="group relative overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-[var(--shadow-hover)] transition-all duration-300 cursor-pointer"
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
                <Sparkles className="h-4 w-4" />
                {selectedOutfit?.id === outfit.id ? 'Selected' : 'Try On'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OutfitCarousel;
