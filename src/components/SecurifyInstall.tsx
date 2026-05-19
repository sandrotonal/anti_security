import { useState } from 'react';

type OSType = 'macos' | 'linux' | 'windows';
type ShellType = 'zsh' | 'bash' | 'powershell';

export const SecurifyInstall = () => {
  const [os, setOs] = useState<OSType>('macos');
  const [shell, setShell] = useState<ShellType>('zsh');
  const [copied, setCopied] = useState<boolean>(false);

  const getInstallCommand = (): string => {
    if (os === 'windows') {
      return `iwr -useb https://securify.dev/install.ps1 | iex\n# securify --version`;
    }
    
    // macOS or Linux
    if (shell === 'powershell') {
      return `pwsh -c "curl -fsSL https://securify.dev/install.sh | sh"`;
    }
    
    return `curl -fsSL https://securify.dev/install.sh | sh\n# securify --version`;
  };

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(getInstallCommand());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('failed to copy text', err);
    }
  };

  return (
    <section className="bg-black min-h-screen py-28 px-6 md:px-12 relative overflow-hidden select-none">
      {/* Grid lines background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <span className="inline-block bg-neutral-900 border border-white/10 rounded-full px-4 py-1 text-xs text-neutral-400 lowercase mb-4 tracking-wider">
            install cli
          </span>
          <h2 className="hero-title text-4xl md:text-5xl font-medium tracking-tight text-white lowercase mb-4">
            install compiler hooks.
          </h2>
          <p className="text-neutral-400 text-sm font-light lowercase leading-relaxed max-w-xl">
            select your development environment settings below to configure the native installation script command for your terminal shell.
          </p>
        </div>

        {/* Configuration Setup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Settings Options (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* OS selection */}
            <div>
              <span className="block text-[10px] font-mono text-neutral-500 mb-2 lowercase">
                operating system
              </span>
              <div className="flex gap-2">
                {(['macos', 'linux', 'windows'] as OSType[]).map((osItem) => (
                  <button
                    key={osItem}
                    onClick={() => {
                      setOs(osItem);
                      if (osItem === 'windows') setShell('powershell');
                    }}
                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono border transition-all lowercase ${
                      os === osItem
                        ? 'bg-white text-black border-white'
                        : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
                    }`}
                  >
                    {osItem}
                  </button>
                ))}
              </div>
            </div>

            {/* Shell selection */}
            {os !== 'windows' && (
              <div>
                <span className="block text-[10px] font-mono text-neutral-500 mb-2 lowercase">
                  shell profile
                </span>
                <div className="flex gap-2">
                  {(['zsh', 'bash', 'powershell'] as ShellType[]).map((shItem) => (
                    <button
                      key={shItem}
                      onClick={() => setShell(shItem)}
                      className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono border transition-all lowercase ${
                        shell === shItem
                          ? 'bg-white text-black border-white'
                          : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
                      }`}
                    >
                      {shItem}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-neutral-950/80 border border-white/5 rounded-2xl p-6 select-text text-neutral-400 text-xs font-light leading-relaxed lowercase space-y-2">
              <span className="font-mono text-white block select-none">system prerequisites:</span>
              <p>• git installed on system path</p>
              <p>• root access write privileges for binary directories (usr/local/bin)</p>
            </div>

          </div>

          {/* Code Window Display (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-neutral-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-4 py-3 bg-neutral-900/50 border-b border-white/5 flex justify-between items-center select-none">
              <span className="text-[10px] font-mono text-neutral-500 lowercase">terminal console install</span>
              <span className="w-2 h-2 rounded-full bg-neutral-800"></span>
            </div>

            <div className="p-6 font-mono text-xs md:text-sm text-neutral-300 min-h-[160px] bg-black/40 flex flex-col justify-between">
              <pre className="select-text whitespace-pre-wrap break-all">{getInstallCommand()}</pre>
              
              <div className="flex justify-end pt-6 select-none">
                <button
                  onClick={handleCopy}
                  className="bg-white text-black hover:bg-neutral-200 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-colors lowercase"
                >
                  {copied ? 'copied script!' : 'copy script'}
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
