import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import { trackCheckoutCompleted } from '../services/analytics';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refreshUserData, userData, user } = useAuth();
    const [countdown, setCountdown] = useState(10);
    const [hasTrackedPurchase, setHasTrackedPurchase] = useState(false);

    // Track purchase conversion when userData is loaded
    useEffect(() => {
        if (userData && user && !hasTrackedPurchase) {
            const planType = userData.plan_type || 'unknown';
            trackCheckoutCompleted(planType, null, null, user.id);
            setHasTrackedPurchase(true);
            console.log('[Analytics] Purchase tracked:', planType);
        }
    }, [userData, user, hasTrackedPurchase]);

    useEffect(() => {
        const sessionId = searchParams.get('session_id');

        if (sessionId) {
            // Refresh user data to ensure subscription status is up to date
            refreshUserData();

            // Fire confetti
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min, max) => Math.random() * (max - min) + min;

            const interval = setInterval(function () {
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
        } else {
            // If no session_id, redirect to home
            navigate('/');
        }
    }, [searchParams, refreshUserData, navigate]);

    // Auto-redirect countdown
    //   useEffect(() => {
    //     const timer = setInterval(() => {
    //       setCountdown((prev) => {
    //         if (prev <= 1) {
    //           clearInterval(timer);
    //           navigate('/try-on');
    //           return 0;
    //         }
    //         return prev - 1;
    //       });
    //     }, 1000);
    //     return () => clearInterval(timer);
    //   }, [navigate]);

    const planName = userData?.plan_type === 'weekly' ? 'Weekly'
        : userData?.plan_type === 'monthly' ? 'Monthly'
            : userData?.plan_type === 'annual' ? 'Annual'
                : 'Premium';

    return (
        <>
            <Navigation />
            <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
                <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                    <div className="p-8 md:p-12 text-center space-y-8">

                        {/* Success Icon with Pulse Effect */}
                        <div className="relative w-24 h-24 mx-auto">
                            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25" />
                            <div className="relative bg-green-100 rounded-full w-full h-full flex items-center justify-center">
                                <Check className="w-12 h-12 text-green-600" strokeWidth={3} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900">
                                You're In!
                            </h1>
                            <p className="text-xl text-gray-600 max-w-lg mx-auto">
                                Payment successful. You are now subscribed to the <span className="font-semibold text-brand">{planName}</span> plan.
                            </p>
                        </div>

                        {/* Feature Highlight Card */}
                        <div className="bg-gradient-to-br from-brand/5 to-accent/5 rounded-2xl p-8 border border-brand/10">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <Sparkles className="w-6 h-6 text-brand" />
                                <h3 className="text-xl font-semibold text-brand">Unlimited Access Unlocked</h3>
                            </div>
                            <p className="text-gray-600">
                                Your account has been upgraded. You can now generate unlimited virtual try-ons and access all premium features.
                            </p>
                        </div>

                        {/* Action Button */}
                        <div className="pt-4">
                            <button
                                onClick={() => navigate('/try-on')}
                                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand text-white rounded-full font-semibold text-lg hover:bg-brand/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 w-full md:w-auto"
                            >
                                Start Trying On
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            {/* <p className="text-sm text-gray-400 mt-4">
                Redirecting in {countdown}s...
              </p> */}
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
};

export default PaymentSuccess;
