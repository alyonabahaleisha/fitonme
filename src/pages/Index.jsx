import { useRef } from 'react';

import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import UploadButton from '@/components/UploadButton';

const Index = () => {
  const uploadButtonRef = useRef(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section - Clean, focused, mobile-first */}
      <section className="relative min-h-screen flex flex-col justify-center px-4 py-12 overflow-hidden bg-gradient-to-b from-[hsl(20,25%,92%)] via-[hsl(25,22%,90%)] to-[hsl(30,20%,86%)]">
        {/* Subtle gradient orbs */}
        <div className="absolute top-20 right-10 w-[400px] h-[400px] bg-gradient-to-br from-brand/8 to-accent/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-[300px] h-[300px] bg-gradient-to-tr from-accent/8 to-brand/6 rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto max-w-lg relative">
          {/* Mobile-first stacked layout */}
          <div className="flex flex-col items-center text-center space-y-8">
            {/* Hero Text */}
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground leading-tight tracking-tight">
                See how you could look — right now
              </h1>
              <p className="text-base text-muted-foreground max-w-sm mx-auto">
                Upload your photo. Try on outfits instantly.
              </p>
            </div>

            {/* Before/After Slider */}
            <div className="w-full">
              <BeforeAfterSlider />
            </div>

            {/* CTA Section */}
            <div className="w-full space-y-4" ref={uploadButtonRef}>
              <UploadButton variant="hero" size="default" className="w-full max-w-xs mx-auto" />

              {/* Trust micro-copy */}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>No sign-up required</span>
                <span className="hidden sm:inline">•</span>
                <span>Takes ~1 minute</span>
                <span className="hidden sm:inline">•</span>
                <span>Delete anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
