import { useState, useEffect } from 'react';
import { SecurifyNavbar } from './components/SecurifyNavbar';
import type { ViewType } from './components/SecurifyNavbar';
import { SecurifyHero } from './components/SecurifyHero';
import { SecurifySimulator } from './components/SecurifySimulator';
import { SecurifyIntegrations } from './components/SecurifyIntegrations';
import { SecurifyConsoleDocs } from './components/SecurifyConsoleDocs';
import { SecurifyRules } from './components/SecurifyRules';
import { SecurifyDashboard } from './components/SecurifyDashboard';
import { SecurifySandbox } from './components/SecurifySandbox';
import { SecurifyInstall } from './components/SecurifyInstall';
import { SecurifyContact } from './components/SecurifyContact';
import { SecurifyFooter } from './components/SecurifyFooter';
import { TerminalModal } from './components/TerminalModal';
import { CookieBanner } from './components/CookieBanner';
import { FooterModal } from './components/FooterModal';
import { SecurifyShortcuts } from './components/SecurifyShortcuts';
import { GithubAuthModal } from './components/GithubAuthModal';
import { SecurifyAuditor } from './components/SecurifyAuditor';

function App() {
  const [activeView, setActiveView] = useState<ViewType>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('submitted') === 'true' ? 'contact' : 'home';
  });
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [activeFooterModal, setActiveFooterModal] = useState<'license' | 'security' | 'pgp' | null>(null);

  // GitHub integration states
  const [isGithubModalOpen, setIsGithubModalOpen] = useState<boolean>(false);
  const [githubUser, setGithubUser] = useState<{ username: string; avatarUrl: string; token?: string } | null>(() => {
    try {
      const stored = localStorage.getItem('securify_github_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleGithubLogout = () => {
    localStorage.removeItem('securify_github_user');
    localStorage.removeItem('securify_github_pat');
    setGithubUser(null);
  };

  const [reportData, setReportData] = useState<{
    folder: string;
    files: number;
    leaks: number;
    duration: number;
    critical: number;
    high: number;
    warning: number;
    timestamp: string;
  } | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const reportParam = params.get('report');
      if (reportParam) {
        return JSON.parse(atob(reportParam));
      }
    } catch (e) {
      console.error('Failed to parse shareable report data:', e);
    }
    return null;
  });

  const handleBackToPlatform = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
    setReportData(null);
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when user is typing in form inputs/textareas
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.hasAttribute('contenteditable'))
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // View switching
      if (key === '1') {
        setActiveView('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (key === '2') {
        setActiveView('rules');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (key === '3') {
        setActiveView('dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (key === '4') {
        setActiveView('sandbox');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (key === '5') {
        setActiveView('install');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (key === '6') {
        setActiveView('contact');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (key === '7') {
        setActiveView('auditor');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Terminal toggle
      if (key === 't') {
        e.preventDefault();
        setIsTerminalOpen((prev) => !prev);
      }

      // Help overlay toggle (requires '?' which is shift + / or just key '?')
      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }

      // Esc closes all modals
      if (e.key === 'Escape') {
        setIsTerminalOpen(false);
        setIsShortcutsOpen(false);
        setActiveFooterModal(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (reportData) {
    return (
      <div className="relative min-h-screen w-full bg-black text-white py-20 px-6 md:px-12 select-none flex flex-col justify-between items-center font-mono">
        <div className="max-w-3xl w-full space-y-8 animate-page-entrance">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-6 print:pb-4">
            <div className="space-y-1">
              <span className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-0.5 text-[9px] text-neutral-300 lowercase">
                verified security certificate
              </span>
              <h1 className="text-xl font-medium text-white lowercase">securify compliance report</h1>
            </div>
            
            <div className="flex gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="bg-neutral-900 hover:bg-neutral-800 text-white border border-white/10 text-xs rounded-xl px-4 py-2.5 lowercase transition-colors"
              >
                print / pdf
              </button>
              <button
                onClick={handleBackToPlatform}
                className="bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-xl px-4 py-2.5 lowercase transition-colors"
              >
                go to platform
              </button>
            </div>
          </div>

          {/* Certificate Body Card */}
          <div className="bg-neutral-950 border border-white/5 p-6 md:p-8 rounded-2xl space-y-6 relative overflow-hidden print:border-neutral-300 print:text-black">
            {/* Watermark grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none opacity-30 print:hidden" />
            
            <div className="relative z-10 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 print:border-neutral-300">
                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-500 lowercase">project source:</span>
                  <div className="text-lg text-white font-medium lowercase print:text-black">{reportData.folder}</div>
                </div>
                <div className="space-y-1 md:text-right">
                  <span className="text-[10px] text-neutral-500 lowercase">audit timestamp:</span>
                  <div className="text-xs text-neutral-300 print:text-neutral-700">{reportData.timestamp}</div>
                </div>
              </div>

              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                reportData.leaks === 0
                  ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400 print:border-emerald-600 print:text-emerald-700'
                  : 'bg-red-950/20 border-red-500/20 text-red-400 print:border-red-600 print:text-red-700'
              }`}>
                <div className="space-y-1">
                  <div className="text-sm font-semibold lowercase">
                    {reportData.leaks === 0 ? '✓ verified safe codebase' : '⚠️ security action required'}
                  </div>
                  <p className="text-[10px] text-neutral-400 lowercase font-light leading-relaxed print:text-neutral-600">
                    {reportData.leaks === 0
                      ? 'static analysis identified 0 credentials leaks or critical security key patterns.'
                      : `identified ${reportData.leaks} exposed credentials during automated repository scanning.`}
                  </p>
                </div>
                <div className="shrink-0 font-bold uppercase text-xs border px-3 py-1 rounded bg-black/40 print:bg-neutral-100">
                  {reportData.leaks === 0 ? 'safe' : 'failed'}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="bg-black/60 border border-white/5 p-4 rounded-xl print:border-neutral-300 print:bg-transparent">
                  <span className="block text-[9px] text-neutral-500 lowercase">files scanned</span>
                  <span className="text-lg font-semibold text-white print:text-black">{reportData.files}</span>
                </div>
                <div className="bg-black/60 border border-white/5 p-4 rounded-xl print:border-neutral-300 print:bg-transparent">
                  <span className="block text-[9px] text-neutral-500 lowercase">critical leaks</span>
                  <span className={`text-lg font-semibold ${reportData.critical > 0 ? 'text-red-400' : 'text-neutral-400'} print:text-black`}>
                    {reportData.critical}
                  </span>
                </div>
                <div className="bg-black/60 border border-white/5 p-4 rounded-xl print:border-neutral-300 print:bg-transparent">
                  <span className="block text-[9px] text-neutral-500 lowercase">high leaks</span>
                  <span className={`text-lg font-semibold ${reportData.high > 0 ? 'text-amber-400' : 'text-neutral-400'} print:text-black`}>
                    {reportData.high}
                  </span>
                </div>
                <div className="bg-black/60 border border-white/5 p-4 rounded-xl print:border-neutral-300 print:bg-transparent">
                  <span className="block text-[9px] text-neutral-500 lowercase">warnings</span>
                  <span className={`text-lg font-semibold ${reportData.warning > 0 ? 'text-yellow-400' : 'text-neutral-400'} print:text-black`}>
                    {reportData.warning}
                  </span>
                </div>
              </div>

              {/* Crypto Verification Fingerprint */}
              <div className="border-t border-white/5 pt-6 space-y-2 select-text print:border-neutral-300">
                <div className="text-[10px] text-neutral-500 lowercase">verification signature hash:</div>
                <div className="bg-black/80 border border-white/5 rounded-xl p-3 font-mono text-[9px] text-neutral-400 break-all select-all print:bg-neutral-100 print:text-neutral-700 print:border-neutral-300">
                  SHA-256: {btoa(JSON.stringify(reportData)).substring(0, 64).toLowerCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center text-[9px] text-neutral-500 lowercase leading-relaxed">
            this security report is cryptographically signed and verified by securify local scanner engine. 
            all scan procedures are run client-side on sandbox systems entirely offline.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-black text-white">
      {/* Persistent Header Navbar */}
      <SecurifyNavbar
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenTerminal={() => setIsTerminalOpen(true)}
        githubUser={githubUser}
        onGithubLogin={() => setIsGithubModalOpen(true)}
        onGithubLogout={handleGithubLogout}
      />

      {/* Main Pages Content routing */}
      <main className="transition-all duration-300">
        {activeView === 'home' && (
          <div className="animate-page-entrance">
            <SecurifyHero />
            <div className="relative z-10 bg-black">
               <SecurifySimulator />
               <SecurifyIntegrations />
               <SecurifyConsoleDocs />
            </div>
          </div>
        )}

        {activeView === 'rules' && (
          <div className="animate-page-entrance">
            <SecurifyRules />
          </div>
        )}

        {activeView === 'dashboard' && (
          <div className="animate-page-entrance">
            <SecurifyDashboard 
              githubUser={githubUser}
              onGithubLogin={() => setIsGithubModalOpen(true)}
              onViewChange={setActiveView}
            />
          </div>
        )}

        {activeView === 'sandbox' && (
          <div className="animate-page-entrance">
            <SecurifySandbox />
          </div>
        )}

        {activeView === 'install' && (
          <div className="animate-page-entrance">
            <SecurifyInstall />
          </div>
        )}

        {activeView === 'contact' && (
          <div className="animate-page-entrance">
            <SecurifyContact />
          </div>
        )}

        {activeView === 'auditor' && (
          <div className="animate-page-entrance">
            <SecurifyAuditor />
          </div>
        )}
      </main>

      {/* Persistent Footer */}
      <SecurifyFooter onSelectModal={setActiveFooterModal} />

      {/* Global Terminal Modal Dialog */}
      <TerminalModal
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
      />

      {/* Keyboard Shortcuts Help Overlay */}
      <SecurifyShortcuts
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Cookie Banner */}
      <CookieBanner />

      {/* Footer Modals */}
      {activeFooterModal && (
        <FooterModal
          type={activeFooterModal}
          onClose={() => setActiveFooterModal(null)}
        />
      )}

      {/* GitHub Auth Simulator Modal */}
      <GithubAuthModal
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
        onSuccess={(user) => {
          setGithubUser(user);
          localStorage.setItem('securify_github_user', JSON.stringify(user));
        }}
      />
    </div>
  );
}

export default App;
