import { useEffect, useRef } from 'react';
import type { ViewType } from './SecurifyNavbar';
import { ShinyButton } from './ui/shiny-button';

export const SecurifyHero = ({ onViewChange }: { onViewChange?: (view: ViewType) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Attempt programmatic play to bypass mobile restrictions on mount
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn("video auto-play blocked by browser settings or battery saver mode:", err);
      });
    }
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black select-none">
      {/* Background Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        autoPlay
        loop
        muted
        playsInline
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_063509_7d167302-4fd4-480b-8260-18ab572333d4.mp4"
      />

      {/* Dark Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      {/* Foreground Content Wrapper */}
      <div className="relative h-full w-full z-10 pointer-events-none">
        <main className="h-full w-full max-w-7xl mx-auto relative">
          
          {/* Staggered Headlines */}
          <h1 className="hero-title absolute text-white font-medium text-[14vw] md:text-[13vw] left-4 md:left-10 top-[18%] lowercase select-none">
            protect
          </h1>
          <h1 className="hero-title absolute text-white font-medium text-[14vw] md:text-[13vw] right-4 md:right-10 top-[38%] lowercase select-none">
            your
          </h1>
          <h1 className="hero-title absolute text-white font-medium text-[14vw] md:text-[13vw] left-[18%] md:left-[28%] top-[58%] lowercase select-none">
            data
          </h1>

          {/* Description Paragraph & CTA Buttons Group - Unified and full-width stacked on mobile */}
          <div className="absolute left-6 right-6 md:right-auto md:left-10 bottom-[12%] md:bottom-[16%] md:max-w-sm flex flex-col gap-4 md:gap-5 pointer-events-auto select-none z-20">
            <p className="text-[13px] md:text-[15px] leading-relaxed text-white/90 font-light pointer-events-none lowercase">
              we can guarding your data with utmost care, empowering you with privacy everywhere
            </p>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full">
              <ShinyButton className="w-full md:w-auto justify-center" onClick={() => onViewChange?.('dashboard')}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                start scanning free
              </ShinyButton>
              <button
                onClick={() => {
                  const sim = document.getElementById('platform');
                  if (sim) {
                    sim.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="w-full md:w-auto bg-black/60 hover:bg-neutral-950 border border-white/10 text-white text-xs font-mono font-medium rounded-full py-[0.85rem] px-[1.45rem] lowercase transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md whitespace-nowrap flex items-center justify-center"
              >
                how it works
              </button>
            </div>
          </div>

        </main>
      </div>

      {/* Bottom Gradient Overlay */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-black" />
    </section>
  );
};
