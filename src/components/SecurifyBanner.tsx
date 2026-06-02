import { useState, useEffect } from 'react';

interface SecurifyBannerProps {
  onViewChange: (view: 'sandbox' | 'install' | 'pricing' | 'auditor') => void;
}

export function SecurifyBanner({ onViewChange }: SecurifyBannerProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check if user dismissed the banner in this session
    const dismissed = sessionStorage.getItem('securify_banner_dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }
    // Entrance animation delay
    const timer = setTimeout(() => setIsVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('securify_banner_dismissed', '1');
    setTimeout(() => setIsDismissed(true), 300);
  };

  if (isDismissed) return null;

  return (
    <div
      role="banner"
      aria-label="Product announcement"
      className={`
        fixed top-0 left-0 right-0 z-[60]
        transition-all duration-500 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
      `}
    >
      {/* Thin announcement strip */}
      <div className="bg-neutral-950 border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-2.5 flex items-center justify-between gap-4">

          {/* Left: Icon + message */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Animated pulse dot */}
            <span className="relative flex-shrink-0">
              <span className="absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>

            <p className="text-[11px] text-neutral-400 font-mono lowercase truncate">
              <span className="text-white font-medium">new:</span>
              {' '}github actions integration is now live —{' '}
              <span className="hidden sm:inline">scan pull requests automatically on every push.</span>
            </p>
          </div>

          {/* Center: CTA */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <button
              id="banner-cta-install"
              onClick={() => {
                onViewChange('install');
                handleDismiss();
              }}
              className="text-[10px] font-mono lowercase text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-full px-3 py-1 transition-all duration-200 whitespace-nowrap"
              aria-label="View installation guide"
            >
              view setup guide →
            </button>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="text-neutral-600 hover:text-neutral-300 transition-colors flex-shrink-0"
              aria-label="Dismiss announcement"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
