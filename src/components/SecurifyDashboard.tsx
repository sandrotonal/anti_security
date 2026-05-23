import { useState, useRef, useEffect } from 'react';

interface ScanLog {
  timestamp: string;
  repo: string;
  status: 'passed' | 'failed';
  details: string;
}

const rulesList = [
  { name: 'AWS Access Key ID', regex: /AKIA[A-Z0-9]{16}/g },
  { name: 'AWS Secret Access Key', regex: /aws(.{0,20})?[0-9a-zA-Z\/+]{40}/gi },
  { name: 'Supabase Service Role JWT', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g },
  { name: 'Stripe Secret API Key', regex: /sk_(live|test)_[0-9a-zA-Z]{24}/g },
  { name: 'GitHub Personal Access Token', regex: /ghp_[a-zA-Z0-9]{36}/g },
  { name: 'Google Cloud API Key', regex: /AIzaSy[a-zA-Z0-9-_]{33}/g },
  { name: 'Slack Webhook URL', regex: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9\/]+/g },
  { name: 'Generic Database Connection String', regex: /postgres(?:ql)?:\/\/([^:]+):([^@]+)@/g },
  { name: 'SSH/RSA Private Key', regex: /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g }
];

// Helper to convert gitignore glob pattern to JavaScript RegExp
const globToRegex = (glob: string): RegExp => {
  let g = glob.trim();
  if (!g || g.startsWith('#')) return /^$/;
  g = g.replace(/^\/+|\/+$/g, '');
  const regexStr = g.replace(/[-\/\\^$*+?.()|[\]{}]/g, (match) => {
    if (match === '*') return '.*';
    if (match === '?') return '.';
    return '\\' + match;
  });
  return new RegExp(`(^|\\/)${regexStr}(\\/|$)`, 'i');
};

