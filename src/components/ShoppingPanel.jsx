import { X, ShoppingBag, ExternalLink } from 'lucide-react';

const ShoppingPanel = ({ isOpen, onClose, outfit }) => {
  if (!isOpen) return null;

  const products = outfit?.products || [];

  // Add Amazon affiliate tag to product links
  const getAffiliateLink = (link) => {
    if (!link) return link;
    try {
      const url = new URL(link);
      if (url.hostname.includes('amazon.com')) {
        url.searchParams.set('tag', 'alvalgrace-20');
        return url.toString();
      }
      return link;
    } catch (e) {
      // If URL parsing fails, just return the original link
      return link;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-coral-500" style={{ color: '#ff6b5a' }} />
            <h2 className="text-xl font-bold text-gray-900">Shop This Look</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Outfit Info */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-1">{outfit?.name}</h3>
          {outfit?.description && (
            <p className="text-sm text-gray-600">{outfit.description}</p>
          )}
        </div>

        {/* Products List */}
        <div className="p-4">
          {products.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No products available for this outfit</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map((product, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Product Image */}
                  {product.imageUrl && (
                    <div className="w-full h-32 bg-gray-100">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {/* Product Info */}
                  <div className="p-3">
                    <div className="mb-2">
                      {product.category && (
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-xs font-medium text-gray-600 rounded mb-1">
                          {product.category}
                        </span>
                      )}
                      <h4 className="font-semibold text-sm text-gray-900">{product.name}</h4>
                    </div>

                    {/* Buy Button */}
                    {product.link && (
                      <a
                        href={getAffiliateLink(product.link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-coral-500 hover:bg-coral-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                        style={{ backgroundColor: '#ff6b5a' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ff5544'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff6b5a'}
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Buy on Amazon
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ShoppingPanel;
