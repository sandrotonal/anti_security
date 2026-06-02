import { useState, useRef, useEffect } from 'react';

type Section = {
  leftLabel: string;
  title: string;
  rightLabel: string;
  background: string;
};

export function FullScreenScrollFX({ sections }: { sections: Section[] }) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % sections.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [sections.length]);

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-[600px] md:min-h-[750px] bg-black overflow-hidden flex flex-col justify-between py-16 px-4 md:px-12 select-none"
    >
      {/* Background Images — crossfade only, no decorative grid */}
      <div className="absolute inset-0 z-0">
        {sections.map((section, idx) => {
          const isActive = idx === activeIndex;
          return (
            <div
              key={idx}
              className="absolute inset-0 transition-all duration-1000 ease-in-out"
              style={{
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'scale(1.03)' : 'scale(1.08)',
                zIndex: isActive ? 1 : 0
              }}
            >
              <img
                src={section.background}
                alt=""
                className="w-full h-full object-cover brightness-50 contrast-105"
                loading="lazy"
              />
              {/* Vignette — no grid lines */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black" />
            </div>
          );
        })}
      </div>

      {/* Top blend: fades smoothly into the hero video above */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black to-transparent z-20 pointer-events-none" />

      {/* Section tag */}
      <div className="relative z-20 text-center space-y-2 select-none">
        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.25em] block">
          compliance architecture validation
        </span>
        <h3 className="text-white text-xs font-light lowercase tracking-wider">our secure specifications</h3>
      </div>

      {/* Center Titles */}
      <div className="relative z-20 w-full max-w-7xl mx-auto flex flex-col justify-center items-center my-auto py-8">
        <div className="relative w-full min-h-[140px] md:min-h-[180px] flex items-center justify-center">
          {sections.map((section, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={idx}
                className="absolute inset-x-0 text-center transition-all duration-700 ease-out"
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.96)',
                  pointerEvents: isActive ? 'auto' : 'none',
                  zIndex: isActive ? 10 : 0
                }}
              >
                <h2 className="text-3xl md:text-6xl font-light tracking-tight text-white lowercase leading-tight max-w-4xl mx-auto px-4">
                  {section.title}
                </h2>
              </div>
            );
          })}
        </div>

        {/* Desktop tab controls */}
        <div className="hidden md:flex items-center justify-center gap-12 mt-12 w-full max-w-4xl">
          {sections.map((section, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className="flex-1 text-left space-y-3 group outline-none"
              >
                <div className="w-full h-[1px] bg-white/10 relative overflow-hidden">
                  <div
                    className="absolute inset-0 bg-white transition-transform duration-[4500ms] ease-linear origin-left"
                    style={{ transform: isActive ? 'scaleX(1)' : 'scaleX(0)' }}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-neutral-500 block uppercase tracking-wider">
                    0{idx + 1} // {section.leftLabel}
                  </span>
                  <p className={`text-xs transition-colors lowercase font-light ${
                    isActive ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'
                  }`}>
                    {section.rightLabel}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Mobile dot indicators */}
        <div className="flex md:hidden flex-col items-center gap-4 mt-8 w-full">
          <div className="flex items-center justify-center gap-3">
            {sections.map((_, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={`h-1.5 transition-all duration-300 rounded-full ${
                    isActive ? 'w-8 bg-white' : 'w-1.5 bg-neutral-800'
                  }`}
                />
              );
            })}
          </div>
          <div className="text-center space-y-1 px-4 min-h-[45px]">
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block">
              {sections[activeIndex].leftLabel}
            </span>
            <span className="text-[11px] text-neutral-400 font-light lowercase block">
              {sections[activeIndex].rightLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom status pill */}
      <div className="relative z-20 text-center select-none pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/[0.02] text-neutral-500 text-[10px] lowercase font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>locally processed offline. zero server leakage</span>
        </div>
      </div>

      {/* Bottom blend: smooth fade into sections below */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-20 pointer-events-none" />
    </div>
  );
}
