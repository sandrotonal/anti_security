export const SecurifyHero = () => {
  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-black select-none flex flex-col justify-center">
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
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />

      {/* Foreground Content Wrapper */}
      <div className="relative h-full w-full z-10 pointer-events-none px-6 md:px-12 py-20 flex-1 flex flex-col justify-between">
        
        {/* Spacer for navbar padding on mobile */}
        <div className="h-16 shrink-0" />

        {/* Mobile Layout (Stacked columns, centered, visible only on small screens) */}
        <div className="flex flex-col items-center justify-center flex-1 md:hidden text-center space-y-6">
          <h1 className="hero-title text-white font-medium text-6xl lowercase select-none leading-none">
            protect <br /> your <br /> data.
          </h1>
          <p className="max-w-[280px] text-sm leading-relaxed text-white/80 lowercase select-none font-light mx-auto">
            we can guarding your data with utmost care, empowering you with privacy everywhere.
          </p>
          
          {/* Quick stats on mobile - clean grid */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/10 w-full max-w-sm">
            <div className="text-center">
              <span className="block text-xl font-medium text-white font-mono">+65k</span>
              <span className="text-[9px] text-white/60 lowercase font-light">startups</span>
            </div>
            <div className="text-center">
              <span className="block text-xl font-medium text-white font-mono">+1.5b</span>
              <span className="text-[9px] text-white/60 lowercase font-light">gb protected</span>
            </div>
            <div className="text-center">
              <span className="block text-xl font-medium text-white font-mono">+300k</span>
              <span className="text-[9px] text-white/60 lowercase font-light">downloads</span>
            </div>
          </div>
        </div>

        {/* Desktop Staggered Layout (Visible only on md and larger screens) */}
        <div className="hidden md:block relative flex-1 max-w-7xl mx-auto w-full">
          {/* Staggered Headlines */}
          <h1 className="hero-title absolute text-white font-medium text-[13vw] left-10 top-[18%] lowercase select-none">
            protect
          </h1>
          <h1 className="hero-title absolute text-white font-medium text-[13vw] right-10 top-[38%] lowercase select-none">
            your
          </h1>
          <h1 className="hero-title absolute text-white font-medium text-[13vw] left-[28%] top-[58%] lowercase select-none">
            data
          </h1>

          {/* Description Paragraph */}
          <p className="absolute left-10 top-[46%] max-w-[240px] text-[15px] leading-snug text-white/90 lowercase select-none font-light">
            we can guarding your data with utmost care, empowering you with privacy everywhere
          </p>

          {/* Stat Block - Top Right */}
          <div className="absolute right-24 top-[14%] flex flex-col items-end">
            <div className="flex items-center gap-3 justify-end">
              <div 
                className="h-px w-24 bg-white/40" 
                style={{ transform: 'rotate(20deg)' }}
              />
              <span className="text-5xl font-medium tracking-tight text-white">+65k</span>
            </div>
            <span className="text-sm text-white/70 mt-1 text-right lowercase font-light">
              startups use
            </span>
          </div>

          {/* Stat Block - Bottom Left */}
          <div className="absolute left-20 bottom-24 flex flex-col items-start">
            <div className="flex items-center gap-3">
              <span className="text-5xl font-medium tracking-tight text-white">+1.5b</span>
              <div 
                className="h-px w-24 bg-white/40" 
                style={{ transform: 'rotate(-20deg)' }}
              />
            </div>
            <span className="text-sm text-white/70 mt-1 lowercase font-light">
              gb data was protected
            </span>
          </div>

          {/* Stat Block - Bottom Right */}
          <div className="absolute right-20 bottom-20 flex flex-col items-end">
            <div className="flex items-center gap-3 justify-end">
              <div 
                className="h-px w-24 bg-white/40" 
                style={{ transform: 'rotate(-20deg)' }}
              />
              <span className="text-5xl font-medium tracking-tight text-white">+300k</span>
            </div>
            <span className="text-sm text-white/70 mt-1 text-right lowercase font-light">
              downloads
            </span>
          </div>
        </div>

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
