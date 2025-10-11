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
          style={{ width: 'calc((100% - 4 * 1rem) / 5)' }}
          className="group relative overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-[var(--shadow-hover)] transition-all duration-300 cursor-pointer"
        >
          {/* Outfit Image */}
          <div className="aspect-square overflow-hidden bg-gray-100">
            <img
              src={outfit.thumbnailUrl || outfit.imageUrl}
              alt={outfit.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          </div>

          {/* Outfit Info */}
          <div className="p-4 space-y-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {outfit.category || 'Outfit'}
              </p>
              <h3 className="font-semibold text-gray-900 line-clamp-1">
                {outfit.name}
              </h3>
            </div>

            {/* Try On Button */}
            <button
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                selectedOutfit?.id === outfit.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-primary-500 hover:text-white border border-gray-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {selectedOutfit?.id === outfit.id ? 'Selected' : 'Try On'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OutfitCarousel;
