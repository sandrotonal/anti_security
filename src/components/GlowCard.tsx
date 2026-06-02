import React from 'react';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GlowCard({ children, className = '', onClick }: GlowCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative rounded-2xl overflow-hidden p-[1px] bg-gradient-to-br from-neutral-800/80 via-neutral-900/60 to-black/80 transition-all duration-350 hover:border-neutral-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md ${
        onClick ? 'cursor-pointer select-none active:scale-[0.99]' : ''
      } ${className}`}
    >
      {/* Moving Halo Behind the Inner Content */}
      <div className="absolute w-28 h-28 rounded-full bg-white/[0.03] blur-[22px] pointer-events-none animate-glow-halo z-0" />

      {/* Hover Corner Brackets */}
      <div className="corner-square -left-0.5 -top-0.5 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
      <div className="corner-square -right-0.5 -top-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      <div className="corner-square -left-0.5 -bottom-0.5 group-hover:-translate-x-0.5 group-hover:translate-y-0.5" />
      <div className="corner-square -right-0.5 -bottom-0.5 group-hover:translate-x-0.5 group-hover:translate-y-0.5" />

      {/* Inner Card Content Wrapper */}
      <div className="relative flex flex-col w-full h-full rounded-[15px] border border-white/5 bg-gradient-to-br from-zinc-950/95 to-neutral-900/90 p-6 z-10 overflow-hidden">
        {/* Subtle Rotating Ray Background */}
        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden rounded-[15px] z-0">
          <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.012)_0%,transparent_55%)] animate-rotate-ray" />
        </div>

        {/* Content layer */}
        <div className="relative z-10 w-full h-full flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
