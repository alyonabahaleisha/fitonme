import { useState } from "react";
import { X, Check, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import photoReference from "@/assets/model-base.jpg";

import { useScrollLock } from "../hooks/useScrollLock";

interface PhotoGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChoosePhoto: () => void;
}

const PhotoGuidelinesModal = ({ isOpen, onClose, onChoosePhoto }: PhotoGuidelinesModalProps) => {
  useScrollLock(isOpen);
  const [showTips, setShowTips] = useState(false);

  if (!isOpen) return null;

  const mainGuidelines = [
    {
      title: "Full body visible",
      description: "Head to toe in frame"
    },
    {
      title: "Front-facing & straight",
      description: "Stand straight, facing the camera"
    },
    {
      title: "Good lighting",
      description: "A clear, well-lit photo works best"
    }
  ];

  const extraTips = [
    "Fitted clothing works best for accurate results",
    "Avoid oversized clothes if possible",
    "Plain backgrounds help the AI focus on you"
  ];

  return (
    createPortal(
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-3 overflow-y-auto">
          <div
            className="bg-[#f5f0eb] rounded-xl sm:rounded-2xl md:rounded-3xl max-w-3xl w-full p-3 sm:p-5 md:p-8 relative shadow-2xl my-auto max-h-[94vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-6 md:right-6 text-gray-600 hover:text-gray-900 transition-colors z-10"
            >
              <X size={16} className="sm:w-[18px] sm:h-[18px] md:w-6 md:h-6" />
            </button>

            {/* Content Grid */}
            <div className="flex flex-col md:grid md:grid-cols-2 gap-2 sm:gap-3 md:gap-8">
              {/* Left: Reference Image */}
              <div className="flex items-center justify-center md:order-first">
                <div className="relative w-full max-w-[140px] sm:max-w-[180px] md:max-w-[280px]">
                  <div className="rounded-xl md:rounded-2xl overflow-hidden bg-white shadow-lg">
                    <img
                      src={photoReference}
                      alt="Reference photo example"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                  {/* Green checkmark badge */}
                  <div className="absolute -top-1.5 -right-1.5 md:-top-3 md:-right-3 bg-green-500 text-white rounded-full p-1 md:p-2 shadow-lg">
                    <Check size={12} className="md:w-5 md:h-5" />
                  </div>
                </div>
              </div>

              {/* Right: Guidelines Text */}
              <div className="flex flex-col md:order-last">
                {/* Emotional confirmation */}
                <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-semibold text-gray-900 mb-1 sm:mb-2">
                  Let's see how these look on you
                </h2>

                {/* Subtitle */}
                <p className="text-gray-600 text-xs sm:text-sm md:text-base mb-3 sm:mb-4 md:mb-6">
                  For best results:
                </p>

                {/* Main guidelines - just 3 */}
                <div className="space-y-2 sm:space-y-3 md:space-y-4 mb-3 sm:mb-4">
                  {mainGuidelines.map((guideline, index) => (
                    <div key={index} className="flex gap-2 sm:gap-3 md:gap-4">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-brand/10 flex items-center justify-center">
                          <Check size={10} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-brand" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-gray-900 font-medium text-sm sm:text-base md:text-lg mb-0.5">
                          {guideline.title}
                        </h3>
                        <p className="text-gray-600 text-xs sm:text-sm leading-snug">
                          {guideline.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Expandable tips */}
                <button
                  onClick={() => setShowTips(!showTips)}
                  className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 hover:text-gray-700 mb-3 sm:mb-4"
                >
                  <ChevronDown size={14} className={`transition-transform ${showTips ? 'rotate-180' : ''}`} />
                  More tips for better accuracy
                </button>

                {showTips && (
                  <div className="mb-3 sm:mb-4 pl-2 border-l-2 border-gray-200 space-y-1.5">
                    {extraTips.map((tip, index) => (
                      <p key={index} className="text-xs sm:text-sm text-gray-500">
                        {tip}
                      </p>
                    ))}
                  </div>
                )}

                {/* Privacy reassurance */}
                <p className="text-xs text-gray-400 mb-3 sm:mb-4 flex items-center gap-1.5">
                  <span>🔒</span>
                  Your photo is only used to generate outfits — never stored or shared
                </p>

                {/* Button */}
                <div className="mt-auto">
                  <button
                    onClick={() => {
                      onChoosePhoto();
                      onClose();
                    }}
                    className="w-full py-2.5 md:py-3 px-4 md:px-6 rounded-xl bg-[#2d4a3e] hover:bg-[#243d33] active:bg-[#243d33] text-white font-semibold flex items-center justify-center gap-2 text-sm md:text-base appearance-none [-webkit-appearance:none] border-none outline-none"
                  >
                    Choose Photo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>,
      document.body
    )
  );
};

export default PhotoGuidelinesModal;
