import { useRef } from 'react';

import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import UploadButton from '@/components/UploadButton';
import logoHeart from '@/assets/logo.png';

const Index = () => {
  const uploadButtonRef = useRef(null);

  return (
    <div className="h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Hero Section - Clean, focused, mobile-first */}
      <section className="relative h-full flex flex-col justify-between px-4 py-6 overflow-hidden bg-gradient-to-b from-[hsl(20,25%,92%)] via-[hsl(25,22%,90%)] to-[hsl(30,20%,86%)]">
        {/* Subtle gradient orbs */}
        <div className="absolute top-20 right-10 w-[400px] h-[400px] bg-gradient-to-br from-brand/8 to-accent/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-[300px] h-[300px] bg-gradient-to-tr from-accent/8 to-brand/6 rounded-full blur-[100px] pointer-events-none" />

        {/* Logo with heart icon */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <img src={logoHeart} alt="ILovMe" className="w-7 h-7" />
          <span className="text-base font-semibold tracking-widest text-[#2B2B2B] uppercase">
            ilovme
          </span>
        </div>

        {/* Hero Text - tight connection between brand and headline */}
        <div className="text-center">
          <h1 className="text-2xl md:text-4xl font-serif font-semibold text-[#1a1a1a] leading-tight tracking-tight">
            See how you could look — right now
          </h1>
          <p className="text-sm font-medium text-foreground/70 mt-3">
            Real outfits. On your photo. In seconds.
          </p>
        </div>

        {/* Before/After Slider - largest spacing above, creates anticipation */}
        <div className="flex-1 flex items-center justify-center mt-5 mb-2 min-h-0 relative">
          {/* Subtle darkened backdrop behind slider */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[85%] bg-black/[0.03] blur-3xl rounded-full pointer-events-none" />
          <BeforeAfterSlider />
        </div>

        {/* CTA Section - small pause before action */}
        <div className="pb-2 flex flex-col items-center [--tw-gradient-from:transparent] [--tw-gradient-to:transparent] [--tw-gradient-stops:transparent] pt-3" ref={uploadButtonRef}>
          <UploadButton variant="hero" size="default" className="w-full max-w-[260px]" />

          {/* Value proposition - medium spacing */}
          <p className="text-center text-sm text-foreground/80 mt-3">
            You'll get 7 personalized outfit looks instantly
          </p>

          {/* Trust & safety - tight whisper under action */}
          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 mt-1.5">
            <span className="text-sm">🔒</span>
            Your photo is never shared · Safe · Private
          </p>
        </div>
      </section>
    </div>
  );
};

export default Index;
