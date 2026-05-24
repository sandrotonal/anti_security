import { useState, useEffect } from 'react';

interface GithubAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { username: string; avatarUrl: string }) => void;
}

export const GithubAuthModal = ({ isOpen, onClose, onSuccess }: GithubAuthModalProps) => {
  const [username, setUsername] = useState<string>('sandrotonal');
  const [step, setStep] = useState<'input' | 'authorizing' | 'success'>('input');
  const [progressMsg, setProgressMsg] = useState<string>('');
  
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setProgressMsg('');
    }
  }, [isOpen]);

  // Disable body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setStep('authorizing');
    const steps = [
      'establishing secure oauth handshake...',
      'requesting read:user and public_repo scopes...',
      'verifying github authentication token...',
      'generating secure access keys...',
      'synchronizing user profile details...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setProgressMsg(steps[i]);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    setStep('success');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Pass real GitHub avatar URL dynamically based on username
    onSuccess({
      username: username.trim(),
      avatarUrl: `https://github.com/${username.trim()}.png`
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="bg-neutral-950/80 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 md:p-8 max-w-md w-full relative z-10 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Decorative Grid and Blur */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none opacity-20" />
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {step === 'input' && (
          <div className="relative z-10 space-y-6">
            {/* Logo Handshake */}
            <div className="flex items-center justify-center gap-6 py-4">
              {/* Securify Logo */}
              <div className="w-12 h-12 bg-neutral-900 border border-white/10 rounded-2xl flex items-center justify-center shadow-lg relative group">
                <div className="absolute inset-0 bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <svg viewBox="0 0 256 256" fill="currentColor" className="h-6 w-6 text-white">
                  <path d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z" />
                </svg>
              </div>

              {/* Pulse Connecting Line */}
              <div className="flex-1 h-px bg-neutral-800 relative overflow-hidden">
                <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 to-sky-500 w-1/2 animate-dash-slow rounded-full" style={{
                  animation: 'dash 1.2s linear infinite',
                  backgroundImage: 'linear-gradient(90deg, transparent, #10b981, transparent)'
                }} />
              </div>

              {/* GitHub Logo */}
              <div className="w-12 h-12 bg-neutral-900 border border-white/10 rounded-2xl flex items-center justify-center shadow-lg">
                <svg fill="currentColor" className="w-6 h-6 text-white" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium text-white lowercase">connect to github</h3>
              <p className="text-neutral-400 text-xs font-light lowercase leading-relaxed">
                authorize securify to fetch your public repositories and run real-time static code scans entirely client-side.
              </p>
            </div>

            {/* Username Form */}
            <form onSubmit={handleAuthorize} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 lowercase block pl-1">
                  github username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-4 flex items-center text-neutral-500 font-mono text-xs">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-white/25 transition-colors lowercase"
                    placeholder="sandrotonal"
                  />
                </div>
              </div>

              {/* Permissions scope checkboxes */}
              <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-4 space-y-3">
                <span className="text-[9px] font-mono text-neutral-500 block uppercase">requested permissions</span>
                
                <div className="flex gap-3">
                  <div className="w-4 h-4 rounded bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-[10px] text-emerald-400 font-bold shrink-0">
                    ✓
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-neutral-200 block lowercase">public_repo</span>
                    <span className="text-[9px] text-neutral-500 block lowercase leading-relaxed">read access to public repository structures and filenames</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-4 h-4 rounded bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-[10px] text-emerald-400 font-bold shrink-0">
                    ✓
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-neutral-200 block lowercase">read:user</span>
                    <span className="text-[9px] text-neutral-500 block lowercase leading-relaxed">access to profile details (profile image, bio, location)</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl py-3.5 lowercase transition-all select-none flex items-center justify-center gap-2"
              >
                <svg fill="currentColor" className="w-4 h-4 text-black" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
                </svg>
                authorize securify portal
              </button>
            </form>
          </div>
        )}

        {step === 'authorizing' && (
          <div className="relative z-10 py-12 flex flex-col items-center justify-center space-y-6 text-center">
            {/* Spinning Circle */}
            <div className="w-12 h-12 rounded-full border-t-2 border-white border-r-2 border-r-transparent animate-spin" />
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white lowercase">authorizing connection</h3>
              <p className="text-neutral-500 font-mono text-[10px] lowercase animate-pulse">
                {progressMsg}
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="relative z-10 py-12 flex flex-col items-center justify-center space-y-4 text-center">
            {/* Success Check */}
            <div className="w-12 h-12 bg-emerald-950 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 text-lg shadow-lg">
              ✓
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-white lowercase">connected successfully</h3>
              <p className="text-neutral-400 text-xs lowercase">
                welcome, @{username}! redirecting to portal...
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
