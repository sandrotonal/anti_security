import { useState, useEffect, useRef } from 'react';

interface SecurifyHeroProps {
  onScanSite: (url: string) => void;
}

export const SecurifyHero = ({ onScanSite }: SecurifyHeroProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    // Attempt programmatic play to bypass mobile restrictions on mount
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn("video auto-play blocked by browser settings or battery saver mode:", err);
      });
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onScanSite(urlInput.trim());
    }
  };

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

          {/* Description & Scan Input (Grouped to avoid overlap and ensure clickability) */}
          <div className="absolute left-6 md:left-10 top-[48%] md:top-[50%] max-w-[280px] md:max-w-[400px] pointer-events-auto space-y-4 text-left">
            <p className="text-[13px] md:text-[15px] leading-snug text-white/95 lowercase font-light select-none">
              we can guarding your data with utmost care, empowering you with privacy everywhere. scan your domain instantly.
            </p>
            
            <form onSubmit={handleSubmit} className="flex gap-2 w-full">
              <input
                type="text"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="e.g. example.com"
                className="bg-black/55 border border-white/10 text-white text-xs font-mono rounded-xl px-4 py-3.5 focus:outline-none focus:border-white/20 placeholder-neutral-600 w-full lowercase backdrop-blur-md transition-colors"
              />
              <button
                type="submit"
                disabled={!urlInput.trim()}
                className="bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl px-5 py-3.5 lowercase transition-all select-none disabled:opacity-50 shrink-0"
              >
                scan site
              </button>
            </form>
          </div>

        </main>
      </div>

      {/* Bottom Gradient Overlay */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-black" />
    </section>
  );
};
