import { useState } from 'react';

interface SecurifyHomeScannerProps {
  onScanSite: (url: string) => void;
}

export const SecurifyHomeScanner = ({ onScanSite }: SecurifyHomeScannerProps) => {
  const [urlInput, setUrlInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onScanSite(urlInput.trim());
    }
  };

  return (
    <section className="bg-black py-24 px-6 md:px-12 border-t border-white/5 relative overflow-hidden select-none">
      {/* Background Decorative Gradient Glow */}
      <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-48 -right-48 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Block - Marketing and Conversion Angles */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-[10px] text-neutral-400 lowercase select-none">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              live compliance scanner
            </span>
            <h2 className="hero-title text-4xl md:text-5xl font-light tracking-tight text-white lowercase leading-tight">
              is your business website<br />
              <span className="text-neutral-500">fully secured & compliant?</span>
            </h2>
            <p className="text-neutral-400 text-sm md:text-base font-light lowercase max-w-xl leading-relaxed">
              enter your business domain name below. securify will inspect security headers, SSL status, and calculate regulatory compliance & data breach financial risks in under 10 seconds.
            </p>

            {/* Benefit Bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              {[
                { title: 'zero data retention', desc: '100% secure scanning logic.' },
                { title: 'instant score rating', desc: 'compliance grade from A+ to F.' },
                { title: 'compliance audit', desc: 'GDPR, KVKK, and PCI-DSS v4.' },
                { title: 'remediation configs', desc: 'nginx, next.js, express patches.' }
              ].map((benefit, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-5 h-5 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="space-y-0.5 text-left">
                    <span className="block text-xs font-semibold text-white lowercase">{benefit.title}</span>
                    <span className="block text-[10px] text-neutral-500 lowercase">{benefit.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Input Form Block - Glassmorphic Call to Action */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-neutral-950/60 border border-white/5 backdrop-blur-sm rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-indigo-500/5 opacity-50 pointer-events-none" />
              
              <div className="space-y-1 text-left relative z-10">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">compliance checklist</span>
                <h4 className="text-sm font-semibold text-white lowercase">run domain security audit</h4>
                <p className="text-neutral-500 text-[11px] font-light lowercase leading-relaxed">
                  test your live environment for missing headers, frame-ancestors, mime sniffing, and referrer policies.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 relative z-10 w-full">
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="e.g. yourdomain.com"
                    className="w-full bg-black border border-white/10 text-white text-xs font-mono rounded-xl px-4 py-3.5 focus:outline-none focus:border-white/20 placeholder-neutral-600 w-full lowercase transition-colors"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={!urlInput.trim()}
                  className="w-full bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl py-3.5 lowercase transition-all select-none disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  audit website compliance
                </button>
              </form>

              <div className="text-[9px] text-neutral-600 text-center font-light lowercase relative z-10">
                no installation required · instant reporting · secure & private
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
