import { useState } from 'react';
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
import { SecurifyFooter } from './components/SecurifyFooter';
import { TerminalModal } from './components/TerminalModal';

function App() {
  const [activeView, setActiveView] = useState<ViewType>('home');
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);

  return (
    <div className="relative min-h-screen w-full bg-black text-white">
      {/* Persistent Header Navbar */}
      <SecurifyNavbar
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenTerminal={() => setIsTerminalOpen(true)}
      />

      {/* Main Pages Content routing */}
      <main className="transition-all duration-300">
        {activeView === 'home' && (
          <div className="animate-in fade-in duration-300">
            <SecurifyHero />
            <div className="relative z-10 bg-black">
              <SecurifySimulator />
              <SecurifyIntegrations />
              <SecurifyConsoleDocs />
            </div>
          </div>
        )}

        {activeView === 'rules' && (
          <div className="animate-in fade-in duration-300">
            <SecurifyRules />
          </div>
        )}

        {activeView === 'dashboard' && (
          <div className="animate-in fade-in duration-300">
            <SecurifyDashboard />
          </div>
        )}

        {activeView === 'sandbox' && (
          <div className="animate-in fade-in duration-300">
            <SecurifySandbox />
          </div>
        )}

        {activeView === 'install' && (
          <div className="animate-in fade-in duration-300">
            <SecurifyInstall />
          </div>
        )}
      </main>

      {/* Persistent Footer */}
      <SecurifyFooter />

      {/* Global Terminal Modal Dialog */}
      <TerminalModal
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
      />
    </div>
  );
}

export default App;
