import { useState, useEffect } from 'react';

interface SubscriptionRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, details: { email: string; plan: string; expiresAt: number }) => void;
}

export const SubscriptionRestoreModal = ({ isOpen, onClose, onSuccess }: SubscriptionRestoreModalProps) => {
  const [email, setEmail] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [step, setStep] = useState<'input' | 'verifying' | 'success'>('input');
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setEmail('');
      setTransactionId('');
      setErrorMsg('');
      setProgressMsg('');
      setProgressPercent(0);
    }
  }, [isOpen]);

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

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !transactionId.trim()) return;

    setStep('verifying');
    setProgressPercent(10);
    setProgressMsg('connecting to billing security portal...');

    try {
      // Step 1: Call verify API
      const res = await fetch('/api/verify-paddle-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: transactionId.trim(),
          email: email.trim().toLowerCase(),
        }),
      });

      setProgressPercent(35);
      await new Promise(r => setTimeout(r, 400));

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'fatura doğrulanamadı. lütfen girdiğiniz bilgileri kontrol edin.');
      }

      const data = await res.json();
      
      const verificationSteps = [
        { msg: 'verifying transaction status with paddle api...', pct: 60 },
        { msg: 'extracting customer subscription metadata...', pct: 80 },
        { msg: 'generating cryptographic token...', pct: 95 }
      ];

      for (let i = 0; i < verificationSteps.length; i++) {
        setProgressMsg(verificationSteps[i].msg);
        const startPct = i === 0 ? 35 : verificationSteps[i - 1].pct;
        const endPct = verificationSteps[i].pct;

        for (let p = startPct; p <= endPct; p += 2) {
          setProgressPercent(p);
          await new Promise((resolve) => setTimeout(resolve, 15));
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      setProgressPercent(100);
      setStep('success');
      await new Promise(r => setTimeout(r, 800));

      // Decode JWT fields locally to fetch plan metadata
      const payloadBase64 = data.token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));

      localStorage.setItem('securify_premium_token', data.token);
      onSuccess(data.token, {
        email: payload.email,
        plan: payload.plan,
        expiresAt: payload.expiresAt
      });
      onClose();
    } catch (err: any) {
      setStep('input');
      setProgressPercent(0);
      setErrorMsg(err.message || 'bağlantı hatası oluştu. lütfen daha sonra tekrar deneyin.');
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
        
        {/* Decorative Grid & Blur */}
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
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium text-white lowercase">restore premium subscription</h3>
              <p className="text-neutral-400 text-xs font-light lowercase leading-relaxed">
                enter your paddle transaction id and email address to activate pro or agency access on this device.
              </p>
            </div>

            <form onSubmit={handleRestore} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 lowercase block pl-1">
                  email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-white/25 transition-colors lowercase"
                  placeholder="e.g. dev@yourdomain.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 lowercase block pl-1">
                  paddle transaction ID / subscription ID
                </label>
                <input
                  type="text"
                  required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-white/25 transition-colors"
                  placeholder="e.g. txn_3d9c12a84fb..."
                />
                <span className="text-[9px] text-neutral-500 block pl-1 lowercase leading-relaxed font-light">
                  found on checkout completion screen or receipt email.
                </span>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="bg-red-950/40 border border-red-500/25 text-red-400 text-xs font-mono rounded-xl p-3 lowercase text-center">
                  {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl py-3.5 lowercase transition-all select-none flex items-center justify-center gap-2"
              >
                verify & activate
              </button>
            </form>
          </div>
        )}

        {step === 'verifying' && (
          <div className="relative z-10 py-10 flex flex-col items-center justify-center space-y-8 text-center animate-in fade-in duration-300">
            {/* Pulsing ring animation */}
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-75" />
              <div className="w-14 h-14 bg-neutral-900 border border-emerald-500/30 rounded-full flex items-center justify-center shadow-lg relative z-10 animate-pulse text-emerald-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>

            <div className="space-y-3 max-w-xs">
              <h3 className="text-sm font-medium text-white lowercase tracking-wide">
                verifying access token ({progressPercent}%)
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
            <div className="w-12 h-12 bg-emerald-950 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 text-lg shadow-lg">
              ✓
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-white lowercase">license key matched</h3>
              <p className="text-neutral-400 text-xs lowercase">
                premium features activated. welcome to securify!
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
