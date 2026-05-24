interface SecurifyFooterProps {
  onSelectModal: (type: 'license' | 'security' | 'pgp') => void;
}

export const SecurifyFooter = ({ onSelectModal }: SecurifyFooterProps) => {
  return (
    <footer className="bg-black py-16 px-6 md:px-12 border-t border-white/5 relative z-10 text-neutral-500 font-mono text-[10px] md:text-xs">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        {/* Left - Branding and Copyright */}
        <div className="space-y-2 select-none">
          <div className="flex items-center gap-2 text-white">
            <svg
              viewBox="0 0 256 256"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z"
                fill="currentColor"
              />
            </svg>
            <span className="text-sm font-normal tracking-tight font-sans">securify</span>
          </div>
          <p className="lowercase">
            © {new Date().getFullYear()} securify-cli open-source project. all rights reserved.
          </p>
        </div>

        {/* Right - Resource Links */}
        <div className="flex flex-wrap gap-x-8 gap-y-4 select-text">
          <a
            href="https://github.com/sandrotonal/anti_security"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors lowercase"
          >
            github
          </a>
          <button
            onClick={() => onSelectModal('license')}
            className="hover:text-white transition-colors lowercase text-left focus:outline-none"
          >
            mit license
          </button>
          <button
            onClick={() => onSelectModal('security')}
            className="hover:text-white transition-colors lowercase text-left focus:outline-none"
          >
            security policy
          </button>
          <button
            onClick={() => onSelectModal('pgp')}
            className="hover:text-white transition-colors lowercase text-left focus:outline-none"
          >
            pgp key
          </button>
        </div>

      </div>
    </footer>
  );
};
