import { useState, useEffect } from 'react';

interface ScanReport {
  isSafe: boolean;
  leaks: {
    type: string;
    line: number;
    match: string;
    description: string;
  }[];
}

export const SecurifySandbox = () => {
  const [activeTab, setActiveTab] = useState<'scan' | 'config'>('scan');
  
  // Tab 1: Scanner States
  const [code, setCode] = useState<string>(
    `// Paste your configuration or environment variables here to test.\n// Securify runs completely client-side in this playground.\n\nconst databaseUrl = "postgresql://db_user:password@localhost:5432/main";\nconst stripeKey = "sk_test_51N34ghJkL90AcdSfErtYuiOp";`
  );
  const [report, setReport] = useState<ScanReport>({ isSafe: true, leaks: [] });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Tab 2: Configurator States
  const [entropyThreshold, setEntropyThreshold] = useState<number>(4.5);
  const [failOnSeverity, setFailOnSeverity] = useState<string>('critical');
  const [excludedDirs, setExcludedDirs] = useState<string[]>(['node_modules', 'dist', '.git']);
  const [excludedExts, setExcludedExts] = useState<string[]>(['.json', '.md']);
  const [enabledScanners, setEnabledScanners] = useState({
    aws: true,
    stripe: true,
    github: true,
    gcp: true,
    slack: true,
    postgres: true,
    ssh: true
  });
  const [customDirInput, setCustomDirInput] = useState<string>('');
  const [customExtInput, setCustomExtInput] = useState<string>('');
  const [configCopied, setConfigCopied] = useState<boolean>(false);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCode(text);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const runBrowserScan = (text: string) => {
    const lines = text.split('\n');
    const detectedLeaks: ScanReport['leaks'] = [];

    // AWS Access Key Pattern
    const awsRegex = /AKIA[A-Z0-9]{16}/g;
    // Stripe secret key pattern
    const stripeRegex = /sk_(live|test)_[a-zA-Z0-9]{24}/g;
    // GitHub PAT pattern
    const githubRegex = /ghp_[a-zA-Z0-9]{36}/g;
    // Database URL passwords
    const dbRegex = /postgres(?:ql)?:\/\/([^:]+):([^@]+)@/g;

    lines.forEach((lineText, index) => {
      // Check AWS
      let awsMatch = awsRegex.exec(lineText);
      while (awsMatch) {
        detectedLeaks.push({
          type: 'aws access key id',
          line: index + 1,
          match: awsMatch[0],
          description: 'allows raw authentication to amazon web services cloud nodes.'
        });
        awsMatch = awsRegex.exec(lineText);
      }

      // Check Stripe
      let stripeMatch = stripeRegex.exec(lineText);
      while (stripeMatch) {
        detectedLeaks.push({
          type: 'stripe secret key',
          line: index + 1,
          match: stripeMatch[0],
          description: 'allows API access to execute payments and check transactions.'
        });
        stripeMatch = stripeRegex.exec(lineText);
      }

      // Check GitHub
      let githubMatch = githubRegex.exec(lineText);
      while (githubMatch) {
        detectedLeaks.push({
          type: 'github access token',
          line: index + 1,
          match: githubMatch[0],
          description: 'grants read/write credentials to repositories.'
        });
        githubMatch = githubRegex.exec(lineText);
      }

      // Check Database Passwords
      let dbMatch = dbRegex.exec(lineText);
      while (dbMatch) {
        detectedLeaks.push({
          type: 'database connection secret',
          line: index + 1,
          match: dbMatch[2],
          description: 'exposes database user authentication credentials.'
        });
        dbMatch = dbRegex.exec(lineText);
      }
    });

    setReport({
      isSafe: detectedLeaks.length === 0,
      leaks: detectedLeaks
    });
  };

  useEffect(() => {
    runBrowserScan(code);
  }, [code]);

  // Directory handlers
  const toggleDir = (dir: string) => {
    if (excludedDirs.includes(dir)) {
      setExcludedDirs(excludedDirs.filter(d => d !== dir));
    } else {
      setExcludedDirs([...excludedDirs, dir]);
    }
  };

  const addCustomDir = (e: React.FormEvent) => {
    e.preventDefault();
    if (customDirInput.trim() && !excludedDirs.includes(customDirInput.trim())) {
      setExcludedDirs([...excludedDirs, customDirInput.trim()]);
      setCustomDirInput('');
    }
  };

  // Extension handlers
  const toggleExt = (ext: string) => {
    if (excludedExts.includes(ext)) {
      setExcludedExts(excludedExts.filter(e => e !== ext));
    } else {
      setExcludedExts([...excludedExts, ext]);
    }
  };

  const addCustomExt = (e: React.FormEvent) => {
    e.preventDefault();
    let ext = customExtInput.trim();
    if (ext) {
      if (!ext.startsWith('.')) ext = '.' + ext;
      if (!excludedExts.includes(ext)) {
        setExcludedExts([...excludedExts, ext]);
        setCustomExtInput('');
      }
    }
  };

  // Generate TOML content
  const generateTOML = () => {
    const formattedDirs = excludedDirs.map(d => `"${d}"`).join(', ');
    const formattedExts = excludedExts.map(e => `"${e}"`).join(', ');
    
    return `# securify.toml - configuration parameters
# copy this file into your project root node to apply rules locally.

[engine]
entropy_threshold = ${entropyThreshold.toFixed(1)}
fail_on_severity = "${failOnSeverity}"

[exclude]
directories = [${formattedDirs}]
extensions = [${formattedExts}]

[scanners]
aws = ${enabledScanners.aws}
stripe = ${enabledScanners.stripe}
github = ${enabledScanners.github}
gcp = ${enabledScanners.gcp}
slack = ${enabledScanners.slack}
postgres = ${enabledScanners.postgres}
ssh_keys = ${enabledScanners.ssh}
`;
  };

  const copyConfigToClipboard = () => {
    navigator.clipboard.writeText(generateTOML());
    setConfigCopied(true);
    setTimeout(() => setConfigCopied(false), 2000);
  };

  return (
    <section className="bg-black min-h-screen py-28 px-6 md:px-12 relative overflow-hidden select-none">
      {/* Background grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="max-w-3xl mb-10">
          <span className="inline-block bg-neutral-900 border border-white/10 rounded-full px-4 py-1 text-xs text-neutral-400 lowercase mb-4 tracking-wider">
            developer playground
          </span>
          <h2 className="hero-title text-4xl md:text-5xl font-medium tracking-tight text-white lowercase mb-4">
            interactive leak sandbox.
          </h2>
          <p className="text-neutral-400 text-sm font-light lowercase leading-relaxed max-w-xl">
            test our client-side scanner on files, or visually generate configurations for your pre-commit repository setups.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 mb-8 border-b border-white/5 pb-4">
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all lowercase ${
              activeTab === 'scan'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
            }`}
          >
            leak scanner
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all lowercase ${
              activeTab === 'config'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
            }`}
          >
            config generator (.toml)
          </button>
        </div>

        {activeTab === 'scan' ? (
          /* Tab 1: SCANNER WORKSPACE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Input Text Area (lg:col-span-7) */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`lg:col-span-7 bg-neutral-950 border rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[350px] transition-all duration-300 ${
                isDragging ? 'border-white/40 bg-neutral-900/40 scale-[1.01]' : 'border-white/5'
              }`}
            >
              <div className="px-4 py-3 bg-neutral-900/50 border-b border-white/5 flex justify-between items-center select-none">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-neutral-500 lowercase">sandbox-input.env</span>
                  <span className="text-[9px] text-neutral-600 font-mono">/</span>
                  <label className="text-[10px] font-mono text-neutral-400 hover:text-white cursor-pointer transition-colors underline decoration-white/20">
                    upload local file
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="hidden"
                      accept=".env,.json,.txt,.js,.ts,.py,.go,.yml,.yaml,.md"
                    />
                  </label>
                </div>
                <span className="w-2 h-2 rounded-full bg-neutral-800 animate-pulse"></span>
              </div>
              
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full flex-1 bg-black/60 p-6 font-mono text-xs md:text-sm text-neutral-300 focus:outline-none resize-none leading-relaxed select-text"
                placeholder="// Paste your credentials code block here, or drag & drop/upload a file to scan..."
              />
            </div>

            {/* Audit Report View (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="bg-neutral-950/80 border border-white/5 rounded-2xl p-6 flex-1 flex flex-col justify-between">
                
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 block mb-4 select-none lowercase border-b border-white/5 pb-2">
                    audit analysis report
                  </span>

                  {report.isSafe ? (
                    <div className="space-y-3">
                      <div className="text-emerald-400 font-mono text-sm lowercase">
                        ✔ status: safe code structure
                      </div>
                      <p className="text-neutral-400 text-xs font-light leading-relaxed lowercase">
                        no common cloud api credentials, database tokens, or payment secret signatures were detected in your input space.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-red-400 font-mono text-sm lowercase">
                        ❌ status: leaks discovered ({report.leaks.length})
                      </div>

                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 select-text">
                        {report.leaks.map((leak, idx) => (
                          <div
                            key={idx}
                            className="bg-red-950/20 border border-red-500/20 rounded-xl p-3 space-y-1"
                          >
                            <div className="flex justify-between items-center text-[10px] font-mono text-red-400">
                              <span className="lowercase font-bold">{leak.type}</span>
                              <span>line {leak.line}</span>
                            </div>
                            <code className="block text-[10px] text-neutral-300 break-all select-all font-mono">
                              {leak.match}
                            </code>
                            <p className="text-[9px] text-neutral-500 lowercase leading-relaxed font-light">
                              {leak.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/5 pt-4 mt-6 text-[10px] font-mono text-neutral-600 select-none lowercase leading-normal">
                  sandbox engine runs entirely offline on browser threads. data is not sent to external servers.
                </div>

              </div>
            </div>

          </div>
        ) : (
          /* Tab 2: CONFIG GENERATOR WORKSPACE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch select-text">
            
            {/* Options Panel (lg:col-span-6) */}
            <div className="lg:col-span-6 bg-neutral-950 border border-white/5 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                <span className="text-[10px] font-mono text-neutral-500 block mb-4 select-none lowercase border-b border-white/5 pb-2">
                  rules configurator parameters
                </span>

                {/* Entropy slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-neutral-400">
                    <span className="lowercase">entropy scan threshold:</span>
                    <span className="text-white">{entropyThreshold} bits</span>
                  </div>
                  <input
                    type="range"
                    min="3.0"
                    max="8.0"
                    step="0.5"
                    value={entropyThreshold}
                    onChange={(e) => setEntropyThreshold(parseFloat(e.target.value))}
                    className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <p className="text-[9px] text-neutral-500 lowercase font-light leading-relaxed">
                    lower values catch more generic secrets but increase false flags. higher values scan only high-entropy keys.
                  </p>
                </div>

                {/* Exclude Directories */}
                <div className="space-y-3">
                  <label className="text-xs font-mono text-neutral-400 block lowercase">exclude directories:</label>
                  <div className="flex flex-wrap gap-2">
                    {['node_modules', 'dist', 'build', 'vendor', '.git'].map((dir) => (
                      <button
                        key={dir}
                        onClick={() => toggleDir(dir)}
                        className={`px-2 py-1 rounded text-[10px] font-mono border transition-all lowercase ${
                          excludedDirs.includes(dir)
                            ? 'bg-neutral-900 text-white border-white/20'
                            : 'bg-transparent text-neutral-600 border-white/5 hover:text-neutral-400'
                        }`}
                      >
                        {dir}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={addCustomDir} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="add directory..."
                      value={customDirInput}
                      onChange={(e) => setCustomDirInput(e.target.value)}
                      className="bg-black border border-white/5 rounded-lg px-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-white/20 flex-1 lowercase"
                    />
                    <button type="submit" className="px-3 py-1.5 bg-neutral-900 border border-white/10 text-[10px] text-neutral-400 rounded-lg hover:text-white transition-colors lowercase">
                      add
                    </button>
                  </form>
                </div>

                {/* Exclude Extensions */}
                <div className="space-y-3">
                  <label className="text-xs font-mono text-neutral-400 block lowercase">exclude extensions:</label>
                  <div className="flex flex-wrap gap-2">
                    {['.json', '.md', '.html', '.txt', '.log'].map((ext) => (
                      <button
                        key={ext}
                        onClick={() => toggleExt(ext)}
                        className={`px-2 py-1 rounded text-[10px] font-mono border transition-all lowercase ${
                          excludedExts.includes(ext)
                            ? 'bg-neutral-900 text-white border-white/20'
                            : 'bg-transparent text-neutral-600 border-white/5 hover:text-neutral-400'
                        }`}
                      >
                        {ext}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={addCustomExt} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. .pdf, .yaml..."
                      value={customExtInput}
                      onChange={(e) => setCustomExtInput(e.target.value)}
                      className="bg-black border border-white/5 rounded-lg px-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-white/20 flex-1 lowercase"
                    />
                    <button type="submit" className="px-3 py-1.5 bg-neutral-900 border border-white/10 text-[10px] text-neutral-400 rounded-lg hover:text-white transition-colors lowercase">
                      add
                    </button>
                  </form>
                </div>

                {/* Enabled Scanners */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-neutral-400 block lowercase">scanners to execute:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(enabledScanners).map(([scannerKey, enabled]) => (
                      <label key={scannerKey} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => setEnabledScanners({
                            ...enabledScanners,
                            [scannerKey]: !enabled
                          })}
                          className="w-3.5 h-3.5 rounded bg-black border border-white/10 checked:bg-white accent-white cursor-pointer"
                        />
                        <span className="text-[10px] font-mono text-neutral-400 lowercase">{scannerKey} detector</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Fail severity */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-neutral-400 block lowercase">fail commit severity threshold:</label>
                  <select
                    value={failOnSeverity}
                    onChange={(e) => setFailOnSeverity(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-white/20 lowercase font-mono cursor-pointer"
                  >
                    <option value="critical">abort on critical issues only</option>
                    <option value="high">abort on high & critical issues</option>
                    <option value="warning">abort on warning, high & critical</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 mt-6 text-[10px] font-mono text-neutral-600 select-none lowercase leading-normal">
                options map directly to variables used in the local scanner executable daemon.
              </div>
            </div>

            {/* Generated Code Output (lg:col-span-6) */}
            <div className="lg:col-span-6 bg-neutral-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[420px] justify-between">
              
              <div>
                <div className="px-4 py-3 bg-neutral-900/50 border-b border-white/5 flex justify-between items-center select-none">
                  <span className="text-[10px] font-mono text-neutral-500 lowercase">securify.toml</span>
                  <span className="w-2 h-2 rounded-full bg-neutral-800"></span>
                </div>
                
                <pre className="p-6 font-mono text-xs text-neutral-300 overflow-x-auto leading-relaxed select-all">
                  {generateTOML()}
                </pre>
              </div>

              <div className="p-4 border-t border-white/5 bg-neutral-900/10 flex justify-end">
                <button
                  onClick={copyConfigToClipboard}
                  className={`text-xs font-mono font-medium rounded-xl px-5 py-3 lowercase transition-all select-none ${
                    configCopied 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-white hover:bg-neutral-200 text-black'
                  }`}
                >
                  {configCopied ? 'copied config!' : 'copy configuration'}
                </button>
              </div>

            </div>

          </div>
        )}

      </div>
    </section>
  );
};
