import { useState } from 'react';
import { Zap } from 'lucide-react';
import type { ViewType } from './SecurifyNavbar';

interface Rule {
  id: string;
  name: string;
  category: 'cloud' | 'database' | 'saas' | 'vcs';
  severity: 'critical' | 'high' | 'warning';
  cvss: number;
  description: string;
  regexPattern: string;
  remedy: string;
}

const remediationPlans: Record<string, { steps: string[]; command?: string }> = {
  'sec-001': {
    steps: [
      'revoke the access key id on your AWS IAM Dashboard immediately.',
      'generate temporary credentials using AWS STS for active development.',
      'audit AWS CloudTrail logs to inspect unauthorized API activities.'
    ],
    command: 'aws iam deactivate-user-access-key --access-key-id AKIA...'
  },
  'sec-002': {
    steps: [
      'invalidate the secret key paired with this user in AWS console.',
      'delete any active temporary AWS CLI sessions immediately.',
      'migrate credentials management to AWS Secrets Manager.'
    ]
  },
  'sec-003': {
    steps: [
      'navigate to your Supabase Dashboard -> Settings -> API.',
      'locate the service_role key section and click "Roll key".',
      'update your server-side environment configurations with the newly generated JWT token.'
    ]
  },
  'sec-004': {
    steps: [
      'open Stripe Dashboard -> Developers -> API Keys.',
      'locate the compromised key and click "Revoke Key".',
      'update your project with a new secret key, and ensure you use test keys (sk_test_...) during local development.'
    ]
  },
  'sec-005': {
    steps: [
      'visit GitHub settings -> Developer settings -> Personal access tokens.',
      'find the compromised token and click "Revoke" or "Delete".',
      'purge the key from your local git history using BFG Repo-Cleaner or git-filter-repo.'
    ],
    command: 'git filter-repo --path path_to_file --invert-paths'
  },
  'sec-006': {
    steps: [
      'go to Google Cloud Console -> Credentials.',
      'select the API key and click "Restrict Key".',
      'apply HTTP referrers or IP restrictions to lock authorization permissions to client apps.'
    ]
  },
  'sec-007': {
    steps: [
      'open your Slack workspace integration dashboard.',
      'revoke the active webhook URL endpoint configuration.',
      'migrate slack messaging payloads to a private Slack App credential workflow.'
    ]
  },
  'sec-008': {
    steps: [
      'verify if the flagged token is actually a secret or just a random hash string.',
      'if it is a database password or salt, place it in your local environment file.',
      'if it is false positive, append "# securify:ignore" at the end of the line to bypass scans.'
    ]
  }
};

interface SecurifyRulesProps {
  onViewChange?: (view: ViewType) => void;
}

