import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Twitter, Facebook, Instagram, Link2, Check } from 'lucide-react';
import { addWatermark } from '../lib/image-processor';
import useAppStore from '../store/useAppStore';

import { useScrollLock } from "../hooks/useScrollLock";

const ShareModal = ({ imageToShare, outfitName }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [watermarkedImage, setWatermarkedImage] = useState(null);
  const [copied, setCopied] = useState(false);
  const { showShareModal, setShowShareModal } = useAppStore();

  useScrollLock(showShareModal);

  const generateShareImage = async () => {
    if (watermarkedImage) return watermarkedImage;

    setIsGenerating(true);
    try {
      const result = await addWatermark(imageToShare, 'GodLovesMe AI');
      setWatermarkedImage(result);
      return result;
    } catch (error) {
      console.error('Error generating share image:', error);
      return imageToShare;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const image = await generateShareImage();
    const link = document.createElement('a');
    link.href = image;
    link.download = `godlovesme-ai-${outfitName || 'outfit'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = async () => {
    // In production, this would be a real shareable link
    const shareUrl = window.location.href;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToSocial = (platform) => {
    const text = `Check out my new outfit on GodLovesMe AI! 👗✨`;
    const url = window.location.href;

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      instagram: '#', // Instagram doesn't support web sharing
    };

    if (urls[platform] !== '#') {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  if (!showShareModal) return null;

  return (
    createPortal(
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
        <div
          className="glass-card w-full sm:w-auto sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-6 animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold text-gray-900">
              Share Your Look
            </h2>
            <button
              onClick={() => setShowShareModal(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          {/* Preview */}
          <div className="mb-6">
            <div className="relative rounded-xl overflow-hidden">
              <img
                src={watermarkedImage || imageToShare}
                alt="Share preview"
                className="w-full h-48 object-cover"
              />
              {isGenerating && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
            </div>
          </div>

          {/* Share options */}
          <div className="space-y-3">
            {/* Download */}
            <button
              onClick={handleDownload}
              className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:shadow-lg transition-all"
            >
              <Download className="w-5 h-5" />
              <span className="font-semibold">Download Image</span>
            </button>

            {/* Social media */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => shareToSocial('twitter')}
                className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 transition-colors"
              >
                <Twitter className="w-6 h-6 text-blue-400" />
                <span className="text-xs font-medium text-gray-700">Twitter</span>
              </button>

              <button
                onClick={() => shareToSocial('facebook')}
                className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-600 transition-colors"
              >
                <Facebook className="w-6 h-6 text-blue-600" />
                <span className="text-xs font-medium text-gray-700">Facebook</span>
              </button>

              <button
                onClick={() => shareToSocial('instagram')}
                className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-pink-500 transition-colors"
              >
                <Instagram className="w-6 h-6 text-pink-500" />
                <span className="text-xs font-medium text-gray-700">Instagram</span>
              </button>
            </div>

            {/* Copy link */}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-primary-500 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-green-600">Link Copied!</span>
                </>
              ) : (
                <>
                  <Link2 className="w-5 h-5 text-gray-700" />
                  <span className="font-semibold text-gray-700">Copy Link</span>
                </>
              )}
            </button>
          </div>

          {/* Footer text */}
          <p className="mt-4 text-center text-xs text-gray-500">
            Share your style with the world!
          </p>
        </div>
      </div>,
      document.body
    )
  );
};

export default ShareModal;
