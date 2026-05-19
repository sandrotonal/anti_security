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
import { SecurifyContact } from './components/SecurifyContact';
import { SecurifyFooter } from './components/SecurifyFooter';
import { TerminalModal } from './components/TerminalModal';
import { CookieBanner } from './components/CookieBanner';
import { FooterModal } from './components/FooterModal';

function App() {
  const [activeView, setActiveView] = useState<ViewType>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('submitted') === 'true' ? 'contact' : 'home';
  });
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);
  const [activeFooterModal, setActiveFooterModal] = useState<'license' | 'security' | 'pgp' | null>(null);

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
            <SecurifyDashboard />
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
      </main>

      {/* Persistent Footer */}
      <SecurifyFooter onSelectModal={setActiveFooterModal} />

      {/* Global Terminal Modal Dialog */}
      <TerminalModal
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
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
    </div>
  );
}

export default App;
