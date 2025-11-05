import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import FeedbackModal from "./FeedbackModal";

const Navigation = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-accent flex items-center justify-center shadow-md">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="font-serif font-semibold text-2xl text-brand tracking-tight">ILovMe</span>
        </button>

        <div className="flex items-center gap-4 md:gap-6">
          <button
            onClick={() => setShowFeedback(true)}
            className="text-sm font-medium hover:opacity-80 transition-opacity px-4 py-2 rounded-full"
            style={{ color: '#ff6b5a' }}
          >
            Give Feedback
          </button>
        </div>
      </div>

      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
    </nav>
  );
};

export default Navigation;
