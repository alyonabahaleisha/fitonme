import { useState } from 'react';
import { Upload, X, Plus, Check } from 'lucide-react';
import { fileToBase64, generateThumbnail } from '../lib/image-processor';
import { createOutfit } from '../services/outfitService';
import useAppStore from '../store/useAppStore';

const AdminOutfitUpload = ({ onClose }) => {
  const [currentOutfit, setCurrentOutfit] = useState({
    name: '',
    description: '',
    category: 'casual',
    tags: [],
    season: 'all',
    imageFile: null,
    imagePreview: null
  });
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const { setOutfits } = useAppStore();

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      setCurrentOutfit(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: base64
      }));
    } catch (error) {
      console.error('Error loading image:', error);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !currentOutfit.tags.includes(tagInput.trim())) {
      setCurrentOutfit(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setCurrentOutfit(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSaveOutfit = async () => {
    if (!currentOutfit.name || !currentOutfit.imagePreview) {
      alert('Please provide outfit name and image');
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      // Generate thumbnail
      const thumbnail = await generateThumbnail(currentOutfit.imagePreview);

      // Save to Supabase
      await createOutfit({
        name: currentOutfit.name,
        description: currentOutfit.description,
        category: currentOutfit.category,
        tags: currentOutfit.tags,
        season: currentOutfit.season,
        imagePreview: currentOutfit.imagePreview,
        thumbnailPreview: thumbnail,
      });

      // Show success message
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);

      // Reset form
      setCurrentOutfit({
        name: '',
        description: '',
        category: 'casual',
        tags: [],
        season: 'all',
        imageFile: null,
        imagePreview: null
      });

      alert('Outfit uploaded successfully to Supabase!');
    } catch (error) {
      console.error('Error saving outfit:', error);
      alert(`Failed to save outfit: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-display font-bold text-gradient">
            Admin: Upload Outfits
          </h1>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
          )}
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Upload form */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-xl font-display font-bold text-gray-900">
              Add New Outfit
            </h2>

            {/* Image upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Outfit Image (PNG with transparency)
              </label>
              <div className="relative">
                {currentOutfit.imagePreview ? (
                  <div className="relative">
                    <img
                      src={currentOutfit.imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-contain bg-gray-100 rounded-xl"
                    />
                    <button
                      onClick={() => setCurrentOutfit(prev => ({ ...prev, imageFile: null, imagePreview: null }))}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-500 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Click to upload</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Outfit Name
              </label>
              <input
                type="text"
                value={currentOutfit.name}
                onChange={(e) => setCurrentOutfit(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Summer Casual Dress"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={currentOutfit.description}
                onChange={(e) => setCurrentOutfit(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the outfit..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category
              </label>
              <select
                value={currentOutfit.category}
                onChange={(e) => setCurrentOutfit(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="streetwear">Streetwear</option>
                <option value="seasonal">Seasonal</option>
              </select>
            </div>

            {/* Season */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Season
              </label>
              <select
                value={currentOutfit.season}
                onChange={(e) => setCurrentOutfit(prev => ({ ...prev, season: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Seasons</option>
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
                <option value="fall">Fall</option>
                <option value="winter">Winter</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tag..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddTag}
                  className="p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentOutfit.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                  >
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Upload button */}
            <button
              onClick={handleSaveOutfit}
              disabled={isUploading || !currentOutfit.name || !currentOutfit.imagePreview}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Uploading to Supabase...
                </>
              ) : uploadSuccess ? (
                <>
                  <Check className="w-5 h-5" />
                  Uploaded!
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload Outfit to Supabase
                </>
              )}
            </button>

            {/* Info message */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Outfits are now stored securely in Supabase.
                Make sure you've configured your Supabase credentials in the .env file.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOutfitUpload;
