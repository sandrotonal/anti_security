export const SecurifyHero = () => {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-black select-none">
      {/* Background Video */}
      <video
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

          {/* Description Paragraph */}
          <p className="absolute left-6 md:left-10 top-[46%] max-w-[240px] text-[15px] leading-snug text-white/90 lowercase select-none font-light">
            we can guarding your data with utmost care, empowering you with privacy everywhere
          </p>

          {/* Stat Block - Top Right */}
          <div className="absolute right-6 md:right-24 top-[14%] flex flex-col items-end">
            <div className="flex items-center gap-3 justify-end">
              <div 
                className="hidden md:block h-px w-24 bg-white/40" 
                style={{ transform: 'rotate(20deg)' }}
              />
              <span className="text-4xl md:text-5xl font-medium tracking-tight text-white">+65k</span>
            </div>
            <span className="text-xs md:text-sm text-white/70 mt-1 text-right lowercase font-light">
              startups use
            </span>
          </div>

          {/* Stat Block - Bottom Left */}
          <div className="absolute left-6 md:left-20 bottom-20 md:bottom-24 flex flex-col items-start">
            <div className="flex items-center gap-3">
              <span className="text-4xl md:text-5xl font-medium tracking-tight text-white">+1.5b</span>
              <div 
                className="hidden md:block h-px w-24 bg-white/40" 
                style={{ transform: 'rotate(-20deg)' }}
              />
            </div>
            <span className="text-xs md:text-sm text-white/70 mt-1 lowercase font-light">
              gb data was protected
            </span>
          </div>

          {/* Stat Block - Bottom Right */}
          <div className="absolute right-6 md:right-20 bottom-16 md:bottom-20 flex flex-col items-end">
            <div className="flex items-center gap-3 justify-end">
              <div 
                className="hidden md:block h-px w-24 bg-white/40" 
                style={{ transform: 'rotate(-20deg)' }}
              />
              <span className="text-4xl md:text-5xl font-medium tracking-tight text-white">+300k</span>
            </div>
            <span className="text-xs md:text-sm text-white/70 mt-1 text-right lowercase font-light">
              downloads
            </span>
          </div>

        </main>
      </div>

      {/* Scroll Down Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 animate-bounce select-none pointer-events-none">
        <span className="text-[9px] font-mono text-white/40 tracking-widest lowercase">scroll</span>
        <svg className="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Bottom Gradient Overlay */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-black" />
    </section>
  );
};
