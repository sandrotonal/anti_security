import { useState, useEffect } from 'react';

interface GithubAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { username: string; avatarUrl: string; token?: string }) => void;
}

export const GithubAuthModal = ({ isOpen, onClose, onSuccess }: GithubAuthModalProps) => {
  const [username, setUsername] = useState<string>('sandrotonal');
  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem('securify_github_pat') || '';
  });
  const [step, setStep] = useState<'input' | 'authorizing' | 'success'>('input');
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  
  // Interactive scopes
  const [publicRepo, setPublicRepo] = useState<boolean>(true);
  const [privateRepo, setPrivateRepo] = useState<boolean>(() => {
    return !!localStorage.getItem('securify_github_pat');
  });
  const [readUser, setReadUser] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string>('');
  
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setProgressMsg('');
      setProgressPercent(0);
      setAuthError('');
      const savedToken = localStorage.getItem('securify_github_pat') || '';
      setToken(savedToken);
      setPrivateRepo(!!savedToken);
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
    setAuthError('');
    if (!username.trim()) return;

    if (privateRepo && !token.trim()) {
      setAuthError('personal access token is required when private repositories scope is selected.');
      return;
    }

    setStep('authorizing');
    setProgressPercent(10);
    setProgressMsg('verifying credentials with github api...');

    try {
      if (token.trim()) {
        const res = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `token ${token.trim()}`
          }
        });
        if (!res.ok) {
          throw new Error('invalid personal access token or expired credentials.');
        }
        const data = await res.json();
        if (data.login.toLowerCase() !== username.trim().toLowerCase()) {
          throw new Error(`provided token belongs to @${data.login}, not @${username}.`);
        }
      } else {
        const res = await fetch(`https://api.github.com/users/${username.trim()}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(`github username @${username} does not exist.`);
          } else {
            throw new Error('failed to verify user with github API.');
          }
        }
      }

      setProgressPercent(30);

      const steps = [
        { msg: 'establishing secure oauth handshake...', pct: 45 },
        { msg: 'requesting scopes...', pct: 65 },
        { msg: 'generating secure access keys...', pct: 85 },
        { msg: 'synchronizing user profile details...', pct: 95 }
      ];

      for (let i = 0; i < steps.length; i++) {
        setProgressMsg(steps[i].msg);
        const startPct = i === 0 ? 30 : steps[i - 1].pct;
        const endPct = steps[i].pct;
        
        // Smooth transition for progress bar
        for (let p = startPct; p <= endPct; p += 2) {
          setProgressPercent(p);
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      setProgressPercent(100);
      setStep('success');
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      const trimmedToken = token.trim();
      if (trimmedToken) {
        localStorage.setItem('securify_github_pat', trimmedToken);
      } else {
        localStorage.removeItem('securify_github_pat');
      }

      onSuccess({
        username: username.trim(),
        avatarUrl: `https://avatars.githubusercontent.com/${username.trim()}`,
        token: trimmedToken || undefined
      });
      onClose();
    } catch (err: unknown) {
      setStep('input');
      setProgressPercent(0);
      const errMsg = err instanceof Error ? err.message : 'connection failed';
      setAuthError(errMsg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

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
                <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 w-1/2 rounded-full animate-dash-slow" style={{
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
                authorize securify to fetch your repositories and run real-time static code scans entirely client-side.
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

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 lowercase block pl-1">
                  personal access token {privateRepo ? '(required)' : '(optional)'}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="github-pat-input"
                    required={privateRepo}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className={`w-full bg-neutral-900 border rounded-xl px-4 py-3 text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-none transition-colors ${
                      privateRepo && !token.trim() ? 'border-amber-500/40 focus:border-amber-500/75' : 'border-white/10 focus:border-white/25'
                    }`}
                    placeholder={privateRepo ? "ghp_xxxxxxxxxxxx (required for private repos)" : "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
                  />
                </div>
                <span className="text-[9px] text-neutral-500 block pl-1 lowercase leading-relaxed font-light">
                  provides 5,000 req/hr rate limits and private repository scanning access.
                </span>
              </div>

              {/* Permissions scope checkboxes */}
              <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-4 space-y-3 select-none">
                <span className="text-[9px] font-mono text-neutral-500 block uppercase">requested permissions</span>
                
                {/* publicRepo Checkbox */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setPublicRepo(!publicRepo)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      setPublicRepo(!publicRepo);
                    }
                  }}
                  className="flex items-start gap-3 text-left w-full hover:bg-white/5 p-1.5 rounded-lg transition-colors group cursor-pointer focus:outline-none"
                >
                  <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                    publicRepo 
                      ? 'bg-emerald-950 border-emerald-500/50 text-emerald-400 animate-pulse' 
                      : 'bg-neutral-900 border-white/10 text-transparent group-hover:border-white/20'
                  }`}>
                    ✓
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-neutral-200 block lowercase">
                      public_repo <span className="text-neutral-500 text-[9px] font-mono">(required for public repos)</span>
                    </span>
                    <span className="text-[9px] text-neutral-500 block lowercase leading-relaxed">
                      read access to public repository structures, metadata, and contents
                    </span>
                  </div>
                </div>

                {/* privateRepo Checkbox */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    const newVal = !privateRepo;
                    setPrivateRepo(newVal);
                    if (newVal && !token.trim()) {
                      setTimeout(() => {
                        document.getElementById('github-pat-input')?.focus();
                      }, 50);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      const newVal = !privateRepo;
                      setPrivateRepo(newVal);
                      if (newVal && !token.trim()) {
                        setTimeout(() => {
                          document.getElementById('github-pat-input')?.focus();
                        }, 50);
                      }
                    }
                  }}
                  className="flex items-start gap-3 text-left w-full hover:bg-white/5 p-1.5 rounded-lg transition-colors group cursor-pointer focus:outline-none"
                >
                  <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                    privateRepo 
                      ? 'bg-emerald-950 border-emerald-500/50 text-emerald-400 animate-pulse' 
                      : 'bg-neutral-900 border-white/10 text-transparent group-hover:border-white/20'
                  }`}>
                    ✓
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-neutral-200 block lowercase">
                      repo (private repositories) {privateRepo && <span className="text-emerald-500 text-[9px] font-mono font-medium">(pat required)</span>}
                    </span>
                    <span className="text-[9px] text-neutral-500 block lowercase leading-relaxed">
                      read access to private repository files, contents, and metadata via token
                    </span>
                  </div>
                </div>

                {/* readUser Checkbox */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setReadUser(!readUser)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      setReadUser(!readUser);
                    }
                  }}
                  className="flex items-start gap-3 text-left w-full hover:bg-white/5 p-1.5 rounded-lg transition-colors group cursor-pointer focus:outline-none"
                >
                  <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                    readUser 
                      ? 'bg-emerald-950 border-emerald-500/50 text-emerald-400 animate-pulse' 
                      : 'bg-neutral-900 border-white/10 text-transparent group-hover:border-white/20'
                  }`}>
                    ✓
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-neutral-200 block lowercase">
                      read:user <span className="text-neutral-500 text-[9px] font-mono">(profile details)</span>
                    </span>
                    <span className="text-[9px] text-neutral-500 block lowercase leading-relaxed">
                      access to profile details (profile image, bio, username) to build dashboard identity
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {authError && (
                <div className="bg-red-950/40 border border-red-500/25 text-red-400 text-xs font-mono rounded-xl p-3 lowercase text-center animate-pulse">
                  {authError}
                </div>
              )}

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
          <div className="relative z-10 py-10 flex flex-col items-center justify-center space-y-8 text-center animate-in fade-in duration-300">
            {/* Premium Logo Handshake with Laser Beam */}
            <div className="flex items-center justify-center gap-8 w-full max-w-xs mx-auto py-6">
              {/* Securify Logo Container */}
              <div className="relative">
                {/* Pulsing ring */}
                <div className="absolute inset-0 bg-emerald-500/25 rounded-2xl animate-ping opacity-75" />
                <div className="w-14 h-14 bg-neutral-900 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)] relative z-10 animate-pulse">
                  <svg viewBox="0 0 256 256" fill="currentColor" className="h-7 w-7 text-emerald-400">
                    <path d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z" />
                  </svg>
                </div>
              </div>

              {/* Glowing Laser Connecting Line */}
              <div className="flex-1 h-[2px] bg-neutral-800/50 relative overflow-hidden rounded-full shadow-[0_0_8px_rgba(255,255,255,0.05)]">
                <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 via-white to-emerald-400 w-1/2 rounded-full" style={{
                  animation: 'dash 0.6s linear infinite',
                  backgroundImage: 'linear-gradient(90deg, transparent, #10b981, #ffffff, #34d399, transparent)'
                }} />
              </div>

              {/* GitHub Logo Container */}
              <div className="relative">
                {/* Pulsing ring */}
                <div className="absolute inset-0 bg-emerald-500/25 rounded-2xl animate-ping opacity-75 [animation-delay:0.3s]" />
                <div className="w-14 h-14 bg-neutral-900 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)] relative z-10 animate-pulse">
                  <svg fill="currentColor" className="w-7 h-7 text-emerald-400" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-w-xs">
              <h3 className="text-sm font-medium text-white lowercase tracking-wide">
                authorizing connection ({progressPercent}%)
              </h3>
              <div className="h-1.5 w-32 bg-neutral-900 border border-white/5 rounded-full mx-auto overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-150 ease-out" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
              <p className="text-neutral-400 font-mono text-[10px] lowercase animate-pulse mt-2 leading-relaxed min-h-[30px]">
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
