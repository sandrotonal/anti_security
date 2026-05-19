import { useState, useEffect } from 'react';

export const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    // Check if user has already made a selection
    const consent = localStorage.getItem('securify_cookie_consent');
    if (!consent) {
      // Delay showing the banner slightly for better UX feel
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('securify_cookie_consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('securify_cookie_consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-4xl z-50 animate-in slide-in-from-bottom-5 duration-500 ease-out select-none">
      <div className="bg-neutral-950/95 backdrop-blur-xl border border-white/5 rounded-2xl p-5 md:p-6 shadow-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Left Side: Info */}
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            <span className="font-mono text-[9px] text-neutral-500 lowercase tracking-wider">
              cookie preference declaration
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 font-light leading-relaxed lowercase max-w-2xl">
            securify uses local browser storage cookies to cache custom cli parameters, scanning configs, and sandbox history entirely offline.
          </p>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          <button
            onClick={handleDecline}
            className="flex-1 md:flex-none px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-white/5 hover:text-white font-mono text-[10px] rounded-lg transition-all lowercase"
          >
            essential only
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 md:flex-none px-5 py-2.5 bg-white hover:bg-neutral-200 text-black font-mono text-[10px] font-medium rounded-lg transition-colors lowercase"
          >
            accept all
          </button>
        </div>

      </div>
    </div>
  );
};