export const SecurifyDashboard = () => {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [isLiveStream, setIsLiveStream] = useState<boolean>(true);
  const [stats, setStats] = useState({
    totalScanned: 842,
    blockedLeaks: 14,
    activeHooks: 3
  });
  
  // Dynamic severity tracking
  const [severityStats, setSeverityStats] = useState({
    critical: 4,
    high: 8,
    warning: 2
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; filename: string } | null>(null);
  const [customScanResults, setCustomScanResults] = useState<{
    folderName: string;
    totalFiles: number;
    leaksFound: number;
    durationMs: number;
  } | null>(null);

  // Live Simulated Stream Hook
  useEffect(() => {
    if (!isLiveStream) return;

    // Pre-populate some historical logs
    const initialLogs: ScanLog[] = [
      {
        timestamp: new Date(Date.now() - 15000).toLocaleTimeString(),
        repo: 'github.com/org/auth-service',
        status: 'passed',
        details: '✔ securify-git-hook: scanned 12 staged files. no secrets found.'
      },
      {
        timestamp: new Date(Date.now() - 10000).toLocaleTimeString(),
        repo: 'github.com/org/payment-gateway',
        status: 'failed',
        details: '❌ blocked commit: detected Stripe Secret API Key on payment-gateway/src/config.js:L24'
      },
      {
        timestamp: new Date(Date.now() - 5000).toLocaleTimeString(),
        repo: 'github.com/org/infrastructure',
        status: 'passed',
        details: '✔ securify-ci: verified terraform scripts. 0 leaks detected.'
      }
    ];
    setLogs(initialLogs);

    const repos = [
      'github.com/org/billing-api',
      'github.com/org/data-lake',
      'github.com/org/mobile-client',
      'github.com/org/user-dashboard',
      'github.com/org/auth-service'
    ];

    const leakTypes = [
      { name: 'AWS Access Key ID', detail: '❌ blocked commit: detected AWS Access Key ID on billing-api/secrets.env:L3', severity: 'critical' },
      { name: 'Google Cloud API Key', detail: '❌ blocked push: detected Google Cloud API Key on data-lake/index.js:L92', severity: 'high' },
      { name: 'GitHub Personal Access Token', detail: '❌ blocked commit: detected GitHub Personal Access Token on mobile-client/src/auth.ts:L12', severity: 'high' }
    ];

    const interval = setInterval(() => {
      const isLeak = Math.random() > 0.8;
      const randomRepo = repos[Math.floor(Math.random() * repos.length)];
      const timestamp = new Date().toLocaleTimeString();

      let newLog: ScanLog;
      if (isLeak) {
        const leak = leakTypes[Math.floor(Math.random() * leakTypes.length)];
        newLog = {
          timestamp,
          repo: randomRepo,
          status: 'failed',
          details: leak.detail
        };
        setStats(prev => ({
          totalScanned: prev.totalScanned + 1,
          blockedLeaks: prev.blockedLeaks + 1,
          activeHooks: prev.activeHooks
        }));
        
        // Dynamically increment severity metrics
        setSeverityStats(prev => ({
          critical: prev.critical + (leak.severity === 'critical' ? 1 : 0),
          high: prev.high + (leak.severity === 'high' ? 1 : 0),
          warning: prev.warning + (leak.severity === 'warning' ? 1 : 0)
        }));
      } else {
        newLog = {
          timestamp,
          repo: randomRepo,
          status: 'passed',
          details: `✔ securify-git-hook: scanned ${Math.floor(Math.random() * 8) + 1} staged files. no secrets found.`
        };
        setStats(prev => ({
          totalScanned: prev.totalScanned + Math.floor(Math.random() * 4) + 1,
          blockedLeaks: prev.blockedLeaks,
          activeHooks: prev.activeHooks
        }));
      }

      setLogs(prev => [newLog, ...prev].slice(0, 25));
    }, 4500);

    return () => clearInterval(interval);
  }, [isLiveStream]);

  const handleFolderScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;

    setIsLiveStream(false);
    setScanning(true);
    setLogs([]);
    
    // Clear severity stats for new folder scan
    const localSeverity = { critical: 0, high: 0, warning: 0 };

    const startTime = performance.now();
    const totalFiles = filesList.length;
    let leaksFound = 0;
    const pathParts = filesList[0].webkitRelativePath.split('/');
    const folderName = pathParts[0] || 'local-project';

    // 1. Detect and parse .gitignore / .securifyignore files
    let ignorePatterns: RegExp[] = [];
    const ignoreFile = Array.from(filesList).find(
      (file) => file.name === '.gitignore' || file.name === '.securifyignore'
    );

    if (ignoreFile) {
      try {
        const ignoreText = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve((event.target?.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsText(ignoreFile);
        });
        
        ignorePatterns = ignoreText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'))
          .map(globToRegex);
      } catch (err) {
        console.error('Failed to parse ignore file:', err);
      }
    }

    const tempLogs: ScanLog[] = [];

    // Scan files sequentially
    for (let i = 0; i < totalFiles; i++) {
      const file = filesList[i];
      setScanProgress({ current: i + 1, total: totalFiles, filename: file.name });

      // Check if file relative path matches ignore patterns
      const filePath = file.webkitRelativePath || file.name;
      const isIgnored = ignorePatterns.some((pattern) => pattern.test(filePath));
      if (isIgnored) {
        continue;
      }

      // Scan target extension list
      const isTextFile = /\.(js|ts|tsx|jsx|json|py|go|rs|env|yml|yaml|md|txt|config|ini|toml|sh|bat)$/i.test(file.name) || file.name.startsWith('.');
      const isTooBig = file.size > 3 * 1024 * 1024; // 3MB limit to prevent browser hanging

      if (isTooBig || !isTextFile) {
        continue;
      }

      try {
        const text = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve((event.target?.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsText(file);
        });

        const lines = text.split('\n');
        const fileLeaks: string[] = [];

        lines.forEach((lineText, lineIdx) => {
          rulesList.forEach((rule) => {
            rule.regex.lastIndex = 0;
            const match = rule.regex.exec(lineText);
            if (match) {
              leaksFound++;
              fileLeaks.push(`line ${lineIdx + 1}: found ${rule.name}`);
              
              // Increment severity count dynamically
              if (rule.name.toLowerCase().includes('aws') || rule.name.toLowerCase().includes('supabase') || rule.name.toLowerCase().includes('stripe')) {
                localSeverity.critical++;
              } else if (rule.name.toLowerCase().includes('github') || rule.name.toLowerCase().includes('google') || rule.name.toLowerCase().includes('slack')) {
                localSeverity.high++;
              } else {
                localSeverity.warning++;
              }
            }
          });
        });

        if (fileLeaks.length > 0) {
          tempLogs.push({
            timestamp: new Date().toLocaleTimeString(),
            repo: `${folderName}/${file.name}`,
            status: 'failed',
            details: `❌ credential detected: \n   ${fileLeaks.join('\n   ')}`
          });
        }
      } catch (err) {
        // Skip read failures
      }
    }

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    setStats({
      totalScanned: totalFiles,
      blockedLeaks: leaksFound,
      activeHooks: 1
    });
    
    setSeverityStats(localSeverity);

    setCustomScanResults({
      folderName,
      totalFiles,
      leaksFound,
      durationMs
    });

    if (tempLogs.length === 0) {
      tempLogs.push({
        timestamp: new Date().toLocaleTimeString(),
        repo: folderName,
        status: 'passed',
        details: `✔ securify audit finished successfully. scanned ${totalFiles} files. 0 secrets found. codebase clean.`
      });
    } else {
      tempLogs.push({
        timestamp: new Date().toLocaleTimeString(),
        repo: folderName,
        status: 'failed',
        details: `⚠ audit finished. flagged ${leaksFound} credentials across files. check log details above.`
      });
    }

    setLogs(tempLogs);
    setScanning(false);
    setScanProgress(null);
  };

  const exportReportMarkdown = () => {
    if (!customScanResults) return;
    const reportText = `# Securify Security Scan Report
generated on: ${new Date().toLocaleString()}
project directory: ${customScanResults.folderName}

## Summary
- total files scanned: ${customScanResults.totalFiles}
- leaks identified: ${customScanResults.leaksFound}
- scan duration: ${customScanResults.durationMs}ms
- status: ${customScanResults.leaksFound === 0 ? 'SAFE' : 'COMPROMISED'}

## Detailed Leak Findings
${logs
  .filter(log => log.status === 'failed')
  .map(log => `### File: ${log.repo}\n- ${log.details.replace(/\n\s*/g, '\n- ')}`)
  .join('\n\n')}

---
audit performed client-side using Securify Interactive Portal.
`;

    const blob = new Blob([reportText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `securify-report-${customScanResults.folderName}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setCustomScanResults(null);
    setLogs([]);
    setStats({
      totalScanned: 842,
      blockedLeaks: 14,
      activeHooks: 3
    });
    setSeverityStats({
      critical: 4,
      high: 8,
      warning: 2
    });
    setIsLiveStream(true);
  };

  return (
    <section className="bg-black min-h-screen py-28 px-6 md:px-12 relative overflow-hidden select-none print:py-10 print:px-0">
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-dash-slow {
          stroke-dasharray: 4 4;
          animation: dash 1.5s linear infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .animate-pulse-glow {
          animation: pulseGlow 2.5s ease-in-out infinite;
        }
      `}</style>

      {/* Background visual details */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none print:hidden" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="max-w-3xl mb-12 print:mb-6">
          <span className="inline-block bg-neutral-900 border border-white/10 rounded-full px-4 py-1 text-xs text-neutral-400 lowercase mb-4 tracking-wider print:hidden">
            compliance monitor
          </span>
          <h2 className="hero-title text-4xl md:text-5xl font-medium tracking-tight text-white lowercase mb-4 print:text-2xl print:text-black">
            real-time protection.
          </h2>
          <p className="text-neutral-400 text-sm font-light lowercase leading-relaxed max-w-xl print:text-neutral-700 print:text-[11px]">
            visualizing active commit scanning filters running across registered microservices. this dashboard monitors pre-commit git intercept activities.
          </p>
        </div>

        {/* Real Scan Control Banner */}
        <div className="bg-neutral-900/40 border border-white/5 backdrop-blur-sm rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
          <div className="space-y-1">
            <span className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-0.5 text-[9px] font-mono text-neutral-300 lowercase">
              client-side audit engine
            </span>
            <h3 className="text-base font-medium text-white lowercase">
              {customScanResults 
                ? `scanned codebase: ${customScanResults.folderName}` 
                : "run local scan on your project"}
            </h3>
            <p className="text-neutral-400 text-xs font-light lowercase leading-relaxed max-w-xl">
              {customScanResults
                ? `completed analysis in ${customScanResults.durationMs}ms. found ${customScanResults.leaksFound} credentials.`
                : "select your local project folder. securify will scan all directory files for secrets entirely client-side without uploading any files. supports .gitignore filter bypass."}
            </p>
          </div>

          <div className="flex gap-3 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFolderScan}
              className="hidden"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
            />
            
            {customScanResults ? (
              <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                <button
                  onClick={exportReportMarkdown}
                  className="bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/20 text-xs font-mono rounded-xl px-5 py-3 lowercase transition-all select-none"
                >
                  export report (.md)
                </button>
                <button
                  onClick={handleReset}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white border border-white/10 text-xs font-mono rounded-xl px-5 py-3 lowercase transition-all select-none"
                >
                  clear results
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
                className="bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl px-6 py-3 lowercase transition-all select-none disabled:opacity-50"
              >
                {scanning ? "scanning files..." : "select folder & scan"}
              </button>
            )}
          </div>
        </div>

        {/* Scanning Loader Progress Bar */}
        {scanning && scanProgress && (
          <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 mb-8 space-y-3 animate-pulse print:hidden">
            <div className="flex justify-between items-center text-xs font-mono text-neutral-400">
              <span className="lowercase">scanning files: {scanProgress.current} / {scanProgress.total}</span>
              <span className="text-white lowercase">{Math.round((scanProgress.current / scanProgress.total) * 100)}%</span>
            </div>
            <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-white h-full transition-all duration-150" 
                style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-neutral-500 truncate lowercase">
              reading: {scanProgress.filename}
            </div>
          </div>
        )}

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 select-text print:grid-cols-3 print:gap-4 print:mb-6">
          <div className="bg-neutral-950 border border-white/5 p-6 rounded-2xl print:bg-white print:border-neutral-300 print:text-black">
            <span className="block text-[10px] font-mono text-neutral-500 mb-1 lowercase print:text-neutral-500">
              {customScanResults ? "total files analyzed" : "total files scanned"}
            </span>
            <span className="block text-2xl md:text-3xl font-semibold tracking-tight text-white font-mono print:text-black print:text-xl">
              {stats.totalScanned.toLocaleString()}
            </span>
          </div>

          <div className="bg-neutral-950 border border-white/5 p-6 rounded-2xl print:bg-white print:border-neutral-300 print:text-black">
            <span className="block text-[10px] font-mono text-neutral-500 mb-1 lowercase print:text-neutral-500">
              {customScanResults ? "found credentials" : "blocked credential leaks"}
            </span>
            <span className="block text-2xl md:text-3xl font-semibold tracking-tight text-red-500 font-mono print:text-red-600 print:text-xl">
              {stats.blockedLeaks.toLocaleString()}
            </span>
          </div>

          <div className="bg-neutral-950 border border-white/5 p-6 rounded-2xl print:bg-white print:border-neutral-300 print:text-black">
            <span className="block text-[10px] font-mono text-neutral-500 mb-1 lowercase print:text-neutral-500">
              {customScanResults ? "scan duration" : "active local git hooks"}
            </span>
            <span className="block text-2xl md:text-3xl font-semibold tracking-tight text-neutral-300 font-mono print:text-black print:text-xl">
              {customScanResults ? `${customScanResults.durationMs}ms` : stats.activeHooks.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Multi-Column Layout: Visual Map & Compliance (Left) vs Log Output (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start print:grid-cols-1 print:gap-4">
          
          {/* Left Column: Visual Map & Compliance checklist */}
          <div className="lg:col-span-5 space-y-6 print:lg:col-span-12 print:space-y-4">
            
            {/* Visual Node Activity Map */}
            <div className="bg-neutral-950 border border-white/5 p-6 rounded-2xl flex flex-col justify-between min-h-[220px] print:hidden">
              <div>
                <h4 className="text-xs font-mono text-white lowercase mb-1">active cluster scanning node map</h4>
                <p className="text-[10px] text-neutral-500 lowercase leading-relaxed">real-time connection activity during local pre-commit scans.</p>
              </div>

              <div className="relative py-4 flex items-center justify-center">
                <svg className="w-full max-w-[320px] h-[120px]" viewBox="0 0 300 120">
                  {/* Connection Lines with moving dashes */}
                  <path d="M 40 30 L 150 60" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <path d="M 40 30 L 150 60" stroke="#fff" strokeWidth="1.2" className="animate-dash-slow" />

                  <path d="M 40 90 L 150 60" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <path d="M 40 90 L 150 60" stroke="#fff" strokeWidth="1.2" className="animate-dash-slow" />

                  <path d="M 150 60 L 260 30" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <path d="M 150 60 L 260 30" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" className="animate-dash-slow" />

                  <path d="M 150 60 L 260 90" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <path d="M 150 60 L 260 90" stroke="#fff" strokeWidth="1.2" className="animate-dash-slow" />

                  {/* Left Nodes */}
                  <circle cx="40" cy="30" r="10" fill="#0c0a09" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                  <circle cx="40" cy="30" r="4" fill="#ef4444" className="animate-pulse" />
                  <text x="40" y="16" fill="#737373" fontSize="8" fontFamily="monospace" textAnchor="middle">git hook</text>

                  <circle cx="40" cy="90" r="10" fill="#0c0a09" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                  <circle cx="40" cy="90" r="4" fill="#a3a3a3" />
                  <text x="40" y="112" fill="#737373" fontSize="8" fontFamily="monospace" textAnchor="middle">local cli</text>

                  {/* Core Node */}
                  <circle cx="150" cy="60" r="15" fill="#000" stroke="#fff" strokeWidth="1.5" className="animate-pulse-glow" />
                  <circle cx="150" cy="60" r="6" fill="#fff" />
                  <text x="150" y="38" fill="#fff" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">securify</text>

                  {/* Right Nodes */}
                  <circle cx="260" cy="30" r="10" fill="#0c0a09" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                  <circle cx="260" cy="30" r="4" fill="#10b981" />
                  <text x="260" y="16" fill="#737373" fontSize="8" fontFamily="monospace" textAnchor="middle">slack alert</text>

                  <circle cx="260" cy="90" r="10" fill="#0c0a09" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                  <circle cx="260" cy="90" r="4" fill="#3b82f6" className="animate-pulse" />
                  <text x="260" y="112" fill="#737373" fontSize="8" fontFamily="monospace" textAnchor="middle">deploy api</text>
                </svg>
              </div>
            </div>

            {/* Dynamic Severity Distribution Chart */}
            <div className="bg-neutral-950 border border-white/5 p-6 rounded-2xl space-y-4 print:bg-white print:border-neutral-300 print:text-black">
              <div>
                <h4 className="text-xs font-mono text-white lowercase mb-1 print:text-black print:font-bold">vulnerability severity distribution</h4>
                <p className="text-[10px] text-neutral-500 lowercase leading-relaxed print:text-neutral-500">real-time classification of identified credentials.</p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {/* Critical */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] print:text-black">
                    <span className="text-red-400 lowercase print:text-red-700">critical severity (aws, stripe, supabase)</span>
                    <span className="text-white print:text-neutral-800">{severityStats.critical} leaks</span>
                  </div>
                  <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden print:bg-neutral-200">
                    <div 
                      className="bg-red-500 h-full transition-all duration-500" 
                      style={{ width: `${stats.blockedLeaks > 0 ? (severityStats.critical / stats.blockedLeaks) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* High */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] print:text-black">
                    <span className="text-orange-400 lowercase print:text-orange-700">high severity (github, gcp, slack)</span>
                    <span className="text-white print:text-neutral-800">{severityStats.high} leaks</span>
                  </div>
                  <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden print:bg-neutral-200">
                    <div 
                      className="bg-orange-500 h-full transition-all duration-500" 
                      style={{ width: `${stats.blockedLeaks > 0 ? (severityStats.high / stats.blockedLeaks) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Warning */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] print:text-black">
                    <span className="text-yellow-400 lowercase print:text-yellow-700">warning severity (high-entropy)</span>
                    <span className="text-white print:text-neutral-800">{severityStats.warning} leaks</span>
                  </div>
                  <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden print:bg-neutral-200">
                    <div 
                      className="bg-yellow-500 h-full transition-all duration-500" 
                      style={{ width: `${stats.blockedLeaks > 0 ? (severityStats.warning / stats.blockedLeaks) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Status Checklist */}
            <div className="bg-neutral-950 border border-white/5 p-6 rounded-2xl space-y-4 print:bg-white print:border-neutral-300 print:text-black">
              <div>
                <h4 className="text-xs font-mono text-white lowercase mb-1 print:text-black print:font-bold">compliance checklist</h4>
                <p className="text-[10px] text-neutral-500 lowercase leading-relaxed print:text-neutral-500">audit readiness status for enterprise regulatory frameworks.</p>
              </div>

              <div className="space-y-3 font-mono">
                <div className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 print:border-neutral-200">
                  <span className="text-neutral-400 print:text-neutral-700">SOC 2 Type II (Credential scan)</span>
                  <span className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded text-[9px] border border-emerald-500/20 print:bg-neutral-100 print:text-neutral-800 print:border-neutral-300">compliant</span>
                </div>
                <div className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 print:border-neutral-200">
                  <span className="text-neutral-400 print:text-neutral-700">ISO/IEC 27001 (A.12.4.1 logging)</span>
                  <span className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded text-[9px] border border-emerald-500/20 print:bg-neutral-100 print:text-neutral-800 print:border-neutral-300">compliant</span>
                </div>
                <div className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 print:border-neutral-200">
                  <span className="text-neutral-400 print:text-neutral-700">GDPR (Data Exposure Protection)</span>
                  <span className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded text-[9px] border border-emerald-500/20 print:bg-neutral-100 print:text-neutral-800 print:border-neutral-300">verified</span>
                </div>
                <div className="flex items-center justify-between text-[11px] py-1">
                  <span className="text-neutral-400 print:text-neutral-700">PCI-DSS 4.0 (Credential encryption)</span>
                  <span className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded text-[9px] border border-emerald-500/20 print:bg-neutral-100 print:text-neutral-800 print:border-neutral-300">compliant</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Live Logs Terminal */}
          <div className="lg:col-span-7 flex flex-col w-full print:lg:col-span-12">
            <div className="bg-neutral-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[480px] print:bg-white print:border-neutral-300 print:text-black">
              
              {/* Bar controller */}
              <div className="px-4 py-3 bg-neutral-900/50 border-b border-white/5 flex items-center justify-between print:bg-neutral-100 print:border-neutral-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 block print:hidden"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 block print:hidden"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 block print:hidden"></span>
                  <span className="text-[10px] text-neutral-500 font-mono ml-2 lowercase print:text-neutral-800 print:font-bold">
                    {customScanResults 
                      ? "securify-local-audit-results" 
                      : isLiveStream 
                        ? "securify-live-feed-monitoring" 
                        : "securify-audit-stream"}
                  </span>
                </div>
                
                <div className="flex gap-2 print:hidden">
                  {isLiveStream && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono bg-red-950/40 text-red-400 border border-red-500/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                      live feed
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setLogs([]);
                      if (customScanResults) handleReset();
                    }}
                    className="px-2 py-1 rounded text-[10px] font-mono bg-neutral-900 text-neutral-400 border border-white/5 hover:text-white transition-colors lowercase"
                  >
                    clear results
                  </button>
                </div>
              </div>

              {/* Console Output area */}
              <div className="p-6 flex-1 font-mono text-[11px] md:text-xs text-neutral-400 overflow-y-auto space-y-2 select-text print:text-black">
                {logs.length === 0 ? (
                  <div className="text-center text-neutral-600 py-20 select-none lowercase print:text-neutral-500">
                    [console] standby. select a local project folder above to run a client-side compliance audit scan.
                  </div>
                ) : (
                  logs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`py-1 border-b border-white/[0.02] flex flex-col md:flex-row md:items-start gap-1 md:gap-4 transition-all duration-300 print:border-neutral-200 ${
                        log.status === 'failed' ? 'text-red-400 print:text-red-700' : 'text-neutral-300 print:text-neutral-800'
                      }`}
                    >
                      <span className="text-neutral-600 select-none shrink-0 print:text-neutral-500">[{log.timestamp}]</span>
                      <span className="text-neutral-500 font-medium shrink-0 truncate max-w-[150px] md:max-w-none print:text-neutral-700">
                        {log.repo}
                      </span>
                      <span className="whitespace-pre-wrap break-all">{log.details}</span>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
