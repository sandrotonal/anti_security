import { useState } from 'react';

export type ViewType = 'home' | 'rules' | 'dashboard' | 'sandbox' | 'install' | 'contact';

interface NavbarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  onOpenTerminal: () => void;
}

export const SecurifyNavbar = ({ activeView, onViewChange, onOpenTerminal }: NavbarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, targetView: ViewType, anchor?: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    onViewChange(targetView);
    
    if (anchor) {
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleInstallClick = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    onViewChange('install');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header className="fixed z-50 px-4 md:px-10 pt-6 top-0 left-0 right-0 select-none">
        <nav className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          
          {/* Left - Logo (Link to Home) */}
          <a
            href="#home"
            onClick={(e) => handleLinkClick(e, 'home')}
            className="flex items-center gap-2 bg-neutral-900/90 backdrop-blur rounded-full pl-4 pr-6 py-3 border border-white/5 shadow-lg hover:border-white/10 transition-colors"
          >
            <svg viewBox="0 0 256 256" className="h-5 w-5 fill-white" aria-hidden="true">
              <path d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z" />
            </svg>
            <span className="text-white text-sm font-normal tracking-tight">securify</span>
          </a>

          {/* Center Links (Visible on Desktop) */}
          <div className="hidden lg:flex items-center gap-1 bg-neutral-900/90 backdrop-blur rounded-full px-3 py-2 border border-white/5 shadow-lg">
            <a
              href="#platform"
              onClick={(e) => handleLinkClick(e, 'home', 'platform')}
              className={`text-sm px-4 py-2 rounded-full lowercase transition-colors ${
                activeView === 'home' ? 'text-neutral-300 hover:text-white' : 'text-neutral-500 hover:text-white'
              }`}
            >
              sandbox demo
            </a>
            <a
              href="#solutions"
              onClick={(e) => handleLinkClick(e, 'home', 'solutions')}
              className={`text-sm px-4 py-2 rounded-full lowercase transition-colors ${
                activeView === 'home' ? 'text-neutral-300 hover:text-white' : 'text-neutral-500 hover:text-white'
              }`}
            >
              pipeline
            </a>
            <a
              href="#support"
              onClick={(e) => handleLinkClick(e, 'home', 'support')}
              className={`text-sm px-4 py-2 rounded-full lowercase transition-colors ${
                activeView === 'home' ? 'text-neutral-300 hover:text-white' : 'text-neutral-500 hover:text-white'
              }`}
            >
              docs
            </a>
            
            {/* View Links */}
            <div className="w-px h-4 bg-white/10 mx-2" />
            
            <a
              href="#rules"
              onClick={(e) => handleLinkClick(e, 'rules')}
              className={`text-sm px-4 py-2 rounded-full lowercase transition-colors ${
                activeView === 'rules' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
              }`}
            >
              rules
            </a>
            <a
              href="#dashboard"
              onClick={(e) => handleLinkClick(e, 'dashboard')}
              className={`text-sm px-4 py-2 rounded-full lowercase transition-colors ${
                activeView === 'dashboard' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
              }`}
            >
              dashboard
            </a>
            <a
              href="#sandbox"
              onClick={(e) => handleLinkClick(e, 'sandbox')}
              className={`text-sm px-4 py-2 rounded-full lowercase transition-colors ${
                activeView === 'sandbox' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
              }`}
            >
              sandbox scanner
            </a>
            <a
              href="#contact"
              onClick={(e) => handleLinkClick(e, 'contact')}
              className={`text-sm px-4 py-2 rounded-full lowercase transition-colors ${
                activeView === 'contact' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
              }`}
            >
              contact
            </a>
          </div>

          {/* Right Action Button & Mobile Burger */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="hidden md:block text-sm font-normal rounded-full px-6 py-3 transition-colors lowercase border bg-white text-black border-white hover:bg-neutral-200"
            >
              install cli
            </button>
            <button
              onClick={onOpenTerminal}
              className="hidden sm:block bg-neutral-900/90 hover:bg-neutral-800 text-white border border-white/10 text-xs font-mono rounded-full px-4 py-3 lowercase transition-all select-none"
            >
              terminal hook
            </button>
            
            {/* Burger toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex lg:hidden flex-col items-center justify-center bg-neutral-900/90 backdrop-blur border border-white/5 w-11 h-11 rounded-full text-white relative focus:outline-none"
              aria-label="Toggle Menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between relative">
                <span
                  className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 transform origin-center ${
                    isMobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
                  }`}
                />
                <span
                  className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 ${
                    isMobileMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100'
                  }`}
                />
                <span
                  className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 transform origin-center ${
                    isMobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
                  }`}
                />
              </div>
            </button>
          </div>

        </nav>
      </header>

      {/* Mobile Drawer Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/95 backdrop-blur-lg lg:hidden flex flex-col justify-between p-8 pt-28 animate-in fade-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 256 256" className="h-5 w-5 fill-white">
                <path d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z" />
              </svg>
              <span className="text-white text-sm font-normal tracking-tight">securify</span>
            </div>
          </div>

          <nav className="flex flex-col gap-6 my-auto select-none">
            <a
              href="#platform"
              onClick={(e) => handleLinkClick(e, 'home', 'platform')}
              className="text-2xl font-light text-neutral-400 hover:text-white transition-colors lowercase"
            >
              sandbox demo
            </a>
            <a
              href="#solutions"
              onClick={(e) => handleLinkClick(e, 'home', 'solutions')}
              className="text-2xl font-light text-neutral-400 hover:text-white transition-colors lowercase"
            >
              pipeline
            </a>
            
            <div className="h-px bg-white/5 my-2" />

            <a
              href="#rules"
              onClick={(e) => handleLinkClick(e, 'rules')}
              className="text-2xl font-light text-neutral-400 hover:text-white transition-colors lowercase"
            >
              rules
            </a>
            <a
              href="#dashboard"
              onClick={(e) => handleLinkClick(e, 'dashboard')}
              className="text-2xl font-light text-neutral-400 hover:text-white transition-colors lowercase"
            >
              dashboard
            </a>
            <a
              href="#sandbox"
              onClick={(e) => handleLinkClick(e, 'sandbox')}
              className="text-2xl font-light text-neutral-400 hover:text-white transition-colors lowercase"
            >
              sandbox scanner
            </a>
            <a
              href="#contact"
              onClick={(e) => handleLinkClick(e, 'contact')}
              className="text-2xl font-light text-neutral-400 hover:text-white transition-colors lowercase"
            >
              contact
            </a>
          </nav>

          <div className="border-t border-white/5 pt-6 flex flex-col gap-3">
            <button
              onClick={handleInstallClick}
              className="w-full bg-white text-black py-3.5 rounded-full text-sm font-medium transition-colors lowercase"
            >
              install cli
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsMobileMenuOpen(false);
                onOpenTerminal();
              }}
              className="w-full bg-neutral-900 border border-white/10 text-white py-3.5 rounded-full text-sm font-medium transition-colors lowercase font-mono"
            >
              terminal hook
            </button>
            <span className="text-[10px] font-mono text-neutral-600 text-center lowercase mt-1">
              securify cli. open-source and local-first.
            </span>
          </div>
        </div>
      )}
    </>
  );
};
