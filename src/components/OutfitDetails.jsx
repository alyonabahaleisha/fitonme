import { X, ExternalLink } from 'lucide-react';

const OutfitDetails = ({ outfit, image, onClose, isOpen }) => {
  if (!isOpen || !outfit) return null;

  // Get items from outfit (products)
  const items = outfit.products || [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          What this look is made of
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-secondary transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Look preview */}
        <div className="p-4">
          <div className="aspect-[3/4] max-w-xs mx-auto rounded-2xl overflow-hidden shadow-md">
            <img
              src={image}
              alt={outfit.name || 'Your look'}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Item cards */}
        <div className="px-4 pb-8 space-y-3">
          <p className="text-sm text-muted-foreground text-center mb-4">
            Tap any item to learn more
          </p>

          {items.length > 0 ? (
            items.map((item, index) => (
              <ItemCard key={item.id || index} item={item} />
            ))
          ) : (
            // Fallback if no products
            <div className="text-center py-8 text-muted-foreground">
              <p>Item details coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ItemCard = ({ item }) => {
  const handleClick = () => {
    if (item.link) {
      window.open(item.link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!item.link}
      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-border hover:border-brand/30 hover:shadow-sm transition-all text-left disabled:cursor-default"
    >
      {/* Item thumbnail */}
      {item.image ? (
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-16 h-16 rounded-xl bg-secondary flex-shrink-0 flex items-center justify-center">
          <span className="text-2xl">{getItemEmoji(item.category)}</span>
        </div>
      )}

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {item.category || 'Item'}
            </p>
            <p className="font-medium text-foreground truncate">
              {item.name || 'Untitled'}
            </p>
            {item.brand && (
              <p className="text-sm text-muted-foreground">
                {item.brand}
              </p>
            )}
          </div>
          {item.price && (
            <p className="text-sm font-medium text-foreground whitespace-nowrap">
              {item.price}
            </p>
          )}
        </div>
      </div>

      {/* External link indicator */}
      {item.link && (
        <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      )}
    </button>
  );
};

// Helper to get emoji for item category
const getItemEmoji = (category) => {
  const emojiMap = {
    top: '👕',
    shirt: '👔',
    blouse: '👚',
    bottom: '👖',
    pants: '👖',
    skirt: '👗',
    dress: '👗',
    shoes: '👟',
    sneakers: '👟',
    heels: '👠',
    boots: '👢',
    accessory: '👜',
    bag: '👜',
    jewelry: '💍',
    watch: '⌚',
    hat: '🎩',
    sunglasses: '🕶️',
    jacket: '🧥',
    coat: '🧥',
    sweater: '🧶',
  };

  const key = category?.toLowerCase() || '';
  return emojiMap[key] || '✨';
};

export default OutfitDetails;
