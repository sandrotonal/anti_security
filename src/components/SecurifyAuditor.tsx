import React, { useState, useEffect } from 'react';
import { parseDependencyFile } from '../lib/dependencyParser';
import { batchQueryVulnerabilities } from '../lib/cveDatabase';

interface Dependency {
  name: string;
  version: string;
}

interface OSVVulnerability {
  id: string;
  summary?: string;
  details?: string;
  aliases?: string[];
  modified?: string;
  published?: string;
  affected?: Array<{
    package?: {
      name: string;
      ecosystem: string;
    };
    ranges?: Array<{
      type: string;
      events: Array<{
        introduced?: string;
        fixed?: string;
      }>;
    }>;
    database_specific?: {
      severity?: string;
      cvss?: any;
    };
  }>;
}

interface AuditFinding {
  packageName: string;
  version: string;
  vulnId: string;
  summary: string;
  details: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  fixedVersion?: string;
  aliases?: string[];
}

export const SecurifyAuditor = () => {
  const [ecosystem, setEcosystem] = useState<string>('npm');
  const [packageName, setPackageName] = useState<string>('');
  const [packageVersion, setPackageVersion] = useState<string>('');
  const [pasteContent, setPasteContent] = useState<string>('');
  
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [scanResults, setScanResults] = useState<{
    totalDeps: number;
    vulnerableDeps: number;
    findings: AuditFinding[];
    durationMs: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Check if there are detected dependencies from dashboard scan
  useEffect(() => {
    try {
      const stored = localStorage.getItem('securify_detected_dependencies');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.deps) && parsed.deps.length > 0) {
          setEcosystem(parsed.ecosystem || 'npm');
          setDependencies(parsed.deps);
          setPasteContent(parsed.rawText || '');
          localStorage.removeItem('securify_detected_dependencies'); // Clear after loading
          
          // Trigger scan automatically
          triggerOSVAudit(parsed.deps, parsed.ecosystem || 'npm');
        }
      }
    } catch (e) {
      console.error('Failed to parse stored dependencies:', e);
    }
  }, []);

  const parsePackageJson = (text: string): Dependency[] => {
    try {
      const data = JSON.parse(text);
      const deps: Dependency[] = [];
      
      const cleanVersion = (v: string) => v.replace(/^[\^~>=<]+/g, '').trim();

      if (data.dependencies) {
        Object.entries(data.dependencies).forEach(([name, ver]) => {
          deps.push({ name, version: cleanVersion(ver as string) });
        });
      }
      if (data.devDependencies) {
        Object.entries(data.devDependencies).forEach(([name, ver]) => {
          deps.push({ name, version: cleanVersion(ver as string) });
        });
      }
      return deps;
    } catch {
      throw new Error('invalid package.json format. please ensure it is valid json.');
    }
  };

  const parseRequirementsTxt = (text: string): Dependency[] => {
    const lines = text.split('\n');
    const deps: Dependency[] = [];
    // Matches package==1.2.3 or package>=1.2.3
    const regex = /^([a-zA-Z0-9_\-\[\]]+)\s*(?:==|>=|<=|>|<|~=)\s*([0-9a-zA-Z\.\-\+]+)/;

    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine || cleanLine.startsWith('#')) return;
      const match = cleanLine.match(regex);
      if (match) {
        deps.push({ name: match[1], version: match[2] });
      }
    });

    if (deps.length === 0) {
      throw new Error('no valid dependencies found. please ensure format is "package==version".');
    }
    return deps;
  };

  const parseCargoToml = (text: string): Dependency[] => {
    const lines = text.split('\n');
    const deps: Dependency[] = [];
    let inDepsSection = false;

    const simpleRegex = /^\s*([a-zA-Z0-9_\-]+)\s*=\s*"([^"]+)"/;
    const complexRegex = /^\s*([a-zA-Z0-9_\-]+)\s*=\s*\{\s*version\s*=\s*"([^"]+)"/;

    lines.forEach(line => {
      const cleanLine = line.trim();
      if (cleanLine.startsWith('[') && cleanLine.endsWith(']')) {
        const section = cleanLine.toLowerCase();
        inDepsSection = section.includes('dependencies') || section.includes('dev-dependencies');
        return;
      }

      if (inDepsSection) {
        if (!cleanLine || cleanLine.startsWith('#')) return;
        
        let match = cleanLine.match(simpleRegex);
        if (match) {
          deps.push({ name: match[1], version: match[2] });
          return;
        }

        match = cleanLine.match(complexRegex);
        if (match) {
          deps.push({ name: match[1], version: match[2] });
        }
      }
    });

    if (deps.length === 0) {
      throw new Error('no valid cargo dependencies found under [dependencies] section.');
    }
    return deps;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      setPasteContent(text);
      handleParseContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleParseContent = (text: string, filename?: string) => {
    setErrorMsg('');
    try {
      let parsedDeps: Dependency[] = [];

      const fileLower = filename?.toLowerCase() || '';

      if (fileLower === 'package.json' || text.trim().startsWith('{')) {
        parsedDeps = parsePackageJson(text);
        setEcosystem('npm');
      } else if (fileLower === 'cargo.toml' || text.includes('[dependencies]')) {
        parsedDeps = parseCargoToml(text);
        setEcosystem('crates.io');
      } else if (fileLower.includes('requirements') || text.includes('==') || text.includes('>=')) {
        parsedDeps = parseRequirementsTxt(text);
        setEcosystem('PyPI');
      } else {
        // Fallback guess based on active dropdown selection
        if (ecosystem === 'npm') parsedDeps = parsePackageJson(text);
        else if (ecosystem === 'crates.io') parsedDeps = parseCargoToml(text);
        else if (ecosystem === 'PyPI') parsedDeps = parseRequirementsTxt(text);
      }

      setDependencies(parsedDeps);
    } catch (err: any) {
      setErrorMsg(err.message || 'failed to parse dependency file contents.');
      setDependencies([]);
    }
  };

  const queryOSVForPackage = async (name: string, ver: string, eco: string): Promise<AuditFinding[]> => {
    const osvEcosystemMap: Record<string, string> = {
      'npm': 'npm',
      'PyPI': 'PyPI',
      'Go': 'Go',
      'crates.io': 'crates.io',
      'Maven': 'Maven'
    };

    const targetEco = osvEcosystemMap[eco] || eco;

    try {
      const response = await fetch('https://api.osv.dev/v1/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          package: {
            name,
            ecosystem: targetEco
          },
          version: ver
        })
      });

      if (!response.ok) {
        throw new Error(`OSV API HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.vulns || !Array.isArray(data.vulns)) {
        return [];
      }

      return data.vulns.map((vuln: OSVVulnerability) => {
        let severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown' = 'unknown';
        const rawSeverity = vuln.affected?.[0]?.database_specific?.severity;
        if (rawSeverity) {
          const lower = rawSeverity.toLowerCase();
          if (lower.includes('critical')) severity = 'critical';
          else if (lower.includes('high')) severity = 'high';
          else if (lower.includes('medium') || lower.includes('moderate')) severity = 'medium';
          else if (lower.includes('low')) severity = 'low';
        }

        // Try to resolve the fixed version
        let fixedVersion = undefined;
        const events = vuln.affected?.[0]?.ranges?.[0]?.events;
        if (events && Array.isArray(events)) {
          const fixedEvent = events.find(e => e.fixed);
          if (fixedEvent) {
            fixedVersion = fixedEvent.fixed;
          }
        }

        return {
          packageName: name,
          version: ver,
          vulnId: vuln.id,
          summary: vuln.summary || 'no summary available',
          details: vuln.details || 'no details available',
          severity,
          fixedVersion,
          aliases: vuln.aliases
        };
      });
    } catch (err) {
      console.warn(`Failed to scan package ${name}@${ver} via OSV API:`, err);
      return [];
    }
  };

  const triggerOSVAudit = async (depsList: Dependency[], activeEco: string) => {
    if (depsList.length === 0) return;

    setScanning(true);
    setScanResults(null);
    setErrorMsg('');

    const startTime = performance.now();
    const findings: AuditFinding[] = [];
    const vulnerablePackagesSet = new Set<string>();

    // Concurrency control: limit to 5 concurrent queries at once
    const concurrencyLimit = 5;
    const listCopy = [...depsList];

    try {
      const runQueryQueue = async () => {
        let index = 0;

        const worker = async () => {
          while (index < listCopy.length) {
            const currentIdx = index++;
            const dep = listCopy[currentIdx];
            
            setScanProgress({
              current: currentIdx + 1,
              total: listCopy.length,
              name: `${dep.name}@${dep.version}`
            });

            // Perform API query
            const pkgFindings = await queryOSVForPackage(dep.name, dep.version, activeEco);
            if (pkgFindings.length > 0) {
              findings.push(...pkgFindings);
              vulnerablePackagesSet.add(dep.name);
            }

            // Yield to event loop
            await new Promise(r => setTimeout(r, 50));
          }
        };

        const workers = Array.from({ length: concurrencyLimit }, () => worker());
        await Promise.all(workers);
      };

      await runQueryQueue();

      const endTime = performance.now();
      setScanResults({
        totalDeps: depsList.length,
        vulnerableDeps: vulnerablePackagesSet.size,
        findings,
        durationMs: Math.round(endTime - startTime)
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'an error occurred during dependency audit.');
    } finally {
      setScanning(false);
      setScanProgress(null);
    }
  };

  const handleManualScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName.trim() || !packageVersion.trim()) return;

    const singleDep = [{ name: packageName.trim(), version: packageVersion.trim() }];
    setDependencies(singleDep);
    await triggerOSVAudit(singleDep, ecosystem);
  };

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'bg-red-950/40 border border-red-500/20 text-red-400';
      case 'high':
        return 'bg-orange-950/40 border border-orange-500/20 text-orange-400';
      case 'medium':
        return 'bg-amber-950/40 border border-amber-500/20 text-amber-400';
      case 'low':
        return 'bg-neutral-900 border border-white/5 text-neutral-400';
      default:
        return 'bg-neutral-900 border border-white/5 text-neutral-400';
    }
  };

  return (
    <section className="bg-black min-h-screen py-16 md:py-28 px-4 md:px-12 relative overflow-hidden select-none">
      {/* Visual background details */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="max-w-3xl mb-12 text-left">
          <span className="inline-block bg-neutral-900 border border-white/10 rounded-full px-4 py-1 text-xs text-neutral-400 lowercase mb-4 tracking-wider">
            dependency auditor
          </span>
          <h2 className="hero-title text-3xl md:text-5xl font-medium tracking-tight text-white lowercase mb-4">
            open-source vulnerability audit.
          </h2>
          <p className="text-neutral-400 text-sm font-light lowercase leading-relaxed max-w-xl">
            connect package configs to google osv database API. scans your third-party packages for real-time security alerts, CVE mappings, and package patch recommendations.
          </p>
        </div>

        {/* Auditor Main Container Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Paste, Drag-drop, Ecosystem config */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-neutral-900/40 border border-white/5 backdrop-blur-sm rounded-3xl p-6 space-y-6">
              <h3 className="text-sm font-mono font-medium text-white lowercase">input configurations</h3>
              
              <div className="space-y-4">
                {/* Ecosystem Selector */}
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-mono text-neutral-500 lowercase block pl-1">ecosystem target</label>
                  <select
                    value={ecosystem}
                    onChange={(e) => setEcosystem(e.target.value)}
                    disabled={scanning}
                    className="w-full bg-neutral-950 border border-white/10 text-white text-xs font-mono rounded-xl px-4 py-3.5 focus:outline-none focus:border-white/20 lowercase"
                  >
                    <option value="npm">npm (package.json)</option>
                    <option value="PyPI">pypi (requirements.txt)</option>
                    <option value="crates.io">cargo (cargo.toml)</option>
                    <option value="Go">go (go.mod)</option>
                    <option value="Maven">maven (pom.xml)</option>
                  </select>
                </div>

                {/* Paste Text Area */}
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-mono text-neutral-500 lowercase block pl-1">paste configuration content</label>
                  <textarea
                    value={pasteContent}
                    onChange={(e) => {
                      setPasteContent(e.target.value);
                      handleParseContent(e.target.value);
                    }}
                    disabled={scanning}
                    rows={8}
                    placeholder={`e.g. package.json dependencies content:\n{\n  "dependencies": {\n    "lodash": "4.17.15"\n  }\n}`}
                    className="w-full bg-neutral-950 border border-white/10 text-white text-xs font-mono rounded-xl p-4 focus:outline-none focus:border-white/20 placeholder-neutral-800"
                  />
                </div>

                {/* Or File Upload */}
                <div className="space-y-2">
                  <span className="block text-center text-[10px] font-mono text-neutral-600 uppercase">or upload config file</span>
                  <label className="flex flex-col items-center justify-center border border-white/5 border-dashed bg-neutral-950/40 rounded-xl p-4 cursor-pointer hover:border-white/10 transition-colors">
                    <svg className="w-6 h-6 text-neutral-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-[10px] font-mono text-neutral-500 lowercase">select package.json, requirements.txt, cargo.toml</span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={scanning}
                      className="hidden"
                      accept=".json,.txt,.toml,.mod"
                    />
                  </label>
                </div>

                {dependencies.length > 0 && (
                  <div className="bg-neutral-950 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                    <div className="text-left">
                      <span className="text-[10px] font-mono text-neutral-500 lowercase block">parsed dependencies</span>
                      <span className="text-sm font-semibold text-white font-mono">{dependencies.length} packages</span>
                    </div>
                    <button
                      onClick={() => triggerOSVAudit(dependencies, ecosystem)}
                      disabled={scanning}
                      className="bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl px-5 py-3 lowercase transition-all select-none disabled:opacity-50"
                    >
                      {scanning ? 'auditing...' : 'audit packages'}
                    </button>
                  </div>
                )}

                 {errorMsg && (
                  <div className="bg-neutral-900/40 border border-white/10 text-neutral-300 rounded-xl p-4 text-xs font-mono lowercase text-left">
                    <div className="flex items-start gap-2">
                      <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{errorMsg}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick manual query */}
            <div className="bg-neutral-900/40 border border-white/5 backdrop-blur-sm rounded-3xl p-6 text-left">
              <h3 className="text-sm font-mono font-medium text-white lowercase mb-4">query single package</h3>
              <form onSubmit={handleManualScan} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-neutral-500 lowercase block pl-1">package name</label>
                    <input
                      type="text"
                      required
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                      placeholder="e.g. lodash"
                      className="w-full bg-neutral-950 border border-white/10 text-white text-xs font-mono rounded-xl px-4 py-3 focus:outline-none focus:border-white/20 placeholder-neutral-800 lowercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-neutral-500 lowercase block pl-1">exact version</label>
                    <input
                      type="text"
                      required
                      value={packageVersion}
                      onChange={(e) => setPackageVersion(e.target.value)}
                      placeholder="e.g. 4.17.15"
                      className="w-full bg-neutral-950 border border-white/10 text-white text-xs font-mono rounded-xl px-4 py-3 focus:outline-none focus:border-white/20 placeholder-neutral-800 lowercase"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={scanning || !packageName.trim() || !packageVersion.trim()}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white border border-white/10 text-xs font-mono rounded-xl py-3 lowercase transition-all select-none disabled:opacity-50"
                >
                  quick query package
                </button>
              </form>
            </div>
          </div>

          {/* Right Panel: Results, Progress, Audit timeline */}
          <div className="lg:col-span-7 space-y-6">
            {/* Progress indicators */}
            {scanning && scanProgress && (
              <div className="bg-neutral-900/40 border border-white/5 backdrop-blur-md rounded-3xl p-6 space-y-5 shadow-[0_0_30px_rgba(255,255,255,0.02)] animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                    <div className="absolute inset-0 rounded-full border border-white/10 animate-ping opacity-75"></div>
                    <div className="w-5 h-5 border-2 border-white/10 border-t-white rounded-full animate-spin"></div>
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-mono text-white lowercase">running OSV vulnerability check</span>
                    <span className="block text-[9px] font-mono text-neutral-500 lowercase">querying packages concurrently...</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400">
                    <span className="lowercase">query queue: {scanProgress.current} of {scanProgress.total}</span>
                    <span className="text-white font-medium">{Math.round((scanProgress.current / scanProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="bg-white h-full transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.4)]" 
                      style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="bg-black border border-white/5 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-[9px] font-mono text-neutral-500 lowercase truncate max-w-[250px]">
                    target: {scanProgress.name}
                  </span>
                  <span className="text-[8px] font-mono text-neutral-500 px-2 py-0.5 bg-white/5 border border-white/10 rounded animate-pulse">
                    fetching api
                  </span>
                </div>
              </div>
            )}

            {/* Results overview */}
            {scanResults && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-neutral-900/40 border border-white/5 p-5 rounded-2xl text-left">
                    <span className="block text-[9px] font-mono text-neutral-500 lowercase mb-1">packages audited</span>
                    <span className="block text-2xl font-bold font-mono text-white">{scanResults.totalDeps}</span>
                  </div>
                  <div className="bg-neutral-900/40 border border-white/5 p-5 rounded-2xl text-left">
                    <span className="block text-[9px] font-mono text-neutral-500 lowercase mb-1">vulnerable packages</span>
                    <span className={`block text-2xl font-bold font-mono ${scanResults.vulnerableDeps > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {scanResults.vulnerableDeps}
                    </span>
                  </div>
                  <div className="bg-neutral-900/40 border border-white/5 p-5 rounded-2xl text-left">
                    <span className="block text-[9px] font-mono text-neutral-500 lowercase mb-1">query latency</span>
                    <span className="block text-2xl font-bold font-mono text-neutral-400">{scanResults.durationMs}ms</span>
                  </div>
                </div>

                {/* Audit details list */}
                <div className="bg-neutral-900/40 border border-white/5 backdrop-blur-sm rounded-3xl p-6 text-left">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4 select-none">
                    <h3 className="text-sm font-mono font-medium text-white lowercase">vulnerability findings</h3>
                    <span className="text-[10px] font-mono text-neutral-500 lowercase">
                      {scanResults.findings.length} issues identified
                    </span>
                  </div>

                  {scanResults.findings.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                      <div className="w-12 h-12 bg-neutral-950 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-lg shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        ✓
                      </div>
                      <div className="space-y-1">
                        <span className="block text-xs font-mono font-medium text-white lowercase">codebase safe from known vulnerabilities</span>
                        <p className="text-[10px] text-neutral-500 lowercase max-w-sm mx-auto leading-relaxed font-light">
                          0 security vulnerabilities mapped in the google osv registry for the parsed dependency footprint.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {scanResults.findings.map((finding, idx) => (
                        <div key={idx} className="bg-neutral-950/60 border border-white/5 rounded-2xl p-5 space-y-3 hover:border-white/10 transition-colors">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-white font-medium text-xs lowercase">
                                {finding.packageName}@{finding.version}
                              </span>
                              <span className={`text-[8px] font-mono px-2 py-0.5 rounded uppercase ${getSeverityBadgeClass(finding.severity)}`}>
                                {finding.severity}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-neutral-400 bg-white/5 px-2 py-0.5 rounded select-all border border-white/5">
                              {finding.vulnId}
                            </span>
                          </div>

                          <h4 className="text-white text-xs lowercase font-mono leading-relaxed">{finding.summary}</h4>
                          <p className="text-neutral-500 text-[10px] leading-relaxed font-light lowercase break-all line-clamp-3">
                            {finding.details}
                          </p>

                          <div className="flex justify-between items-center pt-3 border-t border-white/5 flex-wrap gap-2">
                            {finding.fixedVersion ? (
                              <div className="flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-500/10 px-2.5 py-1 rounded-lg">
                                <span className="text-emerald-400 text-[9px]">✔</span>
                                <span className="text-emerald-400 text-[10px] font-mono font-medium lowercase">
                                  remediation: upgrade to {finding.fixedVersion}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-neutral-900 border border-white/5 px-2.5 py-1 rounded-lg">
                                <span className="text-neutral-500 text-[9px]">⚠</span>
                                <span className="text-neutral-400 text-[10px] font-mono font-medium lowercase">
                                  remediation: no fix available yet
                                </span>
                              </div>
                            )}
                            <a
                              href={`https://osv.dev/vulnerability/${finding.vulnId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white hover:text-neutral-300 font-mono text-[9px] lowercase border border-white/10 hover:border-white/20 rounded px-2.5 py-1 transition-all select-none shrink-0"
                            >
                              view details on osv.dev
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Standby interface */}
            {!scanning && !scanResults && (
              <div className="bg-neutral-900/40 border border-white/5 rounded-3xl p-12 text-center select-none flex flex-col items-center justify-center min-h-[300px]">
                <svg className="w-12 h-12 text-neutral-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="block text-xs font-mono font-medium text-white lowercase mb-1">awaiting package input</span>
                <p className="text-[10px] text-neutral-500 lowercase leading-relaxed max-w-xs font-light">
                  paste package definitions or load configuration files on the left panel to execute real-time vulnerability tracking queries.
                </p>
              </div>
            )}
          </div>
        </div>
        {/* Monochromatic Subscription Marketing Hook */}
        <div className="mt-12 p-6 bg-neutral-900/30 border border-white/5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 text-left relative overflow-hidden select-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none opacity-20" />
          <div className="relative z-10 space-y-2 max-w-xl">
            <span className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-0.5 text-[9px] text-neutral-400 uppercase font-mono">
              securify professional
            </span>
            <h4 className="text-base font-medium text-white lowercase">vulnerability checking at scale.</h4>
            <p className="text-neutral-500 text-xs font-light lowercase leading-relaxed">
              standard accounts run client-only audits. upgrade to pro to scan unlimited remote configurations, schedule automated security health checks, and generate signed audit logs for compliance validation.
            </p>
          </div>
          <button
            onClick={() => {
              const navItem = document.getElementById('nav-pricing') || document.querySelector('[data-view="pricing"]');
              if (navItem) {
                (navItem as HTMLButtonElement).click();
              } else {
                window.location.hash = '#pricing';
              }
            }}
            className="relative z-10 w-full md:w-auto shrink-0 bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl px-6 py-3.5 lowercase transition-all"
          >
            view pro features
          </button>
        </div>

      </div>
    </section>
  );
};
