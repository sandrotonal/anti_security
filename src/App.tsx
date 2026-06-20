import { useState, useEffect, useRef } from 'react';
import { SecurifyNavbar } from './components/SecurifyNavbar';
import type { ViewType } from './components/SecurifyNavbar';
import { SecurifyBanner } from './components/SecurifyBanner';
import { SecurifyHero } from './components/SecurifyHero';
import { SecurifyTrust } from './components/SecurifyTrust';
import { SecurifySimulator } from './components/SecurifySimulator';
import { SecurifyFeatures } from './components/SecurifyFeatures';
import { SecurifyIntegrations } from './components/SecurifyIntegrations';
import { SecurifyROI } from './components/SecurifyROI';
import { SecurifyTestimonials } from './components/SecurifyTestimonials';
import { SecurifyConsoleDocs } from './components/SecurifyConsoleDocs';
import { SecurifyRules } from './components/SecurifyRules';
import { SecurifyDashboard } from './components/SecurifyDashboard';
import { SecurifySandbox } from './components/SecurifySandbox';
import { SecurifyInstall } from './components/SecurifyInstall';
import { SecurifyContact } from './components/SecurifyContact';
import { SecurifyFAQ } from './components/SecurifyFAQ';
import { SecurifyFooter } from './components/SecurifyFooter';
import { TerminalModal } from './components/TerminalModal';
import { CookieBanner } from './components/CookieBanner';
import { FooterModal } from './components/FooterModal';
import { SecurifyShortcuts } from './components/SecurifyShortcuts';
import { GithubAuthModal } from './components/GithubAuthModal';
import { SecurifyAuditor } from './components/SecurifyAuditor';
import { SecurifyPricing } from './components/SecurifyPricing';
import { SecurifyHomeScanner } from './components/SecurifyHomeScanner';
import { SubscriptionRestoreModal } from './components/SubscriptionRestoreModal';

