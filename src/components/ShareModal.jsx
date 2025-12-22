import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Instagram, Check } from 'lucide-react';
import { addWatermark } from '../lib/image-processor';
import useAppStore from '../store/useAppStore';
import { useScrollLock } from "../hooks/useScrollLock";

const ShareModal = ({ imageToShare, outfitName }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [watermarkedImage, setWatermarkedImage] = useState(null);
  const [downloaded, setDownloaded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState(null);
  const { showShareModal, setShowShareModal } = useAppStore();

  useScrollLock(showShareModal);

  const generateShareImage = async () => {
    if (watermarkedImage) return watermarkedImage;

    setIsGenerating(true);
    try {
      const result = await addWatermark(imageToShare, 'ilovme');
      setWatermarkedImage(result);
      return result;
    } catch (error) {
      console.error('Error generating share image:', error);
      return imageToShare;
    } finally {
      setIsGenerating(false);
    }
  };

  // Convert data URL to File object for Web Share API
  const dataUrlToFile = async (dataUrl, filename) => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/png' });
  };

  const handleDownload = async () => {
    const image = await generateShareImage();
    const link = document.createElement('a');
    link.href = image;
    link.download = `ilovme-${outfitName || 'look'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded(true);
    return image;
  };

  const handleShareToStory = async () => {
    setIsSharing(true);
    setShareError(null);

    try {
      const image = await generateShareImage();
      const file = await dataUrlToFile(image, `ilovme-${outfitName || 'look'}.png`);

      // Check if Web Share API with files is supported
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My look styled by ilovme',
        });
        setDownloaded(true);
      } else {
        // Fallback: download the image and show instruction
        setShareError('not-supported');
        await handleDownload();
      }
    } catch (error) {
      console.error('Share error:', error);
      if (error.name === 'AbortError') {
        // User cancelled - that's fine
      } else {
        // Other error - fallback to download
        setShareError('not-supported');
        await handleDownload();
      }
    } finally {
      setIsSharing(false);
    }
  };

  if (!showShareModal) return null;

  return (
    createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => setShowShareModal(false)}
      >
        <div
          className="bg-white w-full sm:w-auto sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Preview - full look, clean */}
          <div className="relative bg-neutral-100">
            <img
              src={watermarkedImage || imageToShare}
              alt="Your look"
              className="w-full aspect-[3/4] object-contain"
            />
            {isGenerating && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
              </div>
            )}
            {/* Brand signature - editorial, not UI */}
            <span className="absolute bottom-4 right-4 text-[11px] font-serif tracking-wide text-white/60">
              ilovme
            </span>
            {/* Close button */}
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-3 right-3 p-2 bg-black/20 hover:bg-black/30 backdrop-blur-sm rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Actions */}
          <div className="p-5 space-y-3">
            {/* Header */}
            <h2 className="text-lg font-serif font-semibold text-center text-gray-900">
              Share this look
            </h2>

            {/* Primary: Share to Instagram */}
            <button
              onClick={handleShareToStory}
              disabled={isGenerating || isSharing}
              className="w-full flex items-center justify-center gap-2 py-4 bg-brand hover:bg-brand/90 text-white rounded-2xl font-semibold transition-colors disabled:opacity-50"
            >
              {isSharing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <Instagram className="w-5 h-5" />
                  Share to Instagram
                </>
              )}
            </button>

            {/* Secondary: Save image */}
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
            >
              {downloaded ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">Saved to photos</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Save image
                </>
              )}
            </button>

            {/* Fallback message when share not supported */}
            {shareError === 'not-supported' && downloaded && (
              <p className="text-xs text-center text-gray-500 animate-fade-in">
                Image saved! Open Instagram to share to your Story.
              </p>
            )}
          </div>
        </div>
      </div>,
      document.body
    )
  );
};

export default ShareModal;
