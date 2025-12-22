import { X, ArrowUpRight } from 'lucide-react';

// Accessory types - everything else is clothing
const ACCESSORY_TYPES = ['shoes', 'boots', 'sneakers', 'heels', 'sandals', 'bag', 'handbag', 'clutch', 'tote', 'jewelry', 'earrings', 'necklace', 'bracelet', 'ring', 'watch', 'belt', 'scarf', 'hat', 'sunglasses', 'glasses'];

// Sort order within groups (lower = first)
const CLOTHING_ORDER = ['coat', 'jacket', 'blazer', 'cardigan', 'sweater', 'knit', 'top', 'blouse', 'shirt', 'tee', 'dress', 'jumpsuit', 'pants', 'trousers', 'jeans', 'skirt', 'shorts'];
const ACCESSORY_ORDER = ['shoes', 'boots', 'sneakers', 'heels', 'sandals', 'bag', 'handbag', 'clutch', 'tote', 'belt', 'scarf', 'hat', 'sunglasses', 'jewelry', 'earrings', 'necklace', 'bracelet', 'ring', 'watch'];

const isAccessory = (item) => {
  const name = (item.name || item.category || '').toLowerCase();
  return ACCESSORY_TYPES.some(type => name.includes(type));
};

const getSortOrder = (item, orderList) => {
  const name = (item.name || item.category || '').toLowerCase();
  const index = orderList.findIndex(type => name.includes(type));
  return index === -1 ? 999 : index;
};

const OutfitDetails = ({ outfit, image, onClose, isOpen }) => {
  if (!isOpen || !outfit) return null;

  // Get items from outfit (products)
  const items = outfit.products || [];

  // Split into clothing and accessories, then sort each group
  const clothing = items
    .filter(item => !isAccessory(item))
    .sort((a, b) => getSortOrder(a, CLOTHING_ORDER) - getSortOrder(b, CLOTHING_ORDER));

  const accessories = items
    .filter(item => isAccessory(item))
    .sort((a, b) => getSortOrder(a, ACCESSORY_ORDER) - getSortOrder(b, ACCESSORY_ORDER));

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
        <div className="px-4 pt-5 pb-4">
          <h2 className="text-lg font-serif font-semibold text-gray-900">
            Items in this look
          </h2>
          <p className="text-xs text-gray-500">
            Real pieces you can find online
          </p>
        </div>

        {/* Item list - grouped as sourcing notes */}
        <div className="px-4 pb-8">
          {items.length > 0 ? (
            <div className="space-y-6">
              {/* Clothing group */}
              {clothing.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">
                    Clothing
                  </p>
                  <div className="space-y-1">
                    {clothing.map((item, index) => (
                      <ItemRow key={item.id || `clothing-${index}`} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Accessories group */}
              {accessories.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">
                    Accessories
                  </p>
                  <div className="space-y-1">
                    {accessories.map((item, index) => (
                      <ItemRow key={item.id || `accessory-${index}`} item={item} />
                    ))}
                  </div>
                </div>
              )}
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
            <p className="mt-8 text-xs text-gray-400 text-center">
              Links are provided for reference.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Editorial sourcing row - name + brand, calm styling
const ItemRow = ({ item }) => {
  const handleClick = () => {
    if (item.link) {
      window.open(item.link, '_blank', 'noopener,noreferrer');
    }
  };

  // Use descriptive name, fallback to category only if no name
  const displayName = item.name || item.category || 'Item';

  return (
    <button
      onClick={handleClick}
      disabled={!item.link}
      className="w-full flex items-center gap-3 py-3 text-left group disabled:cursor-default"
    >
      {/* Thumbnail - slightly larger, softer corners */}
      {item.imageUrl && (
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
          <img
            src={item.imageUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Name + Brand - stylist notes style */}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-900 block">
          {displayName}
        </span>
        {item.brand && (
          <span className="text-xs text-gray-500">
            {item.brand}
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