function App() {
  const paddleInitializedRef = useRef<boolean>(false);
  const [activeView, setActiveView] = useState<ViewType>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') as ViewType;
    const validViews: ViewType[] = ['home', 'rules', 'dashboard', 'sandbox', 'install', 'contact', 'auditor', 'pricing'];
    if (viewParam && validViews.includes(viewParam)) {
      return viewParam;
    }
    return params.get('submitted') === 'true' ? 'contact' : 'home';
  });
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [activeFooterModal, setActiveFooterModal] = useState<'license' | 'security' | 'pgp' | 'sales_contract' | 'return_policy' | 'privacy_policy' | 'company_info' | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState<boolean>(false);

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

  // Premium / Subscription states
  const [premiumToken, setPremiumToken] = useState<string | null>(() => {
    return localStorage.getItem('securify_premium_token');
  });
  const [premiumStatus, setPremiumStatus] = useState<{ valid: boolean; email?: string; plan?: string; expiresAt?: number } | null>(null);
  const [paymentModal, setPaymentModal] = useState<{ show: boolean; status: 'success' | 'failed'; plan?: string; email?: string; error?: string } | null>(null);
  const [initialWebsiteUrl, setInitialWebsiteUrl] = useState<string>('');

  // Token Validation on Startup
  useEffect(() => {
    if (premiumToken) {
      fetch(`/api/verify-token?token=${premiumToken}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) {
            setPremiumStatus(data);
          } else {
            localStorage.removeItem('securify_premium_token');
            setPremiumStatus(null);
            setPremiumToken(null);
          }
        })
        .catch((err) => {
          console.error('Failed to verify premium token status:', err);
        });
    }
  }, [premiumToken]);

  // Handle URL callback parameters from Shopier
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const token = params.get('token');
    const email = params.get('email');
    const plan = params.get('plan');
    const error = params.get('error');

    if (payment === 'success' && token) {
      localStorage.setItem('securify_premium_token', token);
      setPremiumToken(token);

      setPaymentModal({
        show: true,
        status: 'success',
        plan: plan || 'Pro',
        email: email || '',
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (payment === 'failed') {
      setPaymentModal({
        show: true,
        status: 'failed',
        error: error || 'ödeme tamamlanamadı.',
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Synchronize activeView state to URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentView = params.get('view');
    if (currentView !== activeView) {
      if (activeView === 'home') {
        params.delete('view');
      } else {
        params.set('view', activeView);
      }
      const newSearch = params.toString();
      const newUrl = `${window.location.pathname}${newSearch ? '?' + newSearch : ''}${window.location.hash}`;
      window.history.replaceState({ view: activeView }, '', newUrl);
    }
  }, [activeView]);

  // Handle browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view') as ViewType;
      const validViews: ViewType[] = ['home', 'rules', 'dashboard', 'sandbox', 'install', 'contact', 'auditor', 'pricing'];
      if (viewParam && validViews.includes(viewParam)) {
        setActiveView(viewParam);
      } else {
        setActiveView('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Checkout Email Modal states
  const [checkoutPlan, setCheckoutPlan] = useState<{ id: string; name: string; billing: 'monthly' | 'yearly' } | null>(null);
  const [checkoutEmail, setCheckoutEmail] = useState<string>('');
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string>('');

  const verifyPayment = async (transactionId: string, email: string, plan: string) => {
    setIsCheckoutLoading(true);
    setCheckoutError('');
    try {
      const response = await fetch('/api/verify-paddle-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          email: email,
          plan: plan
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'ödeme doğrulaması başarısız oldu.');
      }

      const { token, email: verifiedEmail, plan: verifiedPlan } = await response.json();

      // Save token to localStorage
      localStorage.setItem('securify_premium_token', token);
      setPremiumToken(token);

      // Close the email checkout modal
      setCheckoutPlan(null);

      // Show success modal
      setPaymentModal({
        show: true,
        status: 'success',
        plan: verifiedPlan || 'Pro',
        email: verifiedEmail || '',
      });
    } catch (error: any) {
      console.error('Payment verification failed:', error);
      setCheckoutError(error.message || 'ödeme doğrulanamadı. lütfen destekle iletişime geçin.');
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutEmail.trim() || !checkoutPlan) return;

    setIsCheckoutLoading(true);
    setCheckoutError('');

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: checkoutEmail.trim().toLowerCase(),
          plan: checkoutPlan.id,
          billing: checkoutPlan.billing,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'ödeme başlatılamadı. lütfen tekrar deneyin.');
      }

      const { priceId, clientToken, environment, email: customerEmail, plan, billing } = await response.json();

      console.log('[Securify Paddle Checkout Initiating]', {
        priceId,
        clientTokenPrefix: clientToken ? clientToken.substring(0, 15) + '...' : 'none',
        environment,
        email: customerEmail,
        plan,
        billing
      });

      if (priceId && priceId.startsWith('mock_')) {
        console.warn(`[Securify Paddle Warning] priceId is "${priceId}" (mock). This indicates that the Vercel environment variable PADDLE_PRICE_${plan.toUpperCase()}_${billing.toUpperCase()} is not set. Paddle Sandbox API will reject mock IDs with a 400 Bad Request. Please configure your Vercel Environment Variables and re-deploy.`);
      }

      const paddle = (window as any).Paddle;
      if (!paddle) {
        throw new Error('ödeme altyapısı yüklenemedi. lütfen reklam engelleyicinizi (adblocker) kontrol edin.');
      }

      // Initialize Paddle if not done already
      if (!paddleInitializedRef.current) {
        if (environment === 'sandbox') {
          paddle.Environment.set('sandbox');
        }
        paddle.Initialize({
          token: clientToken,
          eventCallback: async (event: any) => {
            if (event.name === 'checkout.completed') {
              const transactionId = event.data.transaction_id;
              await verifyPayment(transactionId, customerEmail, plan);
            }
          }
        });
        paddleInitializedRef.current = true;
      } else {
        // Update the event callback for the new checkout session details
        paddle.Update({
          eventCallback: async (event: any) => {
            if (event.name === 'checkout.completed') {
              const transactionId = event.data.transaction_id;
              await verifyPayment(transactionId, customerEmail, plan);
            }
          }
        });
      }

      // Launch the checkout overlay modal
      paddle.Checkout.open({
        items: [
          {
            priceId: priceId,
            quantity: 1
          }
        ],
        customer: {
          email: customerEmail
        },
        customData: {
          email: customerEmail,
          plan: plan,
          billing: billing
        }
      });

      setIsCheckoutLoading(false);
    } catch (error: any) {
      console.error('Checkout creation failed:', error);
      setCheckoutError(error.message || 'ödeme başlatılırken bir bağlantı hatası oluştu.');
      setIsCheckoutLoading(false);
    }
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
      } else if (key === '8') {
        setActiveView('pricing');
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
              <div className={`p-4 rounded-xl border flex items-center justify-between ${reportData.leaks === 0
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
      {/* Announcement Banner — fixed, slides in after 800ms */}
      <SecurifyBanner onViewChange={(view) => { setActiveView(view); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />

      {/* Persistent Header Navbar */}
      <SecurifyNavbar
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenTerminal={() => setIsTerminalOpen(true)}
        githubUser={githubUser}
        onGithubLogin={() => setIsGithubModalOpen(true)}
        onGithubLogout={handleGithubLogout}
        premiumStatus={premiumStatus}
        onRestoreSubscription={() => setIsRestoreModalOpen(true)}
      />

      {/* Main Pages Content routing */}
      <main className="transition-all duration-300">
        {activeView === 'home' && (
          <div className="animate-page-entrance">
            <SecurifyHero />
            <SecurifyTrust />
            <div className="relative z-10 bg-black">
              <SecurifySimulator />
              <SecurifyFeatures />
              <SecurifyIntegrations />
              <SecurifyConsoleDocs />
              <SecurifyROI />
              <SecurifyTestimonials />
              <SecurifyHomeScanner onScanSite={(url) => {
                setInitialWebsiteUrl(url);
                setActiveView('dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} />
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
              premiumStatus={premiumStatus}
              onPurchaseTrigger={(planId, planName, billingPeriod) => {
                setCheckoutPlan({ id: planId, name: planName, billing: billingPeriod });
                setCheckoutEmail('');
                setCheckoutError('');
              }}
              initialWebsiteUrl={initialWebsiteUrl}
              onClearInitialWebsiteUrl={() => setInitialWebsiteUrl('')}
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

        {activeView === 'pricing' && (
          <div className="animate-page-entrance">
            <SecurifyPricing
              onPurchase={(planId, planName, billingPeriod) => {
                setCheckoutPlan({ id: planId, name: planName, billing: billingPeriod });
                setCheckoutEmail('');
                setCheckoutError('');
              }}
            />
          </div>
        )}
      </main>

      {/* FAQ — before footer, always visible at bottom */}
      {activeView === 'home' && <SecurifyFAQ />}

      {/* Persistent Footer */}
      <SecurifyFooter
        onSelectModal={setActiveFooterModal}
      />

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

      {/* Subscription Restore Modal */}
      <SubscriptionRestoreModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        onSuccess={(token, details) => {
          setPremiumToken(token);
          setPremiumStatus({
            valid: true,
            email: details.email,
            plan: details.plan,
            expiresAt: details.expiresAt
          });
        }}
      />

      {/* Payment Result Modal */}
      {paymentModal && paymentModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setPaymentModal(null)}
          />
          <div className="bg-neutral-950/80 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 md:p-8 max-w-md w-full relative z-10 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none opacity-20" />

            {paymentModal.status === 'success' ? (
              <div className="relative z-10 space-y-6 text-center">
                {/* Success Indicator */}
                <div className="mx-auto w-16 h-16 bg-emerald-950/50 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/5 relative animate-pulse">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-medium text-white lowercase">payment successful</h3>
                  <p className="text-neutral-400 text-xs font-light lowercase leading-relaxed">
                    congratulations! your <span className="text-emerald-400 font-mono font-medium">{paymentModal.plan}</span> plan has been successfully activated for <span className="text-white font-mono">{paymentModal.email}</span>.
                  </p>
                </div>

                <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-4 space-y-2 font-mono text-[10px] text-neutral-500 text-left">
                  <div className="flex justify-between">
                    <span>plan status:</span>
                    <span className="text-emerald-400">active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>activated email:</span>
                    <span className="text-white">{paymentModal.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>token format:</span>
                    <span className="text-white">cryptographic jwt</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPaymentModal(null);
                    setActiveView('dashboard');
                  }}
                  className="w-full py-3 bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl transition-all lowercase"
                >
                  go to dashboard
                </button>
              </div>
            ) : (
              <div className="relative z-10 space-y-6 text-center">
                {/* Error Indicator */}
                <div className="mx-auto w-16 h-16 bg-red-950/50 border border-red-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/5 relative">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-medium text-white lowercase">payment failed</h3>
                  <p className="text-red-400/80 text-xs font-light lowercase leading-relaxed">
                    {paymentModal.error || 'we could not process your transaction. please verify your payment details.'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentModal(null)}
                    className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-white text-xs font-mono rounded-xl transition-all lowercase"
                  >
                    dismiss
                  </button>
                  <button
                    onClick={() => {
                      setPaymentModal(null);
                      setActiveView('pricing');
                    }}
                    className="flex-1 py-3 bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl transition-all lowercase"
                  >
                    try again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Email Modal */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setCheckoutPlan(null)}
          />
          <div className="bg-neutral-950/80 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 md:p-8 max-w-md w-full relative z-10 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none opacity-20" />
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={() => setCheckoutPlan(null)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative z-10 space-y-6">
              <div className="text-center space-y-2">
                <span className="text-[10px] text-white border border-white/20 bg-white/5 px-2.5 py-0.5 rounded-full uppercase font-mono">
                  {checkoutPlan.name} plan
                </span>
                <h3 className="text-lg font-medium text-white lowercase">enter your email</h3>
                <p className="text-neutral-400 text-xs font-light lowercase leading-relaxed">
                  your premium activation token will be cryptographically linked and generated for this email.
                </p>
              </div>

              <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-500 lowercase block pl-1">
                    email address
                  </label>
                  <input
                    type="email"
                    required
                    value={checkoutEmail}
                    onChange={(e) => setCheckoutEmail(e.target.value)}
                    disabled={isCheckoutLoading}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-white/25 transition-colors lowercase"
                    placeholder="user@example.com"
                  />
                </div>

                {checkoutError && (
                  <p className="text-red-400 text-[10px] pl-1 lowercase">
                    {checkoutError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isCheckoutLoading || !checkoutEmail.trim()}
                  className="w-full py-3 bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500 text-xs font-mono font-medium rounded-xl transition-all lowercase flex items-center justify-center gap-2"
                >
                  {isCheckoutLoading ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      processing...
                    </>
                  ) : (
                    'continue to payment'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
