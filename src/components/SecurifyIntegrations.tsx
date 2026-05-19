
interface PipelineStep {
  step: string;
  title: string;
  description: string;
  codeBlock?: string;
  tag: string;
}

export const SecurifyIntegrations = () => {
  const steps: PipelineStep[] = [
    {
      step: '01',
      title: 'local binary scan',
      description: 'compiled as a lightweight native binary. scans file systems and directory structures locally with near-instant execution.',
      codeBlock: '$ securify scan .',
      tag: 'cli'
    },
    {
      step: '02',
      title: 'git hooks gateway',
      description: 'hooks directly into the git lifecycles. aborts the commit operation automatically if any api key patterns are identified.',
      codeBlock: '$ securify init-hook',
      tag: 'pre-commit'
    },
    {
      step: '03',
      title: 'ci/cd integration gate',
      description: 'enforces repository compliance policies. blocks pull request merges on remote environments if tokens are found.',
      codeBlock: '- name: run scan\n  uses: securify/action@v2',
      tag: 'github actions'
    },
    {
      step: '04',
      title: 'webhooks dispatcher',
      description: 'delivers immediate payloads to slack, teams, or discord channels the instant leaks are detected in the repository history.',
      codeBlock: 'POST https://api.securify.dev/webhook',
      tag: 'notifications'
    }
  ];

  return (
    <section id="solutions" className="bg-neutral-950 py-28 px-6 md:px-12 border-t border-white/5 relative">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Area - Text (lg:col-span-5) */}
        <div className="lg:col-span-5 lg:sticky lg:top-28">
          <span className="inline-block bg-neutral-900 border border-white/10 rounded-full px-4 py-1 text-xs text-neutral-400 lowercase mb-4 tracking-wider">
            integration pipeline
          </span>
          <h2 className="hero-title text-4xl md:text-5xl font-medium tracking-tight text-white lowercase mb-6">
            continuous guard.
          </h2>
          <p className="text-neutral-400 text-sm font-light lowercase leading-relaxed mb-8">
            securify runs locally and globally. it shields credentials in real-time from the moment you write code on your machine up to the deployment release in cloud servers.
          </p>
          <a
            href="https://github.com/sandrotonal/anti_security#integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-white hover:text-neutral-300 text-sm lowercase border-b border-white/20 pb-1 hover:border-white transition-all select-none"
          >
            view configuration guide
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>

        {/* Right Area - Connected Pipeline (lg:col-span-7) */}
        <div className="lg:col-span-7 relative pl-6 md:pl-10 select-none">
          {/* Vertical Pipeline Line */}
          <div className="absolute left-1 md:left-3 top-2 bottom-2 w-px bg-gradient-to-b from-white/20 via-white/5 to-transparent" />

          <div className="space-y-12">
            {steps.map((item) => (
              <div key={item.step} className="relative group">
                
                {/* Node Dot */}
                <div className="absolute -left-[25px] md:-left-[33px] top-1.5 w-2 h-2 rounded-full bg-neutral-800 border border-white/40 group-hover:bg-white group-hover:scale-125 transition-all duration-300 shadow-lg" />

                {/* Step Content */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-neutral-500">{item.step}</span>
                    <h3 className="text-lg md:text-xl font-medium text-white lowercase tracking-tight">
                      {item.title}
                    </h3>
                    <span className="text-[9px] font-mono bg-neutral-900 border border-white/5 text-neutral-500 rounded px-2 py-0.5 lowercase">
                      {item.tag}
                    </span>
                  </div>
                  
                  <p className="text-neutral-400 text-xs md:text-sm font-light lowercase leading-relaxed max-w-xl">
                    {item.description}
                  </p>

                  {item.codeBlock && (
                    <div className="max-w-md bg-black/60 border border-white/5 rounded-xl p-3.5 font-mono text-[11px] text-neutral-400 group-hover:border-white/10 transition-colors shadow-xl select-text overflow-x-auto min-w-0">
                      <pre className="whitespace-pre-wrap break-all">{item.codeBlock}</pre>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
