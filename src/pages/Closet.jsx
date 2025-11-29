import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTryOnHistory, deleteTryOn } from '../lib/supabase';
import { getOutfitsByIds } from '../services/outfitService';
import { Download, Trash2, Loader2, ShoppingBag, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const Closet = () => {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [outfitDetails, setOutfitDetails] = useState({});
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        const loadHistory = async () => {
            if (!user) return;
            try {
                const data = await getTryOnHistory(user.id, 50); // Fetch last 50 items
                setHistory(data || []);

                // Fetch details for all outfits in history
                if (data && data.length > 0) {
                    const outfitIds = [...new Set(data.map(item => item.outfit_id))];
                    const details = await getOutfitsByIds(outfitIds);

                    // Create a map for easy lookup
                    const detailsMap = {};
                    details.forEach(outfit => {
                        detailsMap[outfit.id] = outfit;
                    });
                    setOutfitDetails(detailsMap);
                }
            } catch (error) {
                console.error('Error loading closet:', error);
                toast.error('Failed to load your closet');
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, [user]);

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this outfit?')) return;

        setDeletingId(id);
        try {
            await deleteTryOn(id);
            setHistory(prev => prev.filter(item => item.id !== id));
            toast.success('Outfit removed from closet');
        } catch (error) {
            console.error('Error deleting outfit:', error);
            toast.error('Failed to delete outfit');
        } finally {
            setDeletingId(null);
        }
    };

    const handleDownload = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename || 'fitonme-outfit.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback: open in new tab
            window.open(url, '_blank');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-gray-900">My Closet</h1>
                        <p className="text-gray-600 mt-1">Your collection of virtual try-ons</p>
                    </div>
                    <Link
                        to="/try-on"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-full hover:bg-brand/90 transition-colors font-medium"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        New Try-On
                    </Link>
                </div>

                {history.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Your closet is empty</h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            You haven't generated any outfits yet. Head over to the dressing room to start your style journey!
                        </p>
                        <Link
                            to="/try-on"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-full hover:bg-brand/90 transition-colors font-medium"
                        >
                            Go to Dressing Room
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {history.map((item) => {
                            const outfit = outfitDetails[item.outfit_id];
                            return (
                                <div key={item.id} className="flex flex-col gap-4">
                                    <div className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                                        <div className="aspect-[3/4] overflow-hidden bg-gray-100 relative">
                                            {item.result_url ? (
                                                <img
                                                    src={item.result_url}
                                                    alt="Virtual Try-On Result"
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    No Image
                                                </div>
                                            )}

                                            {/* Overlay Actions */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-between p-4 opacity-0 group-hover:opacity-100">
                                                <button
                                                    onClick={() => handleDownload(item.result_url, `fitonme-${item.outfit_id}-${new Date(item.created_at).toISOString().split('T')[0]}.png`)}
                                                    className="p-2 bg-white rounded-full text-gray-700 hover:text-brand hover:bg-white transition-colors shadow-lg"
                                                    title="Download"
                                                >
                                                    <Download className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    disabled={deletingId === item.id}
                                                    className="p-2 bg-white rounded-full text-gray-700 hover:text-red-600 hover:bg-white transition-colors shadow-lg disabled:opacity-50"
                                                    title="Delete"
                                                >
                                                    {deletingId === item.id ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-4 border-t border-gray-50">
                                            <p className="text-xs text-gray-500">
                                                {new Date(item.created_at).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Shop the Look Section */}
                                    {outfit && outfit.products && outfit.products.length > 0 && (
                                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                                            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Shop the Look</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {outfit.products.map((product, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={product.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex flex-col gap-2 group/product hover:bg-gray-50 p-2 rounded-lg transition-colors border border-transparent hover:border-gray-100"
                                                    >
                                                        <div className="w-full aspect-square rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                                                            <img
                                                                src={product.imageUrl}
                                                                alt={product.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-medium text-gray-900 truncate group-hover/product:text-brand transition-colors">
                                                                {product.name}
                                                            </p>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Closet;
