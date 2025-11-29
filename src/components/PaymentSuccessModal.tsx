import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PaymentSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    planName?: string;
}

const PaymentSuccessModal = ({ isOpen, onClose, planName = 'Premium' }: PaymentSuccessModalProps) => {
    useEffect(() => {
        if (isOpen) {
            // Fire confetti
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                });
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-3xl max-w-md w-full p-8 relative shadow-2xl transform transition-all duration-300 scale-100 animate-in fade-in zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={24} />
                    </button>

                    <div className="text-center space-y-6">
                        {/* Success Icon */}
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25" />
                            <Check className="w-10 h-10 text-green-600" strokeWidth={3} />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-serif font-bold text-gray-900">
                                Payment Successful!
                            </h2>
                            <p className="text-gray-600 text-lg">
                                You are now subscribed to the <span className="font-semibold text-brand">{planName}</span> plan.
                            </p>
                        </div>

                        <div className="bg-brand/5 rounded-2xl p-6 border border-brand/10">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Sparkles className="w-5 h-5 text-brand" />
                                <h3 className="font-semibold text-brand">Unlimited Access Unlocked</h3>
                            </div>
                            <p className="text-sm text-gray-600">
                                Start generating unlimited virtual try-ons right away. Your fashion journey begins now!
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-brand text-white rounded-xl font-semibold text-lg hover:bg-brand/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            Start Trying On
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

export default PaymentSuccessModal;
