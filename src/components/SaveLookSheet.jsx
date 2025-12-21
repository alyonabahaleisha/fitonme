import { useState } from 'react';
import { X, Mail, User, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const SaveLookSheet = ({
  isOpen,
  onClose,
  onEmailSubmit,
  onSaveToProfile,
  isAuthenticated = false,
  isSending = false,
}) => {
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleEmailClick = () => {
    setShowEmailInput(true);
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email');
      return;
    }

    setEmailError('');
    onEmailSubmit?.(email);
  };

  const handleClose = () => {
    setShowEmailInput(false);
    setEmail('');
    setEmailError('');
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-50 animate-fade-in"
        onClick={handleClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
        <div className="bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          <div className="px-6 pb-8 pt-2">
            {!showEmailInput ? (
              /* Main options view */
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-serif font-semibold text-foreground mb-1">
                    Want to keep this look?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    We can save it so you can come back to it anytime.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Email option */}
                  <Button
                    onClick={handleEmailClick}
                    variant="outline"
                    className="w-full py-6 text-base font-medium rounded-2xl border-2 hover:bg-gray-50 justify-start px-5"
                  >
                    <Mail className="w-5 h-5 mr-3 text-brand" />
                    Email it to me
                  </Button>

                  {/* Save to profile option */}
                  <Button
                    onClick={onSaveToProfile}
                    variant="outline"
                    className="w-full py-6 text-base font-medium rounded-2xl border-2 hover:bg-gray-50 justify-start px-5"
                  >
                    <User className="w-5 h-5 mr-3 text-brand" />
                    Save to my profile
                  </Button>

                  {/* Not now */}
                  <button
                    onClick={handleClose}
                    className="w-full py-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </>
            ) : (
              /* Email input view */
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-serif font-semibold text-foreground mb-1">
                    Where should we send your look?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    We'll email it to you so you never lose it.
                  </p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      className={`w-full py-6 text-base rounded-2xl ${
                        emailError ? 'border-red-500 focus:ring-red-500' : ''
                      }`}
                      autoFocus
                      disabled={isSending}
                    />
                    {emailError && (
                      <p className="text-sm text-red-500 mt-1 ml-1">{emailError}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSending || !email.trim()}
                    className="w-full py-6 text-base font-semibold rounded-2xl bg-brand hover:bg-brand/90"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send my look'
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setShowEmailInput(false)}
                    className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SaveLookSheet;
