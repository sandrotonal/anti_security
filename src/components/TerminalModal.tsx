import { useState, useEffect, useRef } from 'react';

interface TerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PackageManager = 'npm' | 'pnpm' | 'cargo' | 'brew';

interface CommandMap {
  npm: string;
  pnpm: string;
  cargo: string;
  brew: string;
}

export const TerminalModal = ({ isOpen, onClose }: TerminalModalProps) => {
  const [selectedPm, setSelectedPm] = useState<PackageManager>('npm');
  const [copied, setCopied] = useState<boolean>(false);
  const [commandSuccess, setCommandSuccess] = useState<boolean>(false);
  const [typedOutput, setTypedOutput] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);

  const commands: CommandMap = {
    npm: 'npm install -g @securify/cli',
    pnpm: 'pnpm add -g @securify/cli',
    cargo: 'cargo install securify',
    brew: 'brew install securify-cli/securify/securify'
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Click outside to close
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // Copy command to clipboard with try-catch
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(commands[selectedPm]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      // Fallback: alert or standard handling if clipboard fails
    }
  };

  // Simulate typing effect for the demo output
  useEffect(() => {
    if (!isOpen) {
      setTypedOutput('');
      setCommandSuccess(false);
      return;
    }

    const fullText = '$ securify init\n\n[info] scanning git repository...\n[info] 0 secrets detected.\n[success] pre-commit hook installed successfully!\n[success] your credentials are now securified. 🔒';
    let currentIndex = 0;
    setTypedOutput('');
    setCommandSuccess(false);

    const timer = setInterval(() => {
      if (currentIndex < fullText.length) {
        setTypedOutput((prev) => prev + fullText.charAt(currentIndex));
        currentIndex++;
      } else {
        clearInterval(timer);
        setCommandSuccess(true);
      }
    }, 15);

    return () => clearInterval(timer);
  }, [isOpen, selectedPm]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all duration-300"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-xl bg-neutral-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 transform scale-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-900 border-b border-white/5 select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 block"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 block"></span>
            <span className="w-3 h-3 rounded-full bg-green-500/80 block"></span>
            <span id="terminal-title" className="text-xs text-neutral-400 font-mono ml-2 lowercase">
              securify --get-started
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors"
            aria-label="close terminal"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/5 bg-neutral-900/50">
          {(Object.keys(commands) as Array<PackageManager>).map((pm) => (
            <button
              key={pm}
              onClick={() => {
                setSelectedPm(pm);
                setTypedOutput('');
                setCommandSuccess(false);
              }}
              className={`px-4 py-2 text-xs font-mono border-r border-white/5 transition-all lowercase ${
                selectedPm === pm
                  ? 'bg-neutral-950 text-white font-medium border-t-2 border-t-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/30'
              }`}
            >
              {pm}
            </button>
          ))}
        </div>

        {/* Command Display */}
        <div className="p-5 font-mono text-sm">
          <div className="relative flex items-center justify-between bg-neutral-900/90 rounded-lg p-3 border border-white/5">
            <span className="text-white select-all text-xs md:text-sm">
              {commands[selectedPm]}
            </span>
            <button
              onClick={copyToClipboard}
              className={`ml-4 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                copied
                  ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white text-black hover:bg-neutral-200'
              }`}
              aria-label="copy command"
            >
              {copied ? 'copied' : 'copy'}
            </button>
          </div>

          {/* Interactive Shell Output Simulation */}
          <div className="mt-4 bg-neutral-950 p-4 rounded-lg border border-white/5 text-[12px] md:text-xs leading-relaxed text-neutral-400 min-h-[140px] whitespace-pre-wrap font-mono select-none">
            {typedOutput}
            {!commandSuccess && <span className="animate-pulse">|</span>}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-4 bg-neutral-900/30 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-neutral-500">
          <span className="lowercase">opensourced under MIT license</span>
          <a
            href="https://github.com/sandrotonal/anti_security"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:underline lowercase inline-flex items-center gap-1.5"
          >
            view repo on github
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};
