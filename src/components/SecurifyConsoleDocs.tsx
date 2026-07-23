import { useState, useEffect } from 'react';

type TerminalCommand = '--help' | 'rules' | 'bypass' | 'faq' | 'github-ci' | 'gitlab-ci' | 'bitbucket-ci' | 'circle-ci';

export const SecurifyConsoleDocs = () => {
  const [activeCommand, setActiveCommand] = useState<TerminalCommand>('--help');
  const [typedCommand, setTypedCommand] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Support Form State
  const [email, setEmail] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>('');

  const docOutputs: Record<TerminalCommand, string> = {
    '--help': `securify cli v2.4.0\n\nUsage:\n  securify [command] [flags]\n\nCommands:\n  scan          scan files or folder paths for exposed secrets\n  init-hook     generate pre-commit hook files inside .git/hooks\n  bypass        bypass pre-commit scanning check for specific hashes\n  rules         list active scanner detection templates\n  github-ci     output .github/workflows/securify.yml template\n  gitlab-ci     output .gitlab-ci.yml secret scanning pipeline\n  bitbucket-ci  output bitbucket-pipelines.yml configuration\n  circle-ci     output .circleci/config.yml audit workflow\n\nFlags:\n  -h, --help      display help logs\n  -c, --config    path to securify.toml configuration file`,
    'rules': `securify detection rules list:\n\n1. high-entropy-secrets (entropy threshold >4.5 bits)\n   matches database strings, private keys, jwt tokens\n\n2. provider-patterns (regex matching)\n   - aws-access-key-id: "AKIA[A-Z0-9]{16}"\n   - supabase-service-role: "eyJhbGciOiJIUzI1Ni..."\n   - stripe-secret-key: "sk_live_[a-zA-Z0-9]{24}"\n   - github-pat: "ghp_[a-zA-Z0-9]{36}"`,
    'bypass': `how to bypass pre-commit hooks for verified secrets:\n\n1. inline ignore comment:\n   add "# securify:ignore" at the end of the matching source line.\n\n2. secure bypass command:\n   $ securify bypass --commit-hash=b45fc29\n   (adds hash signature to .securify_bypass to skip next scan)`,
    'faq': `frequently asked questions:\n\nQ: does securify upload my files to remote servers?\nA: no. scanning is 100% offline and runs on your local CPU. your credentials remain on your machine.\n\nQ: how fast is the scanning engine?\nA: written in Rust, it processes standard git staging pools in under 20ms.\n\nQ: is this tool free?\nA: yes. securify is licensed under the MIT open-source license and free forever.`,
    'github-ci': `# .github/workflows/securify.yml\nname: Securify Secret Guard\non: [push, pull_request]\njobs:\n  security-audit:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Run Securify Local Scan\n        uses: securify-dev/action@v2\n        with:\n          fail_on_critical: true\n          output_format: sarif`,
    'gitlab-ci': `# .gitlab-ci.yml\nsecurify_security_scan:\n  stage: test\n  image: securify/cli:latest\n  script:\n    - securify scan ./ --format json --output securify-report.json\n  artifacts:\n    reports:\n      secret_detection: securify-report.json`,
    'bitbucket-ci': `# bitbucket-pipelines.yml\npipelines:\n  default:\n    - step:\n        name: Securify Security Check\n        image: securify/cli:latest\n        script:\n          - securify scan ./ -s high`,
    'circle-ci': `# .circleci/config.yml\nversion: 2.1\njobs:\n  securify-audit:\n    docker:\n      - image: cimg/node:20.0\n    steps:\n      - checkout\n      - run: npx @securify/cli scan . --format sarif\nworkflows:\n  security:\n    jobs:\n      - securify-audit`
  };

  useEffect(() => {
    let index = 0;
    setIsTyping(true);
    setTypedCommand('');
    setOutput('');

    const targetCommand = `$ securify ${activeCommand}`;
    const timer = setInterval(() => {
      if (index < targetCommand.length) {
        setTypedCommand((prev) => prev + targetCommand.charAt(index));
        index++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
        setOutput(docOutputs[activeCommand]);
      }
    }, 25);

    return () => clearInterval(timer);
  }, [activeCommand]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('support_submitted') === 'true') {
      // Clear URL parameter immediately
      window.history.replaceState({}, document.title, window.location.pathname);
      setSuccess('inquiry submitted. our team will respond shortly.');
    }
  }, []);

  return (
    <section id="support" className="bg-neutral-950 py-28 px-6 md:px-12 border-t border-white/5 relative">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Area - Interactive Terminal Docs (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <span className="inline-block bg-neutral-900 border border-white/10 rounded-full px-4 py-1 text-xs text-neutral-400 lowercase mb-2 tracking-wider">
            documentation & help
          </span>
          <h2 className="hero-title text-3xl md:text-4xl font-medium tracking-tight text-white lowercase mb-6">
            documentation at your fingertips.
          </h2>

          {/* Preset CLI Buttons */}
          <div className="flex flex-wrap gap-2 py-2 select-none">
            {(['--help', 'rules', 'bypass', 'faq', 'github-ci', 'gitlab-ci', 'bitbucket-ci', 'circle-ci'] as TerminalCommand[]).map((cmd) => (
              <button
                key={cmd}
                onClick={() => !isTyping && setActiveCommand(cmd)}
                disabled={isTyping}
                className={`px-4 py-2 rounded-xl text-xs font-mono border transition-all lowercase ${
                  activeCommand === cmd
                    ? 'bg-white text-black border-white'
                    : 'bg-neutral-900 text-neutral-400 border-white/5 hover:text-white hover:border-white/20'
                }`}
              >
                securify {cmd}
              </button>
            ))}
          </div>

          {/* Terminal Console mockup */}
          <div className="w-full bg-black border border-white/5 rounded-2xl overflow-hidden shadow-2xl font-mono text-xs md:text-sm">
            <div className="px-4 py-3 bg-neutral-900/50 border-b border-white/5 flex items-center gap-1.5 select-none">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 block"></span>
              <span className="text-[10px] text-neutral-500 lowercase ml-2">securify-cli-docs</span>
            </div>
            
            <div className="p-6 min-h-[300px] leading-relaxed text-neutral-300 overflow-x-auto whitespace-pre-wrap break-all select-text">
              <div className="text-white mb-4">
                {typedCommand}
                {isTyping && <span className="animate-pulse ml-0.5">_</span>}
              </div>
              {!isTyping && output && (
                <div className="animate-in fade-in duration-300">
                  {output}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Area - Support/Request Form (lg:col-span-5) */}
        <div className="lg:col-span-5">
          <div className="bg-neutral-900/10 border border-white/5 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
            <h3 className="text-xl font-medium text-white mb-2 lowercase tracking-tight">
              direct inquiry
            </h3>
            <p className="text-neutral-400 text-xs font-light lowercase mb-6 leading-relaxed">
              can't find a solution in our active command log? submit your developer request or question directly.
            </p>

            <iframe name="hidden_iframe_docs" id="hidden_iframe_docs" style={{ display: 'none' }} />
            <form 
              action="https://submify.vercel.app/omeriletisimportfolyo@gmail.com"
              method="POST"
              target="hidden_iframe_docs"
              onSubmit={() => {
                setLoading(true);
                setSuccess('');
                setTimeout(() => {
                  setSuccess('inquiry submitted. our team will respond shortly.');
                  setEmail('');
                  setQuery('');
                  setLoading(false);
                }, 1000);
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="email" className="block text-[10px] text-neutral-500 lowercase mb-1 font-mono">
                  developer email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/60 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 transition-colors lowercase font-mono"
                  placeholder="e.g. omer@securify.dev"
                  required
                />
              </div>

              <div>
                <label htmlFor="query" className="block text-[10px] text-neutral-500 lowercase mb-1 font-mono">
                  inquiry detail
                </label>
                <textarea
                  id="query"
                  name="inquiry_detail"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={4}
                  className="w-full bg-black/60 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 transition-colors lowercase resize-none font-mono"
                  placeholder="write your secure inquiry payload here..."
                  required
                />
              </div>

              {success && (
                <div className={`rounded-lg p-3 text-[11px] font-mono lowercase border ${
                  success.includes('failed') 
                    ? 'bg-red-950/40 border-red-500/30 text-red-400' 
                    : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                }`}>
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black hover:bg-neutral-200 py-3 rounded-lg text-xs font-medium font-mono transition-colors disabled:opacity-50 lowercase"
              >
                {loading ? 'sending...' : 'submit inquiry'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </section>
  );
};
