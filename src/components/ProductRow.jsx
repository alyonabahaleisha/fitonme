import { trackProductClicked } from '../services/analytics';
import { useAuth } from '../contexts/AuthContext';

const ProductRow = ({ outfit }) => {
  const { user } = useAuth();

  if (!outfit) return null;

  const products = outfit?.products || [];

  if (products.length === 0) return null;

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
    <div className="overflow-hidden">
      <div className="flex gap-3 overflow-x-auto overflow-y-hidden pb-2 snap-x snap-mandatory scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {products.map((product, index) =>
          product.link ? (
            <a
              key={index}
              href={getAffiliateLink(product.link)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackProductClicked(product.name, product.link, outfit?.id, user?.id)}
              className="flex-shrink-0 snap-start bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 block"
              style={{ width: '140px' }}
            >
              {/* Product Image */}
              {product.imageUrl && (
                <div className="w-full h-36 bg-gray-100">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              )}
            </a>
          ) : (
            <div
              key={index}
              className="flex-shrink-0 snap-start bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-300"
              style={{ width: '140px' }}
            >
              {/* Product Image */}
              {product.imageUrl && (
                <div className="w-full h-36 bg-gray-100">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ProductRow;
