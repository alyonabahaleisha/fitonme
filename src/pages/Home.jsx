import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-bg">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/30 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-gray-800">AI-Powered Virtual Fitting</span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl md:text-7xl font-display font-bold text-gray-900 leading-tight">
              Level up your look — Instantly.
            </h1>

            {/* Description */}
            <p className="text-xl md:text-2xl text-gray-700 max-w-2xl mx-auto">
              Start Free Try-On to preview styles on your real body.
              Fast, personal, and powered by AI. <span className="font-semibold text-gray-900">50+ premium curated outfits.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button
                onClick={() => navigate('/try-on')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-[var(--shadow-hover)] hover:scale-[1.02] transition-all duration-300"
              >
                Start Trying On
                <ArrowRight className="h-5 w-5" />
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById('how-it-works');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-900 font-bold text-lg rounded-xl border-2 border-gray-300 hover:bg-gray-50 transition-all duration-300"
              >
                How It Works
              </button>
            </div>
          </div>
        </div>

        {/* Decorative gradient blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary-500/20 rounded-full blur-[120px] pointer-events-none animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] pointer-events-none animate-float" style={{ animationDelay: '1s' }} />
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 text-center mb-12">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-200">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload Your Photo</h3>
              <p className="text-gray-600">Choose a full-body photo for the best results</p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-200">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Browse Outfits</h3>
              <p className="text-gray-600">Explore our curated collection of styles</p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-200">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">See Yourself</h3>
              <p className="text-gray-600">Instantly visualize outfits on your body</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-600 text-sm">
        <p>© 2025 GodLovesMe AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
