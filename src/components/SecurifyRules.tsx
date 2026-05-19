import { useState } from 'react';

interface Rule {
  id: string;
  name: string;
  category: 'cloud' | 'database' | 'saas' | 'vcs';
  severity: 'critical' | 'high' | 'warning';
  description: string;
  regexPattern: string;
  remedy: string;
}

export const SecurifyRules = () => {
  const [search, setSearch] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const rules: Rule[] = [
    {
      id: 'sec-001',
      name: 'aws access key id',
      category: 'cloud',
      severity: 'critical',
      description: 'identifies amazon web services credentials used to manage cloud compute, storage, and IAM user policies.',
      regexPattern: 'AKIA[A-Z0-9]{16}',
      remedy: 'revoke token immediately. use AWS IAM Roles or AWS Secrets Manager.'
    },
    {
      id: 'sec-002',
      name: 'aws secret access key',
      category: 'cloud',
      severity: 'critical',
      description: 'identifies high-entropy signature key paired with access keys to sign AWS requests.',
      regexPattern: '(?i)aws(.{0,20})?[0-9a-zA-Z\\/+]{40}',
      remedy: 'rotate credential and delete the compromised secret version.'
    },
    {
      id: 'sec-003',
      name: 'supabase service role jwt',
      category: 'database',
      severity: 'critical',
      description: 'matches supabase service_role json web tokens containing database root bypass permissions.',
      regexPattern: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\\.[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+',
      remedy: 're-generate the service role key from supabase dashboard and add to environment files.'
    },
    {
      id: 'sec-004',
      name: 'stripe secret api key',
      category: 'saas',
      severity: 'critical',
      description: 'matches live stripe payment transaction private keys used to manage customer billing systems.',
      regexPattern: 'sk_(live|test)_[0-9a-zA-Z]{24}',
      remedy: 'expire live key from stripe dashboard. replace with test key (sk_test_...) during local development.'
    },
    {
      id: 'sec-005',
      name: 'github personal access token',
      category: 'vcs',
      severity: 'high',
      description: 'matches github repository read/write access tokens linked to user accounts.',
      regexPattern: 'ghp_[a-zA-Z0-9]{36}',
      remedy: 'delete compromised personal token. generate fine-grained repository tokens instead.'
    },
    {
      id: 'sec-006',
      name: 'google cloud api key',
      category: 'cloud',
      severity: 'high',
      description: 'matches static credentials access keys used across GCP services like Maps, Firebase, or Translation.',
      regexPattern: 'AIzaSy[a-zA-Z0-9-_]{33}',
      remedy: 'apply http or IP restrictions on GCP console to lock key usage to client endpoints.'
    },
    {
      id: 'sec-007',
      name: 'slack webhook incoming URL',
      category: 'saas',
      severity: 'high',
      description: 'matches slack channel integration URLs that allow unauthenticated chat message broadcasts.',
      regexPattern: 'https:\\/\\/hooks\\.slack\\.com\\/services\\/[A-Za-z0-9\\/]+',
      remedy: 'revoke webhook and delete integration. migrate to slack app credentials.'
    },
    {
      id: 'sec-008',
      name: 'generic high-entropy token',
      category: 'database',
      severity: 'warning',
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

  return (
    <section className="bg-black min-h-screen py-28 px-6 md:px-12 relative overflow-hidden select-none">
      {/* Grid line background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <span className="inline-block bg-neutral-900 border border-white/10 rounded-full px-4 py-1 text-xs text-neutral-400 lowercase mb-4 tracking-wider">
            rules database
          </span>
          <h2 className="hero-title text-4xl md:text-5xl font-medium tracking-tight text-white lowercase mb-4">
            what securify detects.
          </h2>
          <p className="text-neutral-400 text-sm font-light lowercase leading-relaxed max-w-xl">
            our open-source scanning rules catalog is updated continuously by security researchers. search our active rules database below.
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-10 pb-6 border-b border-white/5">
          {/* Search Box */}
          <div className="w-full md:max-w-xs relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search patterns (e.g. aws, key)..."
              className="w-full bg-neutral-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 transition-all lowercase"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
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

        {/* Rules List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-text">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              className="bg-neutral-950/80 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all duration-300 relative group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-4 select-none">
                  <span className="text-[10px] font-mono text-neutral-500 lowercase">
                    {rule.id}
                  </span>
                  <div className="flex gap-1.5">
                    <span className="text-[9px] font-mono border border-white/5 bg-neutral-900 px-2 py-0.5 rounded text-neutral-400 lowercase">
                      {rule.category}
                    </span>
                    <span 
                      className={`text-[9px] font-mono px-2 py-0.5 rounded lowercase ${
                        rule.severity === 'critical'
                          ? 'bg-red-950/40 text-red-400 border border-red-500/20'
                          : rule.severity === 'high'
                          ? 'bg-orange-950/40 text-orange-400 border border-orange-500/20'
                          : 'bg-yellow-950/40 text-yellow-400 border border-yellow-500/20'
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-medium text-white mb-2 lowercase tracking-tight">
                  {rule.name}
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
            </div>
          ))}

          {filteredRules.length === 0 && (
            <div className="col-span-full text-center py-20 text-neutral-500 text-xs font-mono lowercase select-none">
              no scanning rules matched your search query.
            </div>
          )}
        </div>

      </div>
    </section>
  );
};
