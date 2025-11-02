import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Upload, ArrowLeft, User } from 'lucide-react';
import OutfitCarousel from '../components/OutfitCarousel';
import ShareModal from '../components/ShareModal';
import PhotoGuidelinesModal from '../components/PhotoGuidelinesModal';
import useAppStore from '../store/useAppStore';
import { useOutfitOverlay } from '../hooks/useOutfitOverlay';

const TryOn = () => {
  const navigate = useNavigate();
  const { userPhoto, outfits, currentOutfit, setCurrentOutfit, setUserPhoto } = useAppStore();
  const [displayImage, setDisplayImage] = useState(null);
  const [hasAppliedOutfit, setHasAppliedOutfit] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const fileInputRef = useRef(null);
  const { applyOutfit, isProcessing } = useOutfitOverlay();

  useEffect(() => {
    // Set first outfit as current if none selected
    if (!currentOutfit && outfits.length > 0) {
      setCurrentOutfit(outfits[0]);
    }
  }, [outfits]);

  useEffect(() => {
    // Reset display image when user photo is removed
    if (!userPhoto) {
      setDisplayImage(null);
      setHasAppliedOutfit(false);
    }
  }, [userPhoto]);

  const handleTryOnOutfit = async () => {
    if (currentOutfit && userPhoto) {
      const result = await applyOutfit(currentOutfit);
      if (result) {
        setDisplayImage(result);
        setHasAppliedOutfit(true);
      }
    }
  };

  const handleOutfitSelect = async (outfit) => {
    setCurrentOutfit(outfit);

    // Automatically apply the outfit if user photo is available
    if (userPhoto) {
      try {
        const result = await applyOutfit(outfit);
        if (result) {
          setDisplayImage(result);
          setHasAppliedOutfit(true);
        } else {
          console.error('Failed to apply outfit:', outfit.name);
          alert(`Failed to apply outfit "${outfit.name}". Please try another outfit or check your connection.`);
        }
      } catch (error) {
        console.error('Error applying outfit:', error);
        alert(`Error applying outfit "${outfit.name}": ${error.message}`);
      }
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handlePhotoUpload = () => {
    setShowGuidelines(true);
  };

  const handleChoosePhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUserPhoto(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <section className="min-h-screen gradient-bg py-12 px-4 md:py-20">
        <div className="container mx-auto max-w-7xl">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-6 flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </button>

        <div className="grid lg:grid-cols-[280px_1fr] gap-8 lg:gap-12">
          {/* Left Sidebar - Avatar */}
          <div className="space-y-6">
            <div className="sticky top-8">
              <div className="relative rounded-3xl overflow-hidden bg-white shadow-[var(--shadow-glow)] border-2 border-accent/30 group">
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-[var(--gradient-shine)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-10 animate-shimmer" />

                {/* Avatar Image */}
                <div className="aspect-[3/7] bg-gradient-to-b from-gray-100 to-gray-200 relative">
                  {isProcessing ? (
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Applying outfit...</p>
                      </div>
                    </div>
                  ) : hasAppliedOutfit && displayImage ? (
                    <img
                      src={displayImage}
                      alt="Your avatar with outfit"
                      className="h-full w-full object-cover"
                    />
                  ) : userPhoto ? (
                    <img
                      src={userPhoto}
                      alt="Your photo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <User className="w-24 h-24 mx-auto mb-4 opacity-30" strokeWidth={1} />
                        <p className="text-lg font-medium">No photo uploaded</p>
                        <p className="text-sm mt-2">Upload your photo below</p>
                      </div>
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/50 to-transparent" />

                  {/* Glow Border on Hover */}
                  <div className="absolute inset-0 border-4 border-accent/0 group-hover:border-accent/50 rounded-3xl transition-all duration-300" />
                </div>

                {/* Upload Button Overlay - Only show when no photo uploaded */}
                {!userPhoto && (
                  <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4 z-20">
                    <div className="relative">
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-[var(--gradient-upload)] blur-2xl opacity-90 group-hover:opacity-100 transition-opacity animate-pulse" />

                      <button
                        onClick={handlePhotoUpload}
                        className="w-full relative bg-gradient-to-r from-accent via-secondary-500 to-accent text-white font-bold text-lg py-3 px-4 rounded-xl shadow-lg hover:shadow-[var(--shadow-glow)] transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <Upload className="h-5 w-5" />
                        Upload Your Photo
                      </button>
                    </div>

                    <p className="text-sm text-center text-accent font-medium animate-pulse">
                      ✨ Start your AI fashion experience
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Outfit Grid */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-accent" />
                Try On Outfits
              </h2>
              <p className="text-gray-700 text-lg">
                {userPhoto ? 'Select an outfit and click "Try On" to see it on your photo' : 'Upload your photo first, then select an outfit'}
              </p>
            </div>

            <OutfitCarousel
              outfits={outfits}
              selectedOutfit={currentOutfit}
              onSelectOutfit={handleOutfitSelect}
            />
          </div>
        </div>

        <ShareModal
          imageToShare={displayImage || userPhoto}
          outfitName={currentOutfit?.name}
        />
      </div>
      </section>

      <PhotoGuidelinesModal
        isOpen={showGuidelines}
        onClose={() => setShowGuidelines(false)}
        onChoosePhoto={handleChoosePhoto}
      />
    </>
  );
};

export default TryOn;
