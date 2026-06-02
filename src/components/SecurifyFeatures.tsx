import React, { useRef, useState } from 'react';
import { GlowCard } from './GlowCard';

interface FeatureItem {
  icon: (className?: string) => React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}

export function SecurifyFeatures() {
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const features: FeatureItem[] = [
    {
      icon: (className) => (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z" />
        </svg>
      ),
      title: "zero-knowledge browser sandbox",
      description: "all code scans execute purely client-side inside a secure browser context. your source code and configurations are never uploaded, shared, or exposed to third-party servers.",
      badge: "privacy first"
    },
    {
      icon: (className) => (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      title: "sub-second static analysis",
      description: "hyper-optimized regex engines run static code analysis at lightning speed. locate credentials, API tokens, and secret patterns across thousands of files within milliseconds.",
      badge: "high speed"
    },
    {
      icon: (className) => (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
      ),
      title: "entropy-based key detection",
      description: "utilizes shannon entropy checks to dynamically calculate string complexity. accurately pinpoint actual passwords, private keys, and authorization tokens with minimal false-positives.",
      badge: "smart heuristics"
    },
    {
      icon: (className) => (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
      title: "pre-commit hook automation",
      description: "seamlessly intercept local git workflow commits before they are pushed to remote origins. easy one-command setup ensures zero leaked secrets in your repository histories.",
      badge: "continuous guard"
    },
    {
      icon: (className) => (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      ),
      title: "dynamic security custom rules",
      description: "define customized scanner criteria, scan exclusions, and critical target patterns. tailors target matching logic dynamically to fit your stack's specific security rules.",
      badge: "flexible"
    }
  ];

  // Track active slide on mobile horizontal scroll
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.clientWidth;
    const scrollLeft = scrollRef.current.scrollLeft;
    const index = Math.round(scrollLeft / width);
    if (index !== activeIdx && index >= 0 && index < features.length) {
      setActiveIdx(index);
    }
  };

  const scrollTo = (index: number) => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({
      left: index * width,
      behavior: 'smooth'
    });
    setActiveIdx(index);
  };

  return (
    <section className="relative py-24 px-4 md:px-10 bg-black overflow-hidden select-none">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none opacity-25" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[70%] h-[30%] bg-radial-gradient from-neutral-900/10 to-transparent pointer-events-none blur-[100px]" />

      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/[0.02] text-neutral-400 text-xs lowercase">
              <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
              <span>premium security specifications</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-light tracking-tight text-white lowercase">
              crafted for absolute <br />
              <span className="font-medium text-neutral-400">code verification</span>
            </h2>
          </div>
          <p className="text-sm text-neutral-500 font-light leading-relaxed lowercase max-w-sm md:text-right">
            discover advanced features developed to harden your repositories, prevent developer mistakes, and guarantee compliance.
          </p>
        </div>

        {/* Desktop View Layout (Grid - Visible only on md and larger screens) */}
        <div className="hidden md:grid grid-cols-6 gap-6">
          {features.map((feature, idx) => {
            const isLarge = idx === 0 || idx === 1;
            return (
              <GlowCard key={idx} className={`${isLarge ? 'col-span-3' : 'col-span-2'} h-full min-h-[240px]`}>
                <div className="flex flex-col h-full justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-white">
                        {feature.icon("w-5 h-5")}
                      </div>
                      {feature.badge && (
                        <span className="text-[10px] uppercase tracking-wider text-neutral-500 border border-white/5 bg-white/[0.01] px-2.5 py-0.5 rounded-full">
                          {feature.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-medium text-white lowercase">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-neutral-400 font-light leading-relaxed lowercase">
                      {feature.description}
                    </p>
                  </div>
                  <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent pt-1" />
                </div>
              </GlowCard>
            );
          })}
        </div>

        {/* Mobile View Layout (Swipeable / Slider - Visible only on mobile/tablet) */}
        <div className="block md:hidden space-y-6">
          {/* Snap scroll container */}
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-4 pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {features.map((feature, idx) => {
              const isActive = idx === activeIdx;
              return (
                <div 
                  key={idx} 
                  className="w-full shrink-0 snap-center transition-all duration-500 transform"
                  style={{
                    opacity: isActive ? 1 : 0.4,
                    scale: isActive ? '1' : '0.96'
                  }}
                >
                  <GlowCard className="h-full min-h-[220px] mx-1">
                    <div className="flex flex-col h-full justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-white">
                            {feature.icon("w-5 h-5")}
                          </div>
                          {feature.badge && (
                            <span className="text-[9px] uppercase tracking-wider text-neutral-500 border border-white/5 bg-white/[0.01] px-2.5 py-0.5 rounded-full">
                              {feature.badge}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-semibold text-white lowercase">
                          {feature.title}
                        </h3>
                        <p className="text-xs text-neutral-400 font-light leading-relaxed lowercase">
                          {feature.description}
                        </p>
                      </div>
                      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent pt-1" />
                    </div>
                  </GlowCard>
                </div>
              );
            })}
          </div>

          {/* Interactive Navigation Dots */}
          <div className="flex items-center justify-center gap-2.5 pt-2">
            {features.map((_, idx) => {
              const isActive = idx === activeIdx;
              return (
                <button
                  key={idx}
                  onClick={() => scrollTo(idx)}
                  className={`h-1.5 transition-all duration-300 rounded-full ${
                    isActive ? 'w-6 bg-white' : 'w-1.5 bg-neutral-800'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
