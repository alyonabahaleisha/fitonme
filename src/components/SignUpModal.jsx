import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Mail, Lock, CheckCircle } from 'lucide-react';
import { signInWithGoogle, signInWithMagicLink } from '../lib/supabase';
import { useScrollLock } from "../hooks/useScrollLock";

const SignUpModal = ({ isOpen, onClose, onShowPricing, tryOnsUsed }) => {
  useScrollLock(isOpen);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      // Redirect happens automatically via OAuth flow
    } catch (err) {
      console.error('Error signing in with Google:', err);
      setError('Failed to sign in with Google. Please try again.');
      setIsLoading(false);
    }
  };

  const handleMagicLinkSignIn = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await signInWithMagicLink(email);
      setMagicLinkSent(true);
    } catch (err) {
      console.error('Error sending magic link:', err);
      setError('Failed to send magic link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPricing = () => {
    onClose();
    onShowPricing?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative bg-[#e8e0d5] rounded-3xl shadow-2xl max-w-md w-full p-8">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>

          {!magicLinkSent ? (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-accent via-secondary-500 to-accent mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">
                  {tryOnsUsed >= 2 ? "You've Used Your Free Try-Ons!" : "Unlock Your Style Journey"}
                </h2>
                <p className="text-gray-600">
                  {tryOnsUsed >= 2
                    ? `You've tried ${tryOnsUsed} outfits. Sign up to continue your fashion journey!`
                    : "Sign up to save your favorite looks and get personalized recommendations."}
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-3 mb-6 bg-white/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">
                    <strong>Unlimited AI try-ons</strong> with premium plans
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">
                    <strong>Save your favorite looks</strong> to view anytime
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">
                    <strong>HD quality renders</strong> for the best results
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">
                    <strong>New looks added weekly</strong> to keep your style fresh
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Sign In Options */}
              <div className="space-y-3 mb-6">
                {/* Google Sign In */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-4 rounded-xl border-2 border-gray-300 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {isLoading ? 'Signing in...' : 'Continue with Google'}
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[#e8e0d5] text-gray-500">or</span>
                  </div>
                </div>

                {/* Magic Link Email */}
                <form onSubmit={handleMagicLinkSignIn} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-300 focus:border-accent focus:outline-none transition-colors"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full bg-gradient-to-r from-accent via-secondary-500 to-accent text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Lock className="w-5 h-5" />
                    {isLoading ? 'Sending...' : 'Send Magic Link'}
                  </button>
                </form>
              </div>

              {/* View Pricing Link */}
              <div className="text-center">
                <button
                  onClick={handleViewPricing}
                  className="text-sm text-gray-600 hover:text-accent font-medium transition-colors"
                >
                  View pricing plans →
                </button>
              </div>

              {/* Privacy Note */}
              <p className="text-xs text-gray-500 text-center mt-6">
                By signing up, you agree to our Terms of Service and Privacy Policy.
                We'll never share your data.
              </p>
            </>
          ) : (
            /* Magic Link Sent Success State */
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
                Check Your Email!
              </h2>
              <p className="text-gray-600 mb-6">
                We've sent a magic link to <strong>{email}</strong>
              </p>
              <div className="bg-white/50 rounded-xl p-4 mb-6 text-left">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Next steps:</strong>
                </p>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Open the email from FitOnMe</li>
                  <li>Click the magic link to sign in</li>
                  <li>You'll be redirected back automatically</li>
                </ol>
              </div>
              <button
                onClick={() => {
                  setMagicLinkSent(false);
                  setEmail('');
                }}
                className="text-sm text-gray-600 hover:text-accent font-medium transition-colors"
              >
                ← Back to sign up options
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SignUpModal;
