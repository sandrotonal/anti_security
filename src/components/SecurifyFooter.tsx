interface SecurifyFooterProps {
  onSelectModal: (type: 'license' | 'security' | 'pgp' | 'sales_contract' | 'return_policy' | 'privacy_policy' | 'company_info') => void;
}

export const SecurifyFooter = ({ onSelectModal }: SecurifyFooterProps) => {
  return (
    <footer className="bg-black py-16 md:py-20 px-6 md:px-12 border-t border-white/5 relative z-10 text-neutral-500 font-mono text-[10px] md:text-xs">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-12">
        
        {/* Left - Branding and Copyright */}
        <div className="space-y-4 select-none">
          <div className="flex items-center gap-2 text-white">
            <svg
              viewBox="0 0 256 256"
              className="h-56 w-56 text-white animate-pulse-slow"
              aria-hidden="true"
              style={{ animationDuration: '4s' }}
            >
              <path
                d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z"
                fill="currentColor"
              />
            </svg>
            <span className="text-sm font-normal tracking-tight font-sans">securify</span>
          </div>
          <div className="space-y-1">
            <p className="lowercase pl-1 text-[9px] text-neutral-600">
              © {new Date().getFullYear()} securify-cli open-source project. all rights reserved.
            </p>
            <p className="lowercase pl-1 text-[9px] text-neutral-600">
              crafted by{' '}
              <a
                href="https://gucluyumhe.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-white transition-colors underline decoration-white/10 font-mono"
              >
                gucluyumhe
              </a>
            </p>
          </div>
        </div>

        {/* Right - Resource Links */}
        <div className="flex flex-wrap gap-x-4 md:gap-x-8 gap-y-2 select-text items-center">
          <a
            href="https://github.com/sandrotonal/anti_security"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors lowercase font-mono text-neutral-500 text-[10px] md:text-xs"
          >
            github
          </a>
          <a
            href="/license"
            onClick={(e) => { e.preventDefault(); onSelectModal('license'); }}
            className="hover:text-white transition-colors lowercase text-left focus:outline-none font-mono text-neutral-500 text-[10px] md:text-xs"
          >
            mit license
          </a>
          <a
            href="/security"
            onClick={(e) => { e.preventDefault(); onSelectModal('security'); }}
            className="hover:text-white transition-colors lowercase text-left focus:outline-none font-mono text-neutral-500 text-[10px] md:text-xs"
          >
            security policy
          </a>
          <a
            href="/pgp"
            onClick={(e) => { e.preventDefault(); onSelectModal('pgp'); }}
            className="hover:text-white transition-colors lowercase text-left focus:outline-none font-mono text-neutral-500 text-[10px] md:text-xs"
          >
            pgp key
          </a>
          <a
            href="/terms"
            onClick={(e) => { e.preventDefault(); onSelectModal('sales_contract'); }}
            className="hover:text-white transition-colors lowercase text-left focus:outline-none font-mono text-neutral-500 text-[10px] md:text-xs"
          >
            distance sales
          </a>
          <a
            href="/refund"
            onClick={(e) => { e.preventDefault(); onSelectModal('return_policy'); }}
            className="hover:text-white transition-colors lowercase text-left focus:outline-none font-mono text-neutral-500 text-[10px] md:text-xs"
          >
            cancellation & refund
          </a>
          <a
            href="/privacy"
            onClick={(e) => { e.preventDefault(); onSelectModal('privacy_policy'); }}
            className="hover:text-white transition-colors lowercase text-left focus:outline-none font-mono text-neutral-500 text-[10px] md:text-xs"
          >
            privacy & gdpr
          </a>
          <a
            href="/contact"
            onClick={(e) => { e.preventDefault(); onSelectModal('company_info'); }}
            className="hover:text-white transition-colors lowercase text-left focus:outline-none font-mono text-neutral-500 text-[10px] md:text-xs"
          >
            contact info
          </a>
        </div>

      </div>
    </footer>
  );
};
