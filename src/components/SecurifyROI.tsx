import { useState } from 'react';
import { GlowCard } from './GlowCard';

export function SecurifyROI() {
  const [developers, setDevelopers] = useState<number>(10);
  const [leakIncidents, setLeakIncidents] = useState<number>(3);
  const [engineerRate, setEngineerRate] = useState<number>(55); // $ per hour average

  // Remediating a credential leak typically takes ~16 hours of developer/ops team time (revocation, rotation, re-deploy, audit)
  const hoursPerLeak = 14;
  // External breach recovery and reputation damage mitigations typically cost ~$4,200 per incident
  const incidentAvgDirectCost = 4200;

  // Math equations
  const totalHoursLost = leakIncidents * hoursPerLeak;
  const timeLostValue = totalHoursLost * engineerRate;
  const directBreachRiskValue = leakIncidents * incidentAvgDirectCost;
  
  // total risk saved
  const totalAnnualSavings = timeLostValue + directBreachRiskValue;

  return (
    <section className="relative py-24 px-4 md:px-10 bg-black overflow-hidden select-none border-t border-white/5">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none opacity-20" />
      
      <div className="max-w-6xl mx-auto space-y-16 relative z-10">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
          <div className="space-y-4 max-w-2xl text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/[0.02] text-neutral-400 text-xs lowercase">
              <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span>financial efficiency calculator</span>
            </span>
            <h2 className="text-3xl md:text-5xl font-light tracking-tight text-white lowercase">
              calculate your security <br />
              <span className="font-medium text-neutral-400">return on investment</span>
            </h2>
          </div>
          <p className="text-sm text-neutral-500 font-light leading-relaxed lowercase max-w-sm md:text-right">
            see how much engineering resources and capital risk you mitigate annually by intercepting credentials leaks locally.
          </p>
        </div>

        {/* Sliders & Outputs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Sliders Input Panel (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-neutral-950/80 border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <span className="text-[10px] font-mono text-neutral-500 block lowercase border-b border-white/5 pb-2">
                input team parameters
              </span>

              {/* Developer Count Slider */}
              <div className="space-y-2 text-left select-text">
                <div className="flex justify-between text-xs font-mono text-neutral-400 lowercase">
                  <span>engineering team size:</span>
                  <span className="text-white font-medium">{developers} devs</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="100"
                  step="1"
                  value={developers}
                  onChange={(e) => setDevelopers(parseInt(e.target.value))}
                  className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>

              {/* Estimated Incidents Slider */}
              <div className="space-y-2 text-left select-text">
                <div className="flex justify-between text-xs font-mono text-neutral-400 lowercase">
                  <span>credential leaks caught/year:</span>
                  <span className="text-white font-medium">{leakIncidents} leaks</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="1"
                  value={leakIncidents}
                  onChange={(e) => setLeakIncidents(parseInt(e.target.value))}
                  className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>

              {/* Hourly Rate Slider */}
              <div className="space-y-2 text-left select-text">
                <div className="flex justify-between text-xs font-mono text-neutral-400 lowercase">
                  <span>average engineer hourly cost:</span>
                  <span className="text-white font-medium">${engineerRate}/hr</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="150"
                  step="5"
                  value={engineerRate}
                  onChange={(e) => setEngineerRate(parseInt(e.target.value))}
                  className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 mt-6 text-[10px] font-mono text-neutral-600 lowercase leading-normal text-left">
              * estimates are based on average git credential breach incident reports and operational response times.
            </div>
          </div>

          {/* Savings Calculations Output (lg:col-span-5) */}
          <div className="lg:col-span-5">
            <GlowCard className="h-full">
              <div className="flex flex-col h-full justify-between space-y-8 text-left select-text">
                <div className="space-y-6">
                  <span className="text-[10px] font-mono text-neutral-500 block lowercase border-b border-white/5 pb-2">
                    calculated annual savings
                  </span>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-neutral-500 lowercase">mitigated financial exposure:</span>
                    <h3 className="text-3xl md:text-4xl font-semibold text-white tracking-tight leading-none">
                      ${totalAnnualSavings.toLocaleString()}
                      <span className="text-xs text-neutral-500 font-light font-mono lowercase"> / year</span>
                    </h3>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-xs font-mono lowercase border-b border-white/[0.03] pb-2">
                      <span className="text-neutral-400">developer hours saved:</span>
                      <span className="text-white">{totalHoursLost} hrs</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono lowercase border-b border-white/[0.03] pb-2">
                      <span className="text-neutral-400">development cost saved:</span>
                      <span className="text-white">${timeLostValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono lowercase border-b border-white/[0.03] pb-2">
                      <span className="text-neutral-400">breach risk mitigated:</span>
                      <span className="text-white">${directBreachRiskValue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 select-none">
                  <button
                    onClick={() => {
                      const navItem = document.getElementById('nav-pricing') || document.querySelector('[data-view="pricing"]');
                      if (navItem) {
                        (navItem as HTMLButtonElement).click();
                      } else {
                        window.location.hash = '#pricing';
                      }
                    }}
                    className="w-full bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl py-3.5 lowercase text-center transition-all block"
                  >
                    deploy hooks & secure code
                  </button>
                  <p className="text-[9px] text-neutral-500 lowercase leading-relaxed text-center">
                    pricing starts at $0 for open source. premium features scale with integrations.
                  </p>
                </div>
              </div>
            </GlowCard>
          </div>

        </div>

      </div>
    </section>
  );
}
