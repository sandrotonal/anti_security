import { useState, useEffect, useRef } from 'react';
import { scanContent } from '../lib/scanEngine';

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

interface CommandHistoryItem {
  input: string;
  output: string;
}

export const TerminalModal = ({ isOpen, onClose }: TerminalModalProps) => {
  const [selectedPm, setSelectedPm] = useState<PackageManager>('npm');
  const [copied, setCopied] = useState<boolean>(false);
  
  // Interactive Shell States
  const [inputText, setInputText] = useState<string>('');
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [rawHistory, setRawHistory] = useState<string[]>([]);
  const [themeColor, setThemeColor] = useState<string>('emerald'); // emerald, amber, cyan, white
  
  const modalRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const installCommands: CommandMap = {
    npm: 'npm install -g securify-scanner',
    pnpm: 'pnpm add -g securify-scanner',
    cargo: 'cargo install securify-scanner',
    brew: 'brew install securify-scanner'
  };

  const getThemeTextClass = () => {
    switch (themeColor) {
      case 'amber': return 'text-amber-400';
      case 'cyan': return 'text-cyan-400';
      case 'white': return 'text-white';
      default: return 'text-emerald-400';
    }
  };

  const getThemePromptClass = () => {
    switch (themeColor) {
      case 'amber': return 'text-amber-500';
      case 'cyan': return 'text-cyan-500';
      case 'white': return 'text-neutral-400';
      default: return 'text-emerald-500';
    }
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
      document.body.style.overflow = 'hidden';
      // Autofocus terminal input on open
      setTimeout(() => inputRef.current?.focus(), 150);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Scroll to bottom on history change
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Click outside to close
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // Copy command to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(installCommands[selectedPm]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  // Auto-typing boot message on open
  useEffect(() => {
    if (!isOpen) {
      setHistory([]);
      setInputText('');
      setRawHistory([]);
      setHistoryIndex(-1);
      return;
    }

    const bootLogs = [
      {
        input: 'securify --version',
        output: 'securify web scanner v1.0.0\n[info] loaded 40+ secret detection patterns\n[info] entropy analysis: enabled\n[success] real-time scanning engine ready\n\ntype "--help" for available commands'
      }
    ];
    setHistory(bootLogs);
  }, [isOpen]);

  const handleCommandSubmit = (cmdStr: string) => {
    const trimmed = cmdStr.trim().toLowerCase();
    if (!trimmed) return;

    let output = '';
    
    switch (trimmed) {
      case 'help':
      case '--help':
      case '?':
        output = `securify terminal commands:
  - rules           list active secret detection patterns
  - scan            run real-time code security scan
  - bypass          learn about false positive handling
  - faq             frequently asked questions
  - clear           clear terminal history
  - exit            close terminal session`;
        break;
      case 'rules':
        output = `active secret detection patterns:
  [critical] AWS Access Key ID (AKIA*, A3T*)
  [critical] AWS Secret Access Key (40-char base64)
  [critical] RSA/DSA/EC Private Keys (PEM format)
  [critical] SSH Private Keys
  [high] GitHub Personal Access Token (ghp_*)
  [high] Stripe Secret Key (sk_live_*)
  [high] Google Cloud API Key (AIza*)
  [high] PostgreSQL/MySQL Connection Strings
  [high] Slack Tokens (xox*)
  [medium] JWT Tokens (eyJ*)
  [medium] Generic API Keys (high entropy)
  [medium] SendGrid/Twilio/Mailgun Keys
  
total: 40+ patterns with entropy analysis`;
        break;
      case 'scan':
        // Real scanning - test with sample content
        const sampleCode = `
const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";
const stripe_key = "sk_live_51ABC123XYZ";
function connect() {
  const password = "test123";
}`;
        const results = scanContent(sampleCode, 'demo.js');
        if (results.length === 0) {
          output = `[info] scanning code sample...
[info] analyzed 5 lines in real-time
[success] no secrets detected. code is clean!`;
        } else {
          output = `[info] scanning code sample...
[warning] found ${results.length} potential secret(s):
${results.map(r => `  - ${r.type} at line ${r.line}`).join('\n')}
[info] use "bypass" command to learn about false positives`;
        }
        break;
      case 'bypass':
        output = `to ignore a false positive detection, append:
  "# securify:ignore" at the end of the flagged code line.`;
        break;
      case 'faq':
        output = `frequently asked questions:
  Q: is my code sent to external servers?
  A: no. all scanning runs locally in your browser
  
  Q: how accurate is the detection?
  A: uses 40+ industry-standard patterns + entropy analysis
  
  Q: does it scan my entire repository?
  A: yes, when connected to GitHub - scans all text files
  
  Q: can i use this in CI/CD pipelines?
  A: yes, integrate via GitHub Actions or webhook scanning`;
        break;
      case 'clear':
        setHistory([]);
        setInputText('');
        setHistoryIndex(-1);
        return;
      case 'exit':
        onClose();
        return;
      default:
        output = `securify: command not found: "${trimmed}". type "--help" for list of options.`;
    }

    const newRaw = [...rawHistory, cmdStr];
    setRawHistory(newRaw);
    setHistoryIndex(-1);
    setHistory(prev => [...prev, { input: cmdStr, output }]);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Submit Command
    if (e.key === 'Enter') {
      handleCommandSubmit(inputText);
      return;
    }

    // Auto-complete (Tab)
    if (e.key === 'Tab') {
      e.preventDefault();
      const suggestions = ['rules', 'scan', 'bypass', 'faq', 'clear', 'exit', '--help'];
      const matches = suggestions.filter(s => s.startsWith(inputText.trim().toLowerCase()));
      if (matches.length === 1) {
        setInputText(matches[0]);
      }
      return;
    }

    // Up Arrow (History Back)
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rawHistory.length === 0) return;
      const nextIndex = historyIndex === -1 ? rawHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInputText(rawHistory[nextIndex]);
      return;
    }

    // Down Arrow (History Forward)
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      if (historyIndex === rawHistory.length - 1) {
        setHistoryIndex(-1);
        setInputText('');
      } else {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setInputText(rawHistory[nextIndex]);
      }
      return;
    }
  };

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
              securify --interactive-shell
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors"
            aria-label="close terminal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/5 bg-neutral-900/50">
          {(Object.keys(installCommands) as Array<PackageManager>).map((pm) => (
            <button
              key={pm}
              onClick={() => {
                setSelectedPm(pm);
                // Also type the install CLI command simulation in the terminal for premium experience
                setHistory(prev => [
                  ...prev,
                  {
                    input: `securify install --manager=${pm}`,
                    output: `[info] installing CLI binary...\n[cmd] ${installCommands[pm]}\n[success] ready for local repository scans.`
                  }
                ]);
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
              {installCommands[selectedPm]}
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
          <div className="mt-4 bg-neutral-950 p-4 rounded-lg border border-white/5 min-h-[160px] max-h-[240px] overflow-y-auto font-mono text-[11px] md:text-xs leading-relaxed flex flex-col space-y-2">
            
            {/* Command Logs history */}
            {history.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center gap-1.5 text-neutral-500 font-bold select-none">
                  <span>$</span>
                  <span className="text-neutral-300 font-normal">{item.input}</span>
                </div>
                <div className={`whitespace-pre-wrap ${getThemeTextClass()}`}>
                  {item.output}
                </div>
              </div>
            ))}

            {/* Input Prompt line */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className={`font-bold select-none ${getThemePromptClass()}`}>$</span>
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-neutral-200 border-none outline-none focus:ring-0 p-0 font-mono text-[11px] md:text-xs lowercase"
                placeholder="type command (e.g. rules, scan, --help)..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
            
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-4 bg-neutral-900/30 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-neutral-500 select-none">
          {/* Terminal Theme Selector */}
          <div className="flex items-center gap-1.5 select-none">
            <span className="text-[10px] text-neutral-500 font-mono lowercase">shell theme:</span>
            {['emerald', 'amber', 'cyan', 'white'].map((col) => (
              <button
                key={col}
                onClick={() => setThemeColor(col)}
                className={`w-2.5 h-2.5 rounded-full border transition-all ${
                  col === 'emerald' ? 'bg-emerald-500 border-emerald-400' :
                  col === 'amber' ? 'bg-amber-500 border-amber-400' :
                  col === 'cyan' ? 'bg-cyan-500 border-cyan-400' :
                  'bg-white border-neutral-300'
                } ${themeColor === col ? 'scale-125 border-white' : 'opacity-60 hover:opacity-100'}`}
                title={`${col} theme`}
              />
            ))}
          </div>

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
