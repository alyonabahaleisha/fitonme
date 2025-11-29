import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useScrollLock } from "../hooks/useScrollLock";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = false,
}: ConfirmationModalProps) => {
    useScrollLock(isOpen);

    if (!isOpen) return null;

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-2xl max-w-sm w-full p-6 relative shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
                    <p className="text-gray-600 mb-6">{message}</p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 px-4 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-white font-medium transition-colors ${isDestructive
                                    ? "bg-red-500 hover:bg-red-600"
                                    : "bg-[#ff6b5a] hover:bg-[#ff5544]"
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

export default ConfirmationModal;
