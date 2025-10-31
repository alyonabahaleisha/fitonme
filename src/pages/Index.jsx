import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import HeroModelCanvas from "@/components/HeroModelCanvas";
import PlayfulCarousel from "@/components/PlayfulCarousel";
import UploadButton from "@/components/UploadButton";
import NudgeOverlay from "@/components/NudgeOverlay";
import TrustRow from "@/components/TrustRow";
import HowItWorks from "@/components/HowItWorks";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

import modelBase from "@/assets/model-base.jpg";
import outfit1 from "@/assets/outfit-1.png";
import outfit2 from "@/assets/outfit-2.png";
import outfit3 from "@/assets/outfit-3.png";
import outfit4 from "@/assets/outfit-4.png";
import outfit5 from "@/assets/outfit-5.png";
import outfit6 from "@/assets/outfit-6.png";
import outfit7 from "@/assets/outfit-7.png";
import outfit8 from "@/assets/outfit-8.png";
import outfit9 from "@/assets/outfit-9.png";
import generated1 from "@/assets/generated-1.png";
import generated2 from "@/assets/generated-2.png";
import generated3 from "@/assets/generated-3.png";
import generated4 from "@/assets/generated-4.png";
import generated5 from "@/assets/generated-5.png";
import generated6 from "@/assets/generated-6.png";
import generated7 from "@/assets/generated-7.png";
import generated8 from "@/assets/generated-8.png";
import generated9 from "@/assets/generated-9.png";

const Index = () => {
  const navigate = useNavigate();
  const [selectedOutfit, setSelectedOutfit] = useState();
  const [swapCount, setSwapCount] = useState(0);
  const [showNudge, setShowNudge] = useState(false);
  const [dwellTime, setDwellTime] = useState(0);
  const uploadButtonRef = useRef(null);

  const outfits = [
    { id: "1", image: outfit1, generatedImage: generated1, label: "Look 1" },
    { id: "2", image: outfit2, generatedImage: generated2, label: "Look 2" },
    { id: "3", image: outfit3, generatedImage: generated3, label: "Look 3" },
    { id: "4", image: outfit4, generatedImage: generated4, label: "Look 4" },
    { id: "5", image: outfit5, generatedImage: generated5, label: "Look 5" },
    { id: "6", image: outfit6, generatedImage: generated6, label: "Look 6" },
    { id: "7", image: outfit7, generatedImage: generated7, label: "Look 7" },
    { id: "8", image: outfit8, generatedImage: generated8, label: "Look 8" },
    { id: "9", image: outfit9, generatedImage: generated9, label: "Look 9" },
  ];

  // Track dwell time
  useEffect(() => {
    const interval = setInterval(() => {
      setDwellTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Show nudge after conditions met
  useEffect(() => {
    if ((swapCount >= 8 || dwellTime >= 10) && !showNudge) {
      setShowNudge(true);
    }
  }, [swapCount, dwellTime, showNudge]);

  const handleOutfitSelect = (outfitId) => {
    const outfit = outfits.find(o => o.id === outfitId);
    setSelectedOutfit(outfit?.generatedImage);
    setSwapCount((prev) => prev + 1);
  };

  const handleUploadClick = () => {
    uploadButtonRef.current?.querySelector("button")?.click();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      {/* Hero Section - Balanced Side by Side Layout */}
      <section className="relative pt-20 pb-16 px-4 overflow-hidden bg-gradient-to-b from-[hsl(20,25%,92%)] via-[hsl(25,22%,90%)] to-[hsl(30,20%,86%)]">
        {/* Gradient orbs */}
        <div className="absolute top-20 right-10 w-[500px] h-[500px] bg-gradient-to-br from-brand/12 to-accent/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-[400px] h-[400px] bg-gradient-to-tr from-accent/12 to-brand/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto max-w-6xl relative">
          {/* Mobile: Stacked layout with model above carousel */}
          <div className="lg:hidden space-y-8">
            {/* Text Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-brand/15 to-accent/15 border border-brand/30 backdrop-blur-sm">
                <span className="text-brand text-xs font-medium tracking-wider uppercase">✨ AI-Powered Virtual Fitting</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground leading-tight tracking-tight">
                Try Before You Buy<br className="hidden sm:inline" /> — On You
              </h1>

              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                Watch outfits appear on a real body. Then try them on your own photo in seconds.
              </p>

              <div className="flex flex-col sm:flex-row gap-3" ref={uploadButtonRef}>
                <UploadButton variant="hero" size="default" />
                <Button variant="secondary" size="default" onClick={() => navigate('/try-on')}>
                  Browse Outfits
                </Button>
              </div>

              <p className="text-xs text-muted-foreground flex items-center gap-2">
                🔒 Your photo is processed securely. Delete anytime.
              </p>
            </div>

            {/* Model Image */}
            <div className="relative flex justify-center mb-16">
              <div className="w-full max-w-sm">
                <HeroModelCanvas
                  modelImage={modelBase}
                  appliedOutfitImage={selectedOutfit}
                  alt="Fashion model"
                />
                
                {showNudge && (
                  <NudgeOverlay
                    onClose={() => setShowNudge(false)}
                    onUpload={handleUploadClick}
                  />
                )}
              </div>
            </div>

            {/* Carousel */}
            <div className="pt-12">
              <PlayfulCarousel
                outfits={outfits}
                autoPlayMs={1000}
                onSelect={handleOutfitSelect}
              />
            </div>
          </div>

          {/* Desktop: Side by side layout */}
          <div className="hidden lg:grid lg:grid-cols-[2fr,3fr] gap-16 items-start">
            {/* Left: Model Image */}
            <div className="relative flex justify-end pt-8">
              <div className="w-full max-w-sm">
                <HeroModelCanvas
                  modelImage={modelBase}
                  appliedOutfitImage={selectedOutfit}
                  alt="Fashion model"
                />
                
                {showNudge && (
                  <NudgeOverlay
                    onClose={() => setShowNudge(false)}
                    onUpload={handleUploadClick}
                  />
                )}
              </div>
            </div>

            {/* Right: Text Content + Carousel */}
            <div>
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-brand/15 to-accent/15 border border-brand/30 backdrop-blur-sm">
                  <span className="text-brand text-xs font-medium tracking-wider uppercase">✨ AI-Powered Virtual Fitting</span>
                </div>

                <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-foreground leading-tight tracking-tight">
                  Try Before You Buy<br /> — On You
                </h1>

                <p className="text-base md:text-lg text-muted-foreground max-w-lg leading-relaxed">
                  Watch outfits appear on a real body. Then try them on your own photo in seconds.
                </p>

                <div className="flex flex-col sm:flex-row gap-3" ref={uploadButtonRef}>
                  <UploadButton variant="hero" size="default" />
                  <Button variant="secondary" size="default" onClick={() => navigate('/try-on')}>
                    Browse Outfits
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  🔒 Your photo is processed securely. Delete anytime.
                </p>
              </div>

              <div className="pt-12">
                <PlayfulCarousel
                  outfits={outfits}
                  autoPlayMs={1000}
                  onSelect={handleOutfitSelect}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <TrustRow />
      <HowItWorks />

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-accent flex items-center justify-center shadow-md">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="font-serif font-semibold text-2xl text-brand tracking-tight">ILovMe</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2025 ILovMe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
