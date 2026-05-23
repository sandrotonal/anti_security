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
  const [activeTab, setActiveTab] = useState<'scan' | 'config' | 'entropy' | 'secrets' | 'custom-rule'>('scan');
  
  // Tab 3: Entropy Calculator States
  const [entropyInput, setEntropyInput] = useState<string>('sk_test_51N34ghJkL90AcdSfErtYuiOp');

  // Tab 1: Scanner States
  const [code, setCode] = useState<string>(
    `// Paste your configuration or environment variables here to test.\n// Securify runs completely client-side in this playground.\n\nconst databaseUrl = "postgresql://db_user:password@localhost:5432/main";\nconst stripeKey = "sk_test_51N34ghJkL90AcdSfErtYuiOp";`
  );
  const [report, setReport] = useState<ScanReport>({ isSafe: true, leaks: [] });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const exportJSONReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      status: report.isSafe ? 'SAFE' : 'COMPROMISED',
      leaksCount: report.leaks.length,
      leaks: report.leaks,
      codeSnippet: code
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `securify-sandbox-report-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportHTMLReport = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Securify - Sandbox Security Audit Report</title>
  <style>
    body {
      background-color: #000;
      color: #fff;
      font-family: monospace;
      padding: 40px;
      margin: 0;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #222;
      border-radius: 12px;
      padding: 30px;
      background: #050505;
    }
    h1 {
      font-size: 20px;
      border-bottom: 1px solid #222;
      padding-bottom: 15px;
      margin-bottom: 20px;
      font-weight: normal;
      color: #fff;
    }
    .meta {
      font-size: 12px;
      color: #666;
      margin-bottom: 25px;
      line-height: 1.6;
    }
    .status {
      font-size: 14px;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 25px;
      font-weight: bold;
    }
    .status.compromised {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .status.safe {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .leak-card {
      border: 1px solid rgba(239, 68, 68, 0.2);
      background: rgba(239, 68, 68, 0.03);
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
    }
    .leak-header {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: bold;
      color: #ef4444;
      margin-bottom: 8px;
    }
    .leak-match {
      background: #000;
      border: 1px solid #111;
      padding: 8px;
      font-size: 11px;
      color: #e5e5e5;
      display: block;
      word-break: break-all;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .leak-desc {
      font-size: 11px;
      color: #666;
    }
    .footer {
      margin-top: 40px;
      border-top: 1px solid #222;
      padding-top: 15px;
      font-size: 10px;
      color: #444;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Securify Sandbox Audit Report</h1>
    <div class="meta">
      Generated On: ${new Date().toLocaleString()}<br>
      Engine: Securify Client-Side Sandbox (v1.0.0)<br>
      Target Scan Code Length: ${code.length} characters
    </div>

    <div class="status ${report.isSafe ? 'safe' : 'compromised'}">
      Status: ${report.isSafe ? 'SAFE CODE STRUCTURE' : 'COMPROMISED'}
    </div>

    ${report.leaks.map(leak => `
      <div class="leak-card">
        <div class="leak-header">
          <span>${leak.type.toUpperCase()}</span>
          <span>LINE ${leak.line}</span>
        </div>
        <code class="leak-match">${leak.match}</code>
        <div class="leak-desc">${leak.description}</div>
      </div>
    `).join('')}

    <div class="footer">
      This security report was generated entirely client-side. Securify does not store or transmit codebase contents.
    </div>
  </div>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `securify-sandbox-report-${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const applyRulePreset = (name: string, regex: string, desc: string, sample: string) => {
    setRuleName(name);
    setRuleRegex(regex);
    setRuleDescription(desc);
    setTestText(sample);
  };

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

  // Tab 4: Secrets Generator States
  const [genLength, setGenLength] = useState<number>(32);
  const [genUpper, setGenUpper] = useState<boolean>(true);
  const [genLower, setGenLower] = useState<boolean>(true);
  const [genNumbers, setGenNumbers] = useState<boolean>(true);
  const [genSymbols, setGenSymbols] = useState<boolean>(true);
  const [genPrefix, setGenPrefix] = useState<'none' | 'stripe_test' | 'stripe_live' | 'securify' | 'custom'>('none');
  const [customPrefixVal, setCustomPrefixVal] = useState<string>('');
  const [generatedSecret, setGeneratedSecret] = useState<string>('');
  const [secretCopied, setSecretCopied] = useState<boolean>(false);

  // Tab 5: Custom Rule Tester States
  const [ruleName, setRuleName] = useState<string>('my-custom-token');
  const [ruleRegex, setRuleRegex] = useState<string>('sec_secret_[a-zA-Z0-9]{16}');
  const [ruleDescription, setRuleDescription] = useState<string>('detects custom company authentication tokens');
  const [testText, setTestText] = useState<string>('const token = "sec_secret_A1b2C3d4E5f6G7h8";');
  const [ruleCopied, setRuleCopied] = useState<boolean>(false);

  const generateSecretValue = () => {
    let chars = '';
    if (genUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (genLower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (genNumbers) chars += '0123456789';
    if (genSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';
    
    let result = '';
    const array = new Uint32Array(genLength);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < genLength; i++) {
      result += chars[array[i] % chars.length];
    }
    
    let finalPrefix = '';
    if (genPrefix === 'stripe_test') finalPrefix = 'sk_test_';
    else if (genPrefix === 'stripe_live') finalPrefix = 'sk_live_';
    else if (genPrefix === 'securify') finalPrefix = 'sec_key_';
    else if (genPrefix === 'custom') finalPrefix = customPrefixVal;
    
    setGeneratedSecret(finalPrefix + result);
  };

  useEffect(() => {
    generateSecretValue();
  }, [genLength, genUpper, genLower, genNumbers, genSymbols, genPrefix, customPrefixVal]);

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(generatedSecret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch (err) {
      console.error('failed to copy secret', err);
    }
  };

  const generateYAMLRule = (): string => {
    return `rules:
  - id: "${ruleName.toLowerCase().replace(/\s+/g, '-')}"
    name: "${ruleName.toLowerCase()}"
    description: "${ruleDescription.toLowerCase()}"
    pattern: "${ruleRegex.replace(/"/g, '\\"')}"
    severity: "critical"
    remedy: "revoke key immediately and remove from code."`;
  };

  const handleCopyRule = async () => {
    try {
      await navigator.clipboard.writeText(generateYAMLRule());
      setRuleCopied(true);
      setTimeout(() => setRuleCopied(false), 2000);
    } catch (err) {
      console.error('failed to copy rule', err);
    }
  };

  const getRegexTestResults = () => {
    if (!ruleRegex) return { error: 'pattern is empty', matched: false, matches: [] };
    try {
      const rx = new RegExp(ruleRegex, 'g');
      const matches = [...testText.matchAll(rx)];
      return {
        error: null,
        matched: matches.length > 0,
        matches: matches.map(m => m[0])
      };
    } catch (err: any) {
      return {
        error: err.message,
        matched: false,
        matches: []
      };
    }
  };

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
        <div className="flex gap-2 mb-8 border-b border-white/5 pb-4 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all lowercase shrink-0 ${
              activeTab === 'scan'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
            }`}
          >
            leak scanner
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all lowercase shrink-0 ${
              activeTab === 'config'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
            }`}
          >
            config generator (.toml)
          </button>
          <button
            onClick={() => setActiveTab('entropy')}
            className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all lowercase shrink-0 ${
              activeTab === 'entropy'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
            }`}
          >
            entropy meter
          </button>
          <button
            onClick={() => setActiveTab('secrets')}
            className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all lowercase shrink-0 ${
              activeTab === 'secrets'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
            }`}
          >
            secret generator
          </button>
          <button
            onClick={() => setActiveTab('custom-rule')}
            className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all lowercase shrink-0 ${
              activeTab === 'custom-rule'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
            }`}
          >
            custom rule tester
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
                  <label className="text-xs md:text-[10px] font-mono text-white/90 hover:text-white cursor-pointer transition-colors bg-white/5 px-2.5 py-1 rounded-md border border-white/10 hover:bg-white/10">
                    upload file
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
              
              <div className="flex-1 w-full relative flex flex-col">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full flex-1 bg-black/60 p-6 font-mono text-xs md:text-sm text-neutral-300 focus:outline-none resize-none leading-relaxed select-text relative z-10"
                  placeholder=""
                />
                
                {code.trim() === '' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 select-none pointer-events-none">
                    <svg className="w-8 h-8 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-xs text-neutral-400 font-mono lowercase">paste code or drag & drop files here</span>
                    <span className="text-[10px] text-neutral-600 font-mono lowercase">or click the 'upload file' button above</span>
                  </div>
                )}
              </div>
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

                {!report.isSafe && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-white/5 select-none">
                    <button
                      onClick={exportJSONReport}
                      className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white border border-white/10 text-[10px] font-mono rounded-lg py-2.5 lowercase transition-all select-none"
                    >
                      export json
                    </button>
                    <button
                      onClick={exportHTMLReport}
                      className="flex-1 bg-emerald-950/40 hover:bg-emerald-950 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono rounded-lg py-2.5 lowercase transition-all select-none"
                    >
                      print report
                    </button>
                  </div>
                )}

                <div className="border-t border-white/5 pt-4 mt-6 text-[10px] font-mono text-neutral-600 select-none lowercase leading-normal">
                  sandbox engine runs entirely offline on browser threads. data is not sent to external servers.
                </div>

              </div>
            </div>

          </div>
        ) : activeTab === 'config' ? (
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(enabledScanners).map(([scannerKey, enabled]) => (
                      <div 
                        key={scannerKey} 
                        onClick={() => setEnabledScanners({
                          ...enabledScanners,
                          [scannerKey]: !enabled
                        })}
                        className="flex items-center gap-2 cursor-pointer select-none"
                      >
                        <button
                          type="button"
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all shrink-0 ${
                            enabled 
                              ? 'bg-white border-white text-black font-bold' 
                              : 'bg-black border-white/20 text-transparent hover:border-white/40'
                          }`}
                          aria-checked={enabled}
                          role="checkbox"
                        >
                          {enabled && (
                            <svg className="w-2.5 h-2.5 stroke-[3] stroke-current" fill="none" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </button>
                        <span className="text-[10px] font-mono text-neutral-400 lowercase">{scannerKey} detector</span>
                      </div>
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
        ) : activeTab === 'entropy' ? (
          /* Tab 3: ENTROPY WORKSPACE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch select-text">
            {/* Left Side: Input area */}
            <div className="lg:col-span-7 bg-neutral-950 border border-white/5 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[10px] font-mono text-neutral-500 block mb-4 select-none lowercase border-b border-white/5 pb-2">
                  credential entropy scanner input
                </span>
                
                <div className="space-y-2">
                  <label className="text-xs font-mono text-neutral-400 block lowercase">raw secret string:</label>
                  <input
                    type="text"
                    value={entropyInput}
                    onChange={(e) => setEntropyInput(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-xl p-4 font-mono text-sm text-white focus:outline-none focus:border-white/20 select-text"
                    placeholder="paste your token, api key or password..."
                  />
                </div>

                <div className="space-y-2 select-none">
                  <span className="text-[10px] font-mono text-neutral-500 block lowercase">quick preset tests:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'stripe test key', value: 'sk_test_51N34ghJkL90AcdSfErtYuiOp' },
                      { name: 'aws credential', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
                      { name: 'db connection string', value: 'postgres://db_user:password_xyz123@localhost:5432' },
                      { name: 'weak key', value: 'admin1234' }
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => setEntropyInput(preset.value)}
                        className="px-2.5 py-1 bg-neutral-900 border border-white/5 text-[9px] font-mono text-neutral-400 rounded-lg hover:text-white transition-colors lowercase"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 mt-6 text-[10px] font-mono text-neutral-600 select-none lowercase leading-normal">
                entropy values greater than 4.5 bits represent high-entropy keys that securify marks for audit blockages.
              </div>
            </div>

            {/* Right Side: Math Analysis logs */}
            <div className="lg:col-span-5 bg-neutral-950 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-neutral-500 block mb-4 select-none lowercase border-b border-white/5 pb-2">
                  shannon complexity analysis
                </span>

                <div className="space-y-5">
                  
                  {/* Entropy Score */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono text-neutral-400 lowercase">
                      <span>calculated entropy:</span>
                      <span className="text-white font-medium">{calculateEntropy(entropyInput)} bits/symbol</span>
                    </div>
                    <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          calculateEntropy(entropyInput) > 4.5 ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min((calculateEntropy(entropyInput) / 8.0) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex justify-between items-center text-xs font-mono lowercase border-b border-white/[0.02] pb-3">
                    <span className="text-neutral-500">strength rating:</span>
                    <span className={`font-semibold ${getStrengthRating(calculateEntropy(entropyInput), entropyInput.length).color}`}>
                      {getStrengthRating(calculateEntropy(entropyInput), entropyInput.length).label}
                    </span>
                  </div>

                  {/* Guessing Complexity */}
                  <div className="space-y-1 lowercase border-b border-white/[0.02] pb-3">
                    <span className="text-[10px] font-mono text-neutral-500">estimated brute-force duration:</span>
                    <p className="text-sm font-semibold text-white font-mono leading-none">
                      {estimateBruteForceTime(calculateEntropy(entropyInput), entropyInput.length)}
                    </p>
                    <span className="text-[9px] text-neutral-600 block leading-normal">
                      calculated assuming cluster capacity of 1 billion guesses per second.
                    </span>
                  </div>

                  {/* Diversity Checklist */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-neutral-500 block lowercase">character diversity:</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <span className={/[A-Z]/.test(entropyInput) ? 'text-emerald-500' : 'text-neutral-700'}>
                          {/[A-Z]/.test(entropyInput) ? '✔' : '✖'}
                        </span>
                        <span>uppercase letters</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={/[a-z]/.test(entropyInput) ? 'text-emerald-500' : 'text-neutral-700'}>
                          {/[a-z]/.test(entropyInput) ? '✔' : '✖'}
                        </span>
                        <span>lowercase letters</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={/\d/.test(entropyInput) ? 'text-emerald-500' : 'text-neutral-700'}>
                          {/[0-9]/.test(entropyInput) ? '✔' : '✖'}
                        </span>
                        <span>numeric digits</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={/[^A-Za-z0-9]/.test(entropyInput) ? 'text-emerald-500' : 'text-neutral-700'}>
                          {/[^A-Za-z0-9]/.test(entropyInput) ? '✔' : '✖'}
                        </span>
                        <span>special symbols</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="text-[9px] text-neutral-500 font-mono mt-6 leading-relaxed lowercase">
                shannon entropy measures the randomness of strings. cryptographic secrets usually have high character diversity, resulting in score above 4.5.
              </div>
            </div>
          </div>
        ) : activeTab === 'secrets' ? (
          /* Tab 4: SECRETS GENERATOR */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch select-text">
            {/* Left Side: Controls */}
            <div className="lg:col-span-6 bg-neutral-950 border border-white/5 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-5">
                <span className="text-[10px] font-mono text-neutral-500 block mb-4 select-none lowercase border-b border-white/5 pb-2">
                  cryptographic secret parameters
                </span>

                {/* Length Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-neutral-400">
                    <span className="lowercase">secret length:</span>
                    <span className="text-white font-medium">{genLength} characters</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="128"
                    step="1"
                    value={genLength}
                    onChange={(e) => setGenLength(parseInt(e.target.value))}
                    className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>

                {/* Character Sets */}
                <div className="space-y-2.5">
                  <label className="text-xs font-mono text-neutral-400 block lowercase">character diversity sets:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div 
                      onClick={() => setGenUpper(!genUpper)}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <button
                        type="button"
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all shrink-0 ${
                          genUpper 
                            ? 'bg-white border-white text-black font-bold' 
                            : 'bg-black border-white/20 text-transparent hover:border-white/40'
                        }`}
                        aria-checked={genUpper}
                        role="checkbox"
                      >
                        {genUpper && (
                          <svg className="w-2.5 h-2.5 stroke-[3] stroke-current" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                      <span className="text-[10px] font-mono text-neutral-400 lowercase font-mono">A-Z uppercase</span>
                    </div>

                    <div 
                      onClick={() => setGenLower(!genLower)}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <button
                        type="button"
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all shrink-0 ${
                          genLower 
                            ? 'bg-white border-white text-black font-bold' 
                            : 'bg-black border-white/20 text-transparent hover:border-white/40'
                        }`}
                        aria-checked={genLower}
                        role="checkbox"
                      >
                        {genLower && (
                          <svg className="w-2.5 h-2.5 stroke-[3] stroke-current" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                      <span className="text-[10px] font-mono text-neutral-400 lowercase font-mono">a-z lowercase</span>
                    </div>

                    <div 
                      onClick={() => setGenNumbers(!genNumbers)}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <button
                        type="button"
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all shrink-0 ${
                          genNumbers 
                            ? 'bg-white border-white text-black font-bold' 
                            : 'bg-black border-white/20 text-transparent hover:border-white/40'
                        }`}
                        aria-checked={genNumbers}
                        role="checkbox"
                      >
                        {genNumbers && (
                          <svg className="w-2.5 h-2.5 stroke-[3] stroke-current" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                      <span className="text-[10px] font-mono text-neutral-400 lowercase font-mono">0-9 numbers</span>
                    </div>

                    <div 
                      onClick={() => setGenSymbols(!genSymbols)}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <button
                        type="button"
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all shrink-0 ${
                          genSymbols 
                            ? 'bg-white border-white text-black font-bold' 
                            : 'bg-black border-white/20 text-transparent hover:border-white/40'
                        }`}
                        aria-checked={genSymbols}
                        role="checkbox"
                      >
                        {genSymbols && (
                          <svg className="w-2.5 h-2.5 stroke-[3] stroke-current" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                      <span className="text-[10px] font-mono text-neutral-400 lowercase font-mono">symbols (!@#...)</span>
                    </div>
                  </div>
                </div>

                {/* Prefixes */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-mono text-neutral-400 block lowercase font-mono">credential signature prefix:</label>
                  <select
                    value={genPrefix}
                    onChange={(e: any) => setGenPrefix(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-white/20 lowercase font-mono cursor-pointer"
                  >
                    <option value="none">no prefix signature (raw secret)</option>
                    <option value="stripe_test">stripe test prefix (sk_test_...)</option>
                    <option value="stripe_live">stripe live prefix (sk_live_...)</option>
                    <option value="securify">securify prefix (sec_key_...)</option>
                    <option value="custom">custom prefix custom...</option>
                  </select>

                  {genPrefix === 'custom' && (
                    <input
                      type="text"
                      placeholder="e.g. env_secret_..."
                      value={customPrefixVal}
                      onChange={(e) => setCustomPrefixVal(e.target.value)}
                      className="w-full bg-black border border-white/5 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-white/20 lowercase"
                    />
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <button
                  onClick={generateSecretValue}
                  className="w-full bg-white hover:bg-neutral-200 text-black font-mono text-xs font-medium py-3 rounded-xl transition-colors lowercase"
                >
                  regenerate cryptographic key
                </button>
              </div>
            </div>

            {/* Right Side: Key Output & Entropy */}
            <div className="lg:col-span-6 bg-neutral-950 border border-white/5 rounded-2xl p-6 flex flex-col justify-between min-h-[420px]">
              <div>
                <span className="text-[10px] font-mono text-neutral-500 block mb-4 select-none lowercase border-b border-white/5 pb-2">
                  generated high-entropy key output
                </span>

                <div className="space-y-5">
                  <div className="relative group">
                    <pre className="w-full bg-black border border-white/5 rounded-xl p-4 font-mono text-xs text-neutral-300 whitespace-pre-wrap break-all select-all min-h-[64px]">
                      {generatedSecret}
                    </pre>
                    <button
                      onClick={handleCopySecret}
                      className={`absolute right-3 top-3 px-3 py-1.5 rounded-lg text-[9px] font-mono lowercase border transition-all ${
                        secretCopied
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-500/20'
                          : 'bg-neutral-900 border-white/5 hover:text-white text-neutral-400'
                      }`}
                    >
                      {secretCopied ? 'copied!' : 'copy'}
                    </button>
                  </div>

                  {/* Live Entropy stats */}
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-mono text-neutral-400 lowercase">
                        <span>secret shannon entropy:</span>
                        <span className="text-white">{calculateEntropy(generatedSecret)} bits/symbol</span>
                      </div>
                      <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${Math.min((calculateEntropy(generatedSecret) / 8.0) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-mono lowercase border-b border-white/[0.02] pb-2">
                      <span className="text-neutral-500">strength rating:</span>
                      <span className={`font-semibold ${getStrengthRating(calculateEntropy(generatedSecret), generatedSecret.length).color}`}>
                        {getStrengthRating(calculateEntropy(generatedSecret), generatedSecret.length).label}
                      </span>
                    </div>

                    <div className="space-y-1 lowercase">
                      <span className="text-[10px] font-mono text-neutral-500 font-mono">estimated brute-force duration:</span>
                      <p className="text-sm font-semibold text-white font-mono leading-none">
                        {estimateBruteForceTime(calculateEntropy(generatedSecret), generatedSecret.length)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-neutral-500 font-mono mt-6 leading-relaxed lowercase">
                utilizes browser cryptographically secure pseudorandom number generator (CSPRNG) interface for entropy-maximized values.
              </div>
            </div>
          </div>
        ) : (
          /* Tab 5: CUSTOM RULE TESTER */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch select-text">
            {/* Left Side: Rule details & Test text */}
            <div className="lg:col-span-6 bg-neutral-950 border border-white/5 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[10px] font-mono text-neutral-500 block mb-4 select-none lowercase border-b border-white/5 pb-2">
                  custom rule criteria definitions
                </span>

                {/* Rule Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-400 block lowercase font-mono">rule identity identifier:</label>
                  <input
                    type="text"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 lowercase"
                    placeholder="e.g. acme-api-token"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-400 block lowercase font-mono">rule query description:</label>
                  <input
                    type="text"
                    value={ruleDescription}
                    onChange={(e) => setRuleDescription(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 lowercase"
                    placeholder="detects corporate secrets"
                  />
                </div>

                {/* Regex Pattern */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-400 block lowercase font-mono">regex matching pattern:</label>
                  <input
                    type="text"
                    value={ruleRegex}
                    onChange={(e) => setRuleRegex(e.target.value)}
                    className={`w-full bg-black border rounded-xl px-4 py-2.5 font-mono text-xs text-white focus:outline-none focus:border-white/20 ${
                      getRegexTestResults().error ? 'border-red-500/30 focus:border-red-500/50' : 'border-white/5'
                    }`}
                    placeholder="e.g. acme_[a-zA-Z0-9]{20}"
                  />
                  {getRegexTestResults().error && (
                    <p className="text-[9px] text-red-400 font-mono lowercase">
                      invalid regex syntax: {getRegexTestResults().error}
                    </p>
                  )}
                  <div className="space-y-1.5 pt-1.5">
                    <span className="text-[10px] font-mono text-neutral-500 block lowercase select-none">regex preset helpers:</span>
                    <div className="flex flex-wrap gap-1.5 select-none">
                      {[
                        { name: 'bearer token', regex: 'Bearer\\s[a-zA-Z0-9_\\-\\.\\~\\+\\/]+=*', desc: 'matches generic Bearer authentication tokens', sample: 'const headers = {\n  Authorization: "Bearer token_abc123xyz_example_value"\n};' },
                        { name: 'custom api key', regex: 'api_key_[a-zA-Z0-9]{24}', desc: 'detects company generic api keys', sample: 'const config = {\n  apiKey: "api_key_A1b2C3d4E5f6G7h8I9j0K1l2"\n};' },
                        { name: 'private key foot', regex: '-----END [A-Z ]+ PRIVATE KEY-----', desc: 'identifies cryptographic private key files', sample: 'const key = `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD...\n-----END PRIVATE KEY-----`;' }
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => applyRulePreset(preset.name, preset.regex, preset.desc, preset.sample)}
                          className="px-2 py-0.5 rounded text-[9px] font-mono bg-neutral-900 text-neutral-400 border border-white/5 hover:text-white hover:border-white/20 transition-all lowercase"
                        >
                          + {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Test Text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-400 block lowercase font-mono">sample code test input string:</label>
                  <textarea
                    rows={4}
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-xl p-4 font-mono text-xs text-white focus:outline-none focus:border-white/20 select-text resize-none"
                    placeholder="type some test code here containing the secret key to see if your regex matches..."
                  />
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 mt-6 text-[10px] font-mono text-neutral-600 select-none lowercase leading-normal">
                rules sandbox compiling is performed in realtime. test your regex before committing patterns to local configurations.
              </div>
            </div>

            {/* Right Side: Live test report & YAML export */}
            <div className="lg:col-span-6 bg-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl min-h-[420px]">
              
              <div className="p-6 space-y-6">
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 block mb-4 select-none lowercase border-b border-white/5 pb-2">
                    real-time pattern matching test
                  </span>

                  {/* Regex test results */}
                  <div className="p-4 bg-black border border-white/5 rounded-xl space-y-3">
                    <div className="flex justify-between items-center text-xs font-mono lowercase">
                      <span className="text-neutral-400">regex validation state:</span>
                      {getRegexTestResults().error ? (
                        <span className="text-red-400">compilation error</span>
                      ) : getRegexTestResults().matched ? (
                        <span className="text-emerald-400 font-medium animate-pulse">leak detected ✔</span>
                      ) : (
                        <span className="text-neutral-500">no matches found ✖</span>
                      )}
                    </div>

                    {!getRegexTestResults().error && getRegexTestResults().matched && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-neutral-500 lowercase block">captured substring matches:</span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {getRegexTestResults().matches.map((m, idx) => (
                            <code key={idx} className="bg-red-950/30 border border-red-500/20 text-red-400 text-[10px] font-mono px-2 py-0.5 rounded break-all font-mono">
                              {m}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Generated YML rule chunk */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-neutral-500 block lowercase">generated rule payload config:</span>
                  <div className="relative group">
                    <pre className="w-full bg-black border border-white/5 rounded-xl p-4 font-mono text-[11px] text-neutral-400 whitespace-pre-wrap leading-relaxed select-all">
                      {generateYAMLRule()}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-white/5 bg-neutral-900/10 flex justify-end">
                <button
                  onClick={handleCopyRule}
                  disabled={!!getRegexTestResults().error}
                  className={`text-xs font-mono font-medium rounded-xl px-5 py-3 lowercase transition-all select-none ${
                    ruleCopied 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' 
                      : getRegexTestResults().error
                      ? 'bg-neutral-900 text-neutral-600 border border-white/5 cursor-not-allowed'
                      : 'bg-white hover:bg-neutral-200 text-black'
                  }`}
                >
                  {ruleCopied ? 'copied rule!' : 'copy rule block'}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
};

// Pure math helper functions for Shannon Entropy and complexity estimates
const calculateEntropy = (str: string): number => {
  if (!str) return 0;
  const len = str.length;
  const frequencies: Record<string, number> = {};
  for (let i = 0; i < len; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  let entropy = 0;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }
  return parseFloat(entropy.toFixed(2));
};

const getStrengthRating = (entropy: number, len: number) => {
  if (len === 0) return { label: 'none', color: 'text-neutral-500' };
  const totalBits = entropy * len;
  if (totalBits < 40) return { label: 'very weak', color: 'text-red-500' };
  if (totalBits < 60) return { label: 'weak', color: 'text-orange-500' };
  if (totalBits < 80) return { label: 'medium strength', color: 'text-yellow-500' };
  return { label: 'cryptographically strong', color: 'text-emerald-500' };
};

const estimateBruteForceTime = (entropy: number, len: number): string => {
  if (len === 0) return '0 seconds';
  const totalBits = entropy * len;
  const guesses = Math.pow(2, Math.min(totalBits, 128)); // cap logic at 128-bit
  const guessesPerSecond = 1e9; // 1 billion guesses per second
  const seconds = guesses / guessesPerSecond;
  
  if (seconds < 1) return 'less than a millisecond';
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)} minutes`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)} hours`;
  const days = hours / 24;
  if (days < 365) return `${Math.round(days)} days`;
  const years = days / 365;
  if (years < 1000) return `${Math.round(years)} years`;
  if (years < 1e6) return `${Math.round(years / 1000)}k years`;
  return 'practically infinite (centuries)';
};

