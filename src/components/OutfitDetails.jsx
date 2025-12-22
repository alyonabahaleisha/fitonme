import { X, ArrowUpRight } from 'lucide-react';

const OutfitDetails = ({ outfit, image, onClose, isOpen }) => {
  if (!isOpen || !outfit) return null;

  // Get items from outfit (products)
  const items = outfit.products || [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-fade-in">
      {/* Hero image - dominates the screen */}
      <div className="relative">
        <div className="w-full aspect-[3/4] max-h-[50vh] bg-neutral-100">
          <img
            src={image}
            alt={outfit.name || 'Your look'}
            className="w-full h-full object-contain"
          />
        </div>
        {/* Close button overlay */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-3 bg-black/20 hover:bg-black/30 backdrop-blur-sm rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Content below image */}
      <div className="flex-1 overflow-y-auto">
        {/* Section header */}
        <div className="px-4 pt-5 pb-3">
          <h2 className="text-lg font-serif font-semibold text-gray-900">
            Items in this look
          </h2>
          <p className="text-xs text-gray-500">
            Real pieces you can find online
          </p>
        </div>

        {/* Item list - annotations */}
        <div className="px-4 pb-8">
          {items.length > 0 ? (
            <div>
              {items.map((item, index) => (
                <ItemRow key={item.id || index} item={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 font-serif italic">
                Item details coming soon
              </p>
            </div>
          )}

          {/* Transparency line */}
          {items.length > 0 && (
            <p className="mt-6 text-xs text-gray-400 text-center">
              Links are provided for reference.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Editorial annotation style - with thumbnail
const ItemRow = ({ item }) => {
  const handleClick = () => {
    if (item.link) {
      window.open(item.link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!item.link}
      className="w-full flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 text-left group disabled:cursor-default"
    >
      {/* Thumbnail */}
      {item.imageUrl && (
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          <img
            src={item.imageUrl}
            alt={item.name || 'Item'}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Name + Category */}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-900 truncate block">
          {item.name || item.category || 'Item'}
        </span>
        {item.name && item.category && (
          <span className="text-xs text-gray-500">
            {item.category}
          </span>
        )}
      </div>

      {/* Link indicator - subtle arrow */}
      {item.link && (
        <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-brand transition-colors flex-shrink-0" />
      )}
    </button>
  );
};

export default OutfitDetails;
