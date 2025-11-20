import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { validatePhoto, compressImage } from '../lib/image-processor';
import useAppStore from '../store/useAppStore';
import PhotoGuidelinesModal from './PhotoGuidelinesModal';

const PhotoUpload = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const fileInputRef = useRef(null);
  const { setUserPhoto } = useAppStore();

  const handleFile = async (file) => {
    setError(null);

    // Validate file
    const validation = validatePhoto(file);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    setIsUploading(true);

    try {
      // Compress image to fit localStorage limits
      const compressedBase64 = await compressImage(file);
      setPreview(compressedBase64);

      // Try to save to localStorage with error handling
      try {
        setUserPhoto(compressedBase64);
        console.log('[PHOTO] Successfully saved photo to localStorage');
      } catch (storageError) {
        console.error('[PHOTO] Failed to save to localStorage:', storageError);
        setError('Image too large. Please try a smaller image.');
        setIsUploading(false);
        return;
      }

      // Simulate upload delay for better UX
      setTimeout(() => {
        setIsUploading(false);
        if (onUploadComplete) {
          onUploadComplete(compressedBase64);
        }
      }, 500);
    } catch (err) {
      console.error('[PHOTO] Failed to process image:', err);
      setError('Failed to process image');
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    if (!preview) {
      setShowGuidelines(true);
    }
  };

  const handleChoosePhoto = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <div
        className={`
          glass-card p-8 transition-all duration-300 cursor-pointer
          ${isDragging ? 'border-primary-500 border-4 scale-105' : 'border-2 border-dashed border-gray-300'}
          ${preview ? 'border-green-500' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!preview ? (
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="p-6 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full">
                <Upload className="w-12 h-12 text-white" />
              </div>
            </div>

            <h3 className="text-2xl font-display font-bold text-gray-900 mb-2">
              Upload Your Photo
            </h3>
            <p className="text-gray-600 mb-4">
              Drag & drop or click to select a full-height, front-facing photo
            </p>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <ImageIcon className="w-4 h-4" />
              <span>PNG, JPG up to 10MB</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-64 object-cover"
              />
              {!isUploading && (
                <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              )}
            </div>

            {isUploading && (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
                <span className="text-gray-600">Processing...</span>
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreview(null);
                setUserPhoto(null);
              }}
              className="w-full btn-secondary text-sm"
            >
              Choose Different Photo
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <PhotoGuidelinesModal
        isOpen={showGuidelines}
        onClose={() => setShowGuidelines(false)}
        onChoosePhoto={handleChoosePhoto}
      />
    </div>
  );
};

export default PhotoUpload;
