import { useState, useEffect } from 'react';

export type ViewType = 'home' | 'rules' | 'dashboard' | 'analytics' | 'integrations' | 'sandbox' | 'install' | 'contact' | 'auditor' | 'pricing';

interface NavbarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  onOpenTerminal: () => void;
  githubUser: { username: string; avatarUrl: string; token?: string } | null;
  onGithubLogin: () => void;
  onGithubLogout: () => void;
  premiumStatus?: { valid: boolean; email?: string; plan?: string; expiresAt?: number } | null;
  onRestoreSubscription?: () => void;
}

const UserAvatar = ({ username, avatarUrl, sizeClass = "w-7 h-7" }: { username: string; avatarUrl: string; sizeClass?: string }) => {
  const [imgSrc, setImgSrc] = useState<string>(avatarUrl);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(avatarUrl);
    setHasError(false);
  }, [avatarUrl, username]);

  if (hasError || !imgSrc) {
    const initial = username.charAt(0).toUpperCase();
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 flex items-center justify-center font-mono text-white text-[10px] font-bold select-none uppercase`}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={username}
      onError={() => {
        const directUrl = `https://avatars.githubusercontent.com/${username}`;
        if (imgSrc !== directUrl) {
          setImgSrc(directUrl);
        } else {
          setHasError(true);
        }
      }}
      className={`${sizeClass} rounded-full border border-white/20 object-cover`}
    />
  );
};

