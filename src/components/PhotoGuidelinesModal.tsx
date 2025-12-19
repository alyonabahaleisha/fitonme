import { X, Check } from "lucide-react";
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
  if (!isOpen) return null;

  const rules = [
    "Full body (head to toe)",
    "Front-facing & standing",
    "Good lighting"
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
                  {/* Example label */}
                  <div className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 bg-white text-gray-600 rounded-full px-2 py-0.5 md:px-2.5 md:py-1 shadow-lg text-[10px] md:text-xs font-medium">
                    Example
                  </div>
                </div>
              </div>

              {/* Right: Guidelines Text */}
              <div className="flex flex-col md:order-last">
                {/* Emotional confirmation */}
                <h2 className="text-lg sm:text-xl md:text-2xl font-serif font-semibold text-gray-900 mb-3 sm:mb-4">
                  Let's see how these look on you
                </h2>

                {/* Simple rules - one line each */}
                <div className="space-y-1.5 mb-4 sm:mb-5">
                  {rules.map((rule, index) => (
                    <div key={index} className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm">
                      <Check size={12} className="text-gray-400 flex-shrink-0" />
                      {rule}
                    </div>
                  ))}
                </div>

                {/* Button - the main act */}
                <button
                  onClick={onChoosePhoto}
                  className="w-full py-3 md:py-3.5 px-4 md:px-6 rounded-xl bg-[#2d4a3e] hover:bg-[#243d33] active:bg-[#243d33] text-white font-semibold flex items-center justify-center text-sm md:text-base appearance-none [-webkit-appearance:none] border-none outline-none mb-3"
                >
                  Choose Photo
                </button>

                {/* Privacy whisper */}
                <p className="text-[10px] sm:text-xs text-gray-400 text-center">
                  🔒 Never stored or shared · No signup required
                </p>
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
