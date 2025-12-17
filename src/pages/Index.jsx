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

        {/* Hero Text */}
        <div className="text-center pt-2">
          <h1 className="text-2xl md:text-4xl font-serif font-semibold text-foreground leading-tight tracking-tight">
            See how you could look — right now
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your photo. Try on outfits instantly.
          </p>
        </div>

        {/* Before/After Slider - takes remaining space */}
        <div className="flex-1 flex items-center justify-center py-4 min-h-0">
          <BeforeAfterSlider />
        </div>

        {/* CTA Section */}
        <div className="space-y-3 pb-2" ref={uploadButtonRef}>
          <UploadButton variant="hero" size="default" className="w-full max-w-xs mx-auto" />

          {/* Trust micro-copy */}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>No sign-up</span>
            <span>•</span>
            <span>~1 minute</span>
            <span>•</span>
            <span>Delete anytime</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
