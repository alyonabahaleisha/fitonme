import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Menu, X } from 'lucide-react';

const MinimalNav = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand to-accent flex items-center justify-center shadow-md">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-serif font-semibold text-xl text-brand tracking-tight">ILovMe</span>
          </button>

          {/* Menu button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 text-foreground/70 hover:text-foreground transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Fullscreen menu overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="container mx-auto px-4">
            {/* Header */}
            <div className="h-14 flex items-center justify-between">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/');
                }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand to-accent flex items-center justify-center shadow-md">
                  <Heart className="w-4 h-4 text-white fill-white" />
                </div>
                <span className="font-serif font-semibold text-xl text-brand tracking-tight">ILovMe</span>
              </button>

              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 text-foreground/70 hover:text-foreground transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu items */}
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  // Could link to about page or section
                }}
                className="text-2xl font-serif text-foreground hover:text-brand transition-colors"
              >
                About
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  window.location.href = 'mailto:hello@ilovme.ai';
                }}
                className="text-2xl font-serif text-foreground hover:text-brand transition-colors"
              >
                Contact
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/legal/privacy');
                }}
                className="text-2xl font-serif text-foreground hover:text-brand transition-colors"
              >
                Privacy
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/legal/terms');
                }}
                className="text-2xl font-serif text-foreground hover:text-brand transition-colors"
              >
                Terms
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MinimalNav;