export const SecurifyNavbar = ({
  activeView,
  onViewChange,
  onOpenTerminal,
  githubUser,
  onGithubLogin,
  onGithubLogout,
  premiumStatus,
  onRestoreSubscription
}: NavbarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClose = () => setIsDropdownOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [isDropdownOpen]);

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
            <svg viewBox="0 0 256 256" fill="currentColor" className="h-5 w-5 text-white" aria-hidden="true">
              <path d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z" />
            </svg>
            <span className="text-white text-sm font-normal tracking-tight">securify</span>
          </a>

          {/* Center Links (Visible on Desktop) */}
          <div className="hidden lg:flex items-center gap-1 bg-neutral-900/90 backdrop-blur rounded-full px-3 py-2 border border-white/5 shadow-lg">
            <a
              href="#platform"
              onClick={(e) => handleLinkClick(e, 'home', 'platform')}
              className={`text-sm px-4 py-2 rounded-full lowercase transition-colors ${activeView === 'home' ? 'text-neutral-300 hover:text-white' : 'text-neutral-500 hover:text-white'
                }`}
            >
              sandbox demo
            </a>
            <a
              href="#solutions"
              onClick={(e) => handleLinkClick(e, 'home', 'solutions')}
              className={`text-sm px-4 py-2 rounded-full lowercase transition-colors ${activeView === 'home' ? 'text-neutral-300 hover:text-white' : 'text-neutral-500 hover:text-white'
                }`}
            >
              pipeline
            </a>
            <a
              href="#support"
              onClick={(e) => handleLinkClick(e, 'home', 'support')}
              className={`text-sm px-4 py-2 rounded-full lowercase transition-colors ${activeView === 'home' ? 'text-neutral-300 hover:text-white' : 'text-neutral-500 hover:text-white'
                }`}
            >
              docs
            </a>

            {/* View Links */}
            <div className="w-px h-4 bg-white/10 mx-2" />

            <a
              id="nav-rules"
              data-view="rules"
              href="#rules"
              onClick={(e) => handleLinkClick(e, 'rules')}
              className={`text-sm px-4 py-2 rounded-full lowercase transition-colors ${activeView === 'rules' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
                }`}
            >
              rules
            </a>
            <a
              id="nav-dashboard"
              data-view="dashboard"
              href="#dashboard"
              onClick={(e) => handleLinkClick(e, 'dashboard')}
              className={`text-sm px-4 py-2 rounded-full lowercase transition-colors ${activeView === 'dashboard' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
                }`}
            >
              dashboard
            </a>
            <a
              id="nav-sandbox"
              data-view="sandbox"
              href="#sandbox"
              onClick={(e) => handleLinkClick(e, 'sandbox')}
              className={`text-sm px-4 py-2 rounded-full lowercase transition-colors ${activeView === 'sandbox' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
                }`}
            >
              sandbox scanner
            </a>
            <a
              id="nav-auditor"
              data-view="auditor"
              href="#auditor"
              onClick={(e) => handleLinkClick(e, 'auditor')}
              className={`text-sm px-4 py-2 rounded-full lowercase transition-colors ${activeView === 'auditor' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
                }`}
            >
              dependency auditor
            </a>
            <a
              id="nav-pricing"
              data-view="pricing"
              href="#pricing"
              onClick={(e) => handleLinkClick(e, 'pricing')}
              className={`text-sm px-4 py-2 rounded-full lowercase transition-colors ${activeView === 'pricing' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
                }`}
            >
              pricing
            </a>
            <a
              href="#contact"
              onClick={(e) => handleLinkClick(e, 'contact')}
              className={`text-sm px-4 py-2 rounded-full lowercase transition-colors ${activeView === 'contact' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
                }`}
            >
              contact
            </a>
          </div>

          {/* Right Action Button & Mobile Burger */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="hidden md:flex h-11 items-center justify-center text-sm font-normal rounded-full px-6 transition-colors lowercase border bg-white text-black border-white hover:bg-neutral-200 whitespace-nowrap"
            >
              install cli
            </button>
            <button
              onClick={onOpenTerminal}
              className="hidden sm:flex h-11 items-center justify-center bg-neutral-900/90 hover:bg-neutral-800 text-white border border-white/10 text-xs font-mono rounded-full px-5 lowercase transition-all select-none whitespace-nowrap"
            >
              terminal hook
            </button>
            {!githubUser && !premiumStatus?.valid && onRestoreSubscription && (
              <button
                onClick={onRestoreSubscription}
                title="restore subscription"
                className="hidden sm:flex items-center justify-center bg-neutral-900/90 hover:bg-neutral-800 text-white border border-white/10 rounded-full w-11 h-11 transition-all select-none"
              >
                <svg className="w-4 h-4 text-neutral-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            )}
            {githubUser ? (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(!isDropdownOpen);
                  }}
                  className="flex items-center justify-center bg-neutral-900/90 hover:bg-neutral-800 border border-white/10 rounded-full w-11 h-11 transition-colors"
                >
                  <UserAvatar username={githubUser.username} avatarUrl={githubUser.avatarUrl} sizeClass="w-7 h-7" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-52 bg-neutral-950/95 border border-white/10 backdrop-blur-xl rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2.5 text-left">
                      <span className="text-[9px] text-neutral-500 font-mono tracking-wider uppercase block">connected as</span>
                      <span className="text-xs text-white font-mono font-medium block truncate lowercase mt-0.5">@{githubUser.username}</span>

                      {premiumStatus?.valid ? (
                        <div className="text-[9px] text-neutral-300 font-mono flex items-center gap-1.5 lowercase mt-2 bg-neutral-900 border border-white/10 px-2 py-1 rounded-lg w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {premiumStatus.plan} plan
                        </div>
                      ) : githubUser.token ? (
                        <div className="text-[9px] text-neutral-300 font-mono flex items-center gap-1.5 lowercase mt-2 bg-neutral-900 border border-white/10 px-2 py-1 rounded-lg w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          pat (5k/hr)
                        </div>
                      ) : (
                        <div className="text-[9px] text-neutral-400 font-mono flex items-center gap-1.5 lowercase mt-2 bg-neutral-900/60 border border-white/5 px-2 py-1 rounded-lg w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 animate-pulse" />
                          public only (60/hr)
                        </div>
                      )}
                    </div>
                    <div className="border-t border-white/5 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onGithubLogout();
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-white/5 rounded-xl font-mono transition-colors lowercase flex items-center justify-between"
                      >
                        disconnect
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onGithubLogin}
                className="flex items-center justify-center bg-neutral-900/90 hover:bg-neutral-800 text-white border border-white/10 rounded-full w-11 h-11 transition-all select-none"
                aria-label="Connect GitHub"
              >
                <svg fill="currentColor" className="w-5 h-5 text-white" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
                </svg>
              </button>
            )}

            {/* Burger toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex lg:hidden flex-col items-center justify-center bg-neutral-900/90 backdrop-blur border border-white/5 w-11 h-11 rounded-full text-white relative focus:outline-none"
              aria-label="Toggle Menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between relative">
                <span
                  className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 transform origin-center ${isMobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
                    }`}
                />
                <span
                  className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100'
                    }`}
                />
                <span
                  className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 transform origin-center ${isMobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
                    }`}
                />
              </div>
            </button>
          </div>

        </nav>
      </header>

      {/* Mobile Drawer Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/95 backdrop-blur-lg lg:hidden flex flex-col justify-between p-6 pt-24 overflow-y-auto animate-in fade-in slide-in-from-bottom duration-300">
          <nav className="flex flex-col gap-4 my-4 select-none">
            <a
              href="#platform"
              onClick={(e) => handleLinkClick(e, 'home', 'platform')}
              className="text-xl font-light text-neutral-400 hover:text-white transition-colors lowercase"
            >
              sandbox demo
            </a>
            <a
              href="#solutions"
              onClick={(e) => handleLinkClick(e, 'home', 'solutions')}
              className="text-xl font-light text-neutral-400 hover:text-white transition-colors lowercase"
            >
              pipeline
            </a>

            <div className="h-px bg-white/5 my-1" />

            <a
              href="#rules"
              onClick={(e) => handleLinkClick(e, 'rules')}
              className="text-xl font-light text-neutral-400 hover:text-white transition-colors lowercase"
            >
              rules
            </a>
            <a
              href="#dashboard"
              onClick={(e) => handleLinkClick(e, 'dashboard')}
              className="text-xl font-light text-neutral-400 hover:text-white transition-colors lowercase"
            >
              dashboard
            </a>
            <a
              href="#sandbox"
              onClick={(e) => handleLinkClick(e, 'sandbox')}
              className="text-xl font-light text-neutral-400 hover:text-white transition-colors lowercase"
            >
              sandbox scanner
            </a>
            <a
              href="#auditor"
              onClick={(e) => handleLinkClick(e, 'auditor')}
              className="text-xl font-light text-neutral-400 hover:text-white transition-colors lowercase"
            >
              dependency auditor
            </a>
            <a
              href="#pricing"
              onClick={(e) => handleLinkClick(e, 'pricing')}
              className={`text-xl font-light transition-colors lowercase ${activeView === 'pricing' ? 'text-white' : 'text-neutral-400 hover:text-white'
                }`}
            >
              pricing
            </a>
            <a
              href="#contact"
              onClick={(e) => handleLinkClick(e, 'contact')}
              className="text-xl font-light text-neutral-400 hover:text-white transition-colors lowercase"
            >
              contact
            </a>
          </nav>

          <div className="border-t border-white/5 pt-5 flex flex-col gap-2.5">
            {githubUser ? (
              <div className="flex items-center gap-3 bg-neutral-900/60 border border-white/5 rounded-2xl p-2.5 mb-1">
                <UserAvatar username={githubUser.username} avatarUrl={githubUser.avatarUrl} sizeClass="w-8 h-8" />
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] text-neutral-500 font-mono block lowercase">connected as</span>
                  <span className="text-xs text-white font-mono font-medium block truncate lowercase">@{githubUser.username}</span>
                  {githubUser.token && (
                    <span className="text-[8px] text-emerald-400 font-mono block lowercase mt-0.5">✓ pat enabled</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onGithubLogout();
                  }}
                  className="text-red-400 hover:text-red-300 text-xs font-mono lowercase border border-red-500/20 bg-red-950/15 rounded-xl px-2.5 py-1"
                >
                  disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onGithubLogin();
                }}
                className="w-full bg-neutral-900 border border-white/10 text-white py-2.5 rounded-full text-sm font-medium transition-colors lowercase flex items-center justify-center gap-2 mb-1"
              >
                <svg fill="currentColor" className="w-5 h-5 text-white" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
                </svg>
                connect github
              </button>
            )}
            {!premiumStatus?.valid && onRestoreSubscription && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onRestoreSubscription();
                }}
                className="w-full bg-neutral-900 border border-white/10 text-white py-2.5 rounded-full text-sm font-medium transition-colors lowercase font-mono"
              >
                restore subscription
              </button>
            )}
            <button
              onClick={handleInstallClick}
              className="w-full bg-white text-black py-2.5 rounded-full text-sm font-medium transition-colors lowercase"
            >
              install cli
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsMobileMenuOpen(false);
                onOpenTerminal();
              }}
              className="w-full bg-neutral-900 border border-white/10 text-white py-2.5 rounded-full text-sm font-medium transition-colors lowercase font-mono"
            >
              terminal hook
            </button>
            <span className="text-[9px] font-mono text-neutral-600 text-center lowercase mt-0.5">
              securify cli · open-source and local-first
            </span>
          </div>
        </div>
      )}
    </>
  );
};