export const SecurifyRules = ({ onViewChange }: SecurifyRulesProps) => {
  const [search, setSearch] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const rules: Rule[] = [
    {
      id: 'sec-001',
      name: 'aws access key id',
      category: 'cloud',
      severity: 'critical',
      cvss: 9.8,
      description: 'identifies amazon web services credentials used to manage cloud compute, storage, and IAM user policies.',
      regexPattern: 'AKIA[A-Z0-9]{16}',
      remedy: 'revoke token immediately. use AWS IAM Roles or AWS Secrets Manager.'
    },
    {
      id: 'sec-002',
      name: 'aws secret access key',
      category: 'cloud',
      severity: 'critical',
      cvss: 9.8,
      description: 'identifies high-entropy signature key paired with access keys to sign AWS requests.',
      regexPattern: '(?i)aws(.{0,20})?[0-9a-zA-Z\\/+]{40}',
      remedy: 'rotate credential and delete the compromised secret version.'
    },
    {
      id: 'sec-003',
      name: 'supabase service role jwt',
      category: 'database',
      severity: 'critical',
      cvss: 9.3,
      description: 'matches supabase service_role json web tokens containing database root bypass permissions.',
      regexPattern: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\\.[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+',
      remedy: 're-generate the service role key from supabase dashboard and add to environment files.'
    },
    {
      id: 'sec-004',
      name: 'stripe secret api key',
      category: 'saas',
      severity: 'critical',
      cvss: 8.9,
      description: 'matches live stripe payment transaction private keys used to manage customer billing systems.',
      regexPattern: 'sk_(live|test)_[0-9a-zA-Z]{24}',
      remedy: 'expire live key from stripe dashboard. replace with test key (sk_test_...) during local development.'
    },
    {
      id: 'sec-005',
      name: 'github personal access token',
      category: 'vcs',
      severity: 'high',
      cvss: 8.2,
      description: 'matches github repository read/write access tokens linked to user accounts.',
      regexPattern: 'ghp_[a-zA-Z0-9]{36}',
      remedy: 'delete compromised personal token. generate fine-grained repository tokens instead.'
    },
    {
      id: 'sec-006',
      name: 'google cloud api key',
      category: 'cloud',
      severity: 'high',
      cvss: 7.8,
      description: 'matches static credentials access keys used across GCP services like Maps, Firebase, or Translation.',
      regexPattern: 'AIzaSy[a-zA-Z0-9-_]{33}',
      remedy: 'apply http or IP restrictions on GCP console to lock key usage to client endpoints.'
    },
    {
      id: 'sec-007',
      name: 'slack webhook incoming URL',
      category: 'saas',
      severity: 'high',
      cvss: 7.5,
      description: 'matches slack channel integration URLs that allow unauthenticated chat message broadcasts.',
      regexPattern: 'https:\\/\\/hooks\\.slack\\.com\\/services\\/[A-Za-z0-9\\/]+',
      remedy: 'revoke webhook and delete integration. migrate to slack app credentials.'
    },
    {
      id: 'sec-008',
      name: 'generic high-entropy token',
      category: 'database',
      severity: 'warning',
      cvss: 4.3,
      description: 'identifies high-entropy characters (e.g. database credentials, encryption salts) by Shannon entropy formula.',
      regexPattern: 'entropy-shannon >4.5 bits',
      remedy: 'inspect line content. verify string is not a secret or use .securifyignore to exclude.'
    }
  ];

  const filteredRules = rules.filter((rule) => {
    const matchesSearch = rule.name.toLowerCase().includes(search.toLowerCase()) || 
                          rule.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || rule.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopyCommand = async (e: React.MouseEvent, command: string, ruleId: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(command);
      setCopiedId(ruleId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <section className="bg-black min-h-screen py-16 md:py-28 px-4 md:px-12 relative overflow-hidden select-none">
      {/* Grid line background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="max-w-3xl mb-12 text-left">
          <span className="inline-block bg-neutral-900 border border-white/10 rounded-full px-4 py-1 text-xs text-neutral-400 lowercase mb-4 tracking-wider">
            rules database
          </span>
          <h2 className="hero-title text-3xl md:text-5xl font-medium tracking-tight text-white lowercase mb-4">
            what securify detects.
          </h2>
          <p className="text-neutral-400 text-sm font-light lowercase leading-relaxed max-w-xl">
            our open-source scanning rules catalog is updated continuously. click on any rule to view its step-by-step key rotation and remediation guide.
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-10 pb-6 border-b border-white/5">
          {/* Search Box */}
          <div className="w-full md:max-w-xs relative flex items-center">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search patterns (e.g. aws, key)..."
              className="w-full bg-neutral-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 transition-all lowercase"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 text-neutral-500 hover:text-white text-[10px] font-mono lowercase"
              >
                clear
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
            <span className="text-[10px] font-mono text-neutral-500 lowercase mr-1 hidden sm:inline-block">
              showing {filteredRules.length} rules in
            </span>
            <div className="flex flex-wrap gap-2">
              {['all', 'cloud', 'database', 'saas', 'vcs'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all lowercase ${
                    activeCategory === cat
                      ? 'bg-white text-black border-white'
                      : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rules List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-text animate-page-entrance">
          {filteredRules.map((rule) => {
            const isSelected = selectedRuleId === rule.id;
            return (
              <div
                key={rule.id}
                onClick={() => setSelectedRuleId(isSelected ? null : rule.id)}
                className={`bg-neutral-950/80 border rounded-2xl p-6 transition-all duration-300 relative group flex flex-col justify-between cursor-pointer hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(255,255,255,0.03)] hover:bg-neutral-900/10 ${
                  isSelected ? 'border-white/25 bg-neutral-900/40 shadow-[0_0_20px_rgba(255,255,255,0.02)]' : 'border-white/5 hover:border-white/15'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4 select-none">
                    <span className="text-[10px] font-mono text-neutral-500 lowercase">
                      {rule.id}
                    </span>
                    <div className="flex gap-1.5 items-center">
                      <span className="text-[9px] font-mono border border-white/5 bg-neutral-900 px-2 py-0.5 rounded text-neutral-400 lowercase">
                        {rule.category}
                      </span>
                      <span 
                        className={`text-[9px] font-mono px-2 py-0.5 rounded lowercase ${
                          rule.severity === 'critical'
                            ? 'bg-red-950/40 border border-red-500/20 text-red-400'
                            : rule.severity === 'high'
                            ? 'bg-orange-950/40 border border-orange-500/20 text-orange-400'
                            : 'bg-amber-950/40 border border-amber-500/20 text-amber-400'
                        }`}
                      >
                        {rule.severity}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-medium text-white mb-2 lowercase tracking-tight flex items-center justify-between">
                    <span>{rule.name}</span>
                    <span className="text-[10px] font-mono text-neutral-500 group-hover:text-white transition-colors">
                      {isSelected ? 'hide guide ▲' : 'view guide ▼'}
                    </span>
                  </h3>
                  <p className="text-neutral-400 text-xs font-light lowercase leading-relaxed mb-6">
                    {rule.description}
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="font-mono text-[10px] bg-black border border-white/5 p-2 rounded text-neutral-300">
                    <span className="text-neutral-500 block select-none lowercase mb-1">regex format:</span>
                    <code className="whitespace-pre-wrap break-all">{rule.regexPattern}</code>
                  </div>
                  <div className="text-[10px] text-neutral-500 leading-normal lowercase">
                    <span className="text-white font-mono select-none">remedy: </span>
                    {rule.remedy}
                  </div>
                </div>

                {/* Remediation Guide Dropdown */}
                {isSelected && (
                  <div className="mt-6 pt-6 border-t border-white/10 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    
                    {/* CVSS Metric Meter */}
                    <div className="space-y-1 bg-black/40 border border-white/5 rounded-xl p-3">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-neutral-400 lowercase">CVSS Severity Rating</span>
                        <span className="text-white font-medium">{rule.cvss} / 10</span>
                      </div>
                      <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            rule.cvss >= 9.0 
                              ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' 
                              : rule.cvss >= 7.0 
                              ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' 
                              : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                          }`}
                          style={{ width: `${rule.cvss * 10}%` }}
                        />
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-neutral-400 block lowercase tracking-wider flex items-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-400 shrink-0" />
                      step-by-step rotation guide
                    </span>
                    <ol className="list-decimal pl-4 space-y-2 text-[11px] text-neutral-400 lowercase leading-relaxed font-light">
                      {(remediationPlans[rule.id]?.steps || []).map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                    
                    {remediationPlans[rule.id]?.command && (
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[9px] font-mono text-neutral-500 block lowercase">emergency purge command:</span>
                        <div className="flex justify-between items-center bg-black border border-white/5 rounded-lg p-2 font-mono text-[9px] text-neutral-300">
                          <code>{remediationPlans[rule.id]?.command}</code>
                          <button 
                            onClick={(e) => handleCopyCommand(e, remediationPlans[rule.id]?.command || '', rule.id)}
                            className="hover:text-white transition-colors text-[9px] lowercase underline decoration-white/20 shrink-0 ml-2"
                          >
                            {copiedId === rule.id ? 'copied!' : 'copy'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}

          {filteredRules.length === 0 && (
            <div className="col-span-full text-center py-20 text-neutral-500 text-xs font-mono lowercase select-none">
              no scanning rules matched your search query.
            </div>
          )}
        </div>

        {/* Monochromatic Subscription Marketing Hook */}
        <div className="mt-12 p-6 bg-neutral-900/30 border border-white/5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 text-left relative overflow-hidden select-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none opacity-20" />
          <div className="relative z-10 space-y-2 max-w-xl">
            <span className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-0.5 text-[9px] text-neutral-400 uppercase font-mono">
              securify professional
            </span>
            <h4 className="text-base font-medium text-white lowercase">build corporate detection policies.</h4>
            <p className="text-neutral-500 text-xs font-light lowercase leading-relaxed">
              standard accounts use public baseline configurations. upgrade to pro to define tailor-made rulesets, enforce secret scan bounds, and restrict API permissions globally.
            </p>
          </div>
          <button
            onClick={() => {
              if (onViewChange) {
                onViewChange('pricing');
              } else {
                const navItem = document.getElementById('nav-pricing') || document.querySelector('[data-view="pricing"]');
                if (navItem) {
                  (navItem as HTMLButtonElement).click();
                } else {
                  window.location.hash = '#pricing';
                }
              }
            }}
            className="relative z-10 w-full md:w-auto shrink-0 bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl px-6 py-3.5 lowercase transition-all hover:scale-[1.02] active:scale-[0.98] select-none"
          >
            view pro features
          </button>
        </div>

        {/* Custom Rule Suggestion CTA (Marketing Hook) */}
        <div className="mt-6 p-6 bg-neutral-950/60 border border-white/5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 text-left relative overflow-hidden select-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none opacity-10" />
          <div className="relative z-10 space-y-2 max-w-xl">
            <span className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-0.5 text-[9px] text-neutral-400 uppercase font-mono">
              open source community
            </span>
            <h4 className="text-base font-medium text-white lowercase">suggest a scanning rule.</h4>
            <p className="text-neutral-500 text-xs font-light lowercase leading-relaxed">
              need detection for a specific SaaS provider, internal API key, or custom token format? suggest rules to our threat intelligence registry.
            </p>
          </div>
          <button
            onClick={() => {
              if (onViewChange) {
                onViewChange('contact');
              } else {
                const contactBtn = document.getElementById('nav-contact') || document.querySelector('[data-view="contact"]');
                if (contactBtn) {
                  (contactBtn as HTMLButtonElement).click();
                } else {
                  window.location.hash = '#contact';
                }
              }
            }}
            className="relative z-10 w-full md:w-auto shrink-0 bg-neutral-900 hover:bg-neutral-800 text-white border border-white/10 text-xs font-mono font-medium rounded-xl px-6 py-3.5 lowercase transition-all hover:scale-[1.02] active:scale-[0.98] select-none"
          >
            submit suggestion
          </button>
        </div>

      </div>
    </section>
  );
};
