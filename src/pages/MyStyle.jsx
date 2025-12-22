import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, LogOut, Sparkles } from 'lucide-react';
import logo from '../assets/logo.png';
import { useAuth } from '../contexts/AuthContext';
import useAppStore from '../store/useAppStore';
import { Button } from '../components/ui/button';

const MyStyle = () => {
  const navigate = useNavigate();
  const { user, signOut, isAuthenticated } = useAuth();
  const { generatedLooks, favorites } = useAppStore();

  // Get saved looks (generated looks that are in favorites)
  const savedLooks = useMemo(() => {
    return generatedLooks.filter(look => favorites.includes(look.outfitId));
  }, [generatedLooks, favorites]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[hsl(20,25%,92%)] via-[hsl(25,22%,90%)] to-[hsl(30,20%,86%)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {/* Logo + brand name - silent signature */}
          <div className="flex items-center gap-1.5">
            <img
              src={logo}
              alt="ILOVME"
              className="h-5 w-5"
            />
            <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
              ilovme
            </span>
          </div>
          <div className="w-9" /> {/* Spacer for balance */}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {/* Page title */}
        <h1 className="font-serif text-2xl font-semibold text-center">My Style</h1>

        {/* Saved Looks Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Your saved looks
          </h2>

          {savedLooks.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4">
                You haven't saved any looks yet.
              </p>
              <Link to="/try-on">
                <Button className="bg-brand hover:bg-brand/90 text-white rounded-full px-6">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Style new looks
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {savedLooks.map((look) => (
                <div
                  key={look.outfitId}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden bg-white shadow-sm"
                >
                  <img
                    src={look.image}
                    alt={look.outfit?.name || 'Saved look'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <div className="p-1.5 bg-brand rounded-full">
                      <Heart className="w-3.5 h-3.5 text-white fill-white" />
                    </div>
                  </div>
                  {look.outfit?.name && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <p className="text-white text-xs font-medium truncate">
                        {look.outfit.name}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Identity Section */}
        {isAuthenticated && user && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Account
            </h2>
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-foreground">{user.email}</p>
                </div>
              </div>
              <hr className="border-gray-100" />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </section>
        )}

        {/* Not logged in state */}
        {!isAuthenticated && (
          <section>
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <p className="text-gray-600 mb-4">
                Create an account to save your looks permanently.
              </p>
              <Link to="/try-on">
                <Button variant="outline" className="rounded-full px-6">
                  Continue styling
                </Button>
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default MyStyle;
