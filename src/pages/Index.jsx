import { useRef } from 'react';

import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import UploadButton from '@/components/UploadButton';

const Index = () => {
  const uploadButtonRef = useRef(null);

  return (
    <div className="h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Hero Section - Clean, focused, mobile-first */}
      <section className="relative h-full flex flex-col justify-between px-4 py-6 overflow-hidden bg-gradient-to-b from-[hsl(20,25%,92%)] via-[hsl(25,22%,90%)] to-[hsl(30,20%,86%)]">
        {/* Subtle gradient orbs */}
        <div className="absolute top-20 right-10 w-[400px] h-[400px] bg-gradient-to-br from-brand/8 to-accent/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-[300px] h-[300px] bg-gradient-to-tr from-accent/8 to-brand/6 rounded-full blur-[100px] pointer-events-none" />

        {/* Simple wordmark logo */}
        <div className="text-center pt-1">
          <span className="text-sm font-medium tracking-widest text-foreground/50 uppercase">
            ilovme
          </span>
        </div>

        {/* Hero Text */}
        <div className="text-center -mt-2">
          <h1 className="text-2xl md:text-4xl font-serif font-semibold text-[#2B2B2B] leading-tight tracking-tight">
            See how you could look — right now
          </h1>
          <p className="text-sm text-foreground/60 mt-2">
            Real outfits. On your photo. In seconds.
          </p>
        </div>

        {/* Before/After Slider - takes remaining space */}
        <div className="flex-1 flex items-center justify-center py-4 min-h-0">
          <BeforeAfterSlider />
        </div>

        {/* CTA Section */}
        <div className="space-y-3 pb-2 flex flex-col items-center" ref={uploadButtonRef}>
          <UploadButton variant="hero" size="default" className="w-full max-w-xs" />

          {/* Value proposition */}
          <p className="text-center text-sm text-foreground/80">
            You'll get 7 personalized outfit looks instantly
          </p>

          {/* Trust & safety */}
          <p className="text-center text-xs text-muted-foreground">
            Your photo is never shared · Safe · Private
          </p>
        </div>
      </section>
    </div>
  );
};

export default Index;
