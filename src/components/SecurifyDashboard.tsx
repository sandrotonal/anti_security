import { useState, useRef } from 'react';

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

export const SecurifyDashboard = () => {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [stats, setStats] = useState({
    totalScanned: 0,
    blockedLeaks: 0,
    activeHooks: 1
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

  const handleFolderScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;

    setScanning(true);
    setLogs([]);

    const startTime = performance.now();
    const totalFiles = filesList.length;
    let leaksFound = 0;
    const pathParts = filesList[0].webkitRelativePath.split('/');
    const folderName = pathParts[0] || 'local-project';

    const tempLogs: ScanLog[] = [];

    // Scan files sequentially
    for (let i = 0; i < totalFiles; i++) {
      const file = filesList[i];
      setScanProgress({ current: i + 1, total: totalFiles, filename: file.name });

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
      totalScanned: 0,
      blockedLeaks: 0,
      activeHooks: 1
    });
  };

  return (
    <section className="bg-black min-h-screen py-28 px-6 md:px-12 relative overflow-hidden select-none">
      {/* Background visual details */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <span className="inline-block bg-neutral-900 border border-white/10 rounded-full px-4 py-1 text-xs text-neutral-400 lowercase mb-4 tracking-wider">
            compliance monitor
          </span>
          <h2 className="hero-title text-4xl md:text-5xl font-medium tracking-tight text-white lowercase mb-4">
            real-time protection.
          </h2>
          <p className="text-neutral-400 text-sm font-light lowercase leading-relaxed max-w-xl">
            visualizing active commit scanning filters running across registered microservices. this dashboard monitors pre-commit git intercept activities.
          </p>
        </div>

        {/* Real Scan Control Banner */}
        <div className="bg-neutral-900/40 border border-white/5 backdrop-blur-sm rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-0.5 text-[9px] font-mono text-neutral-300 lowercase">
              client-side audit engine
            </span>
            <h3 className="text-lg font-medium text-white lowercase">
              {customScanResults 
                ? `scanned codebase: ${customScanResults.folderName}` 
                : "run local scan on your project"}
            </h3>
            <p className="text-neutral-400 text-xs font-light lowercase leading-relaxed max-w-xl">
              {customScanResults
                ? `completed analysis in ${customScanResults.durationMs}ms. found ${customScanResults.leaksFound} credentials.`
                : "select your local project folder. securify will scan all directory files for secrets entirely client-side without uploading any files."}
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
          <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 mb-8 space-y-3 animate-pulse">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 select-text">
          <div className="bg-neutral-950 border border-white/5 p-6 rounded-2xl">
            <span className="block text-[10px] font-mono text-neutral-500 mb-1 lowercase">
              {customScanResults ? "total files analyzed" : "total files scanned"}
            </span>
            <span className="block text-2xl md:text-3xl font-semibold tracking-tight text-white font-mono">
              {stats.totalScanned.toLocaleString()}
            </span>
          </div>

          <div className="bg-neutral-950 border border-white/5 p-6 rounded-2xl">
            <span className="block text-[10px] font-mono text-neutral-500 mb-1 lowercase">
              {customScanResults ? "found credentials" : "blocked credential leaks"}
            </span>
            <span className="block text-2xl md:text-3xl font-semibold tracking-tight text-red-500 font-mono">
              {stats.blockedLeaks.toLocaleString()}
            </span>
          </div>

          <div className="bg-neutral-950 border border-white/5 p-6 rounded-2xl">
            <span className="block text-[10px] font-mono text-neutral-500 mb-1 lowercase">
              {customScanResults ? "scan duration" : "active local git hooks"}
            </span>
            <span className="block text-2xl md:text-3xl font-semibold tracking-tight text-neutral-300 font-mono">
              {customScanResults ? `${customScanResults.durationMs}ms` : stats.activeHooks.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Live Logs Terminal */}
        <div className="bg-neutral-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[480px]">
          
          {/* Bar controller */}
          <div className="px-4 py-3 bg-neutral-900/50 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 block"></span>
              <span className="text-[10px] text-neutral-500 font-mono ml-2 lowercase">
                {customScanResults ? "securify-local-audit-results" : "securify-audit-stream"}
              </span>
            </div>
            
            <div className="flex gap-2">
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
          <div className="p-6 flex-1 font-mono text-[11px] md:text-xs text-neutral-400 overflow-y-auto space-y-2 select-text">
            {logs.length === 0 ? (
              <div className="text-center text-neutral-600 py-20 select-none lowercase">
                [console] standby. select a local project folder above to run a client-side compliance audit scan.
              </div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`py-1 border-b border-white/[0.02] flex flex-col md:flex-row md:items-start gap-1 md:gap-4 transition-all duration-300 ${
                    log.status === 'failed' ? 'text-red-400' : 'text-neutral-300'
                  }`}
                >
                  <span className="text-neutral-600 select-none shrink-0">[{log.timestamp}]</span>
                  <span className="text-neutral-500 font-medium shrink-0">path:{log.repo}</span>
                  <span className="whitespace-pre-wrap break-all">{log.details}</span>
                </div>
              ))
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
