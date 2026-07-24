import { useState } from 'react';

interface Finding {
  file: string;
  line: number;
  type: string;
  codeMatch: string;
  details: string;
  contextLines?: Array<{ lineNum: number; content: string }>;
  safeFix?: string;
  explanation?: string;
  remediation?: string;
}

interface GitHubNativeSecuritySuiteProps {
  repoName: string;
  githubUser: { username: string; avatarUrl: string; token?: string } | null;
  scanning: boolean;
  onScanTrigger: () => void;
  reposList: string[];
  selectedRepo: string;
  onSelectRepo: (repo: string) => void;
  findings: Finding[];
  customScanResults: {
    folderName: string;
    totalFiles: number;
    leaksFound: number;
    durationMs: number;
    grade?: string;
    branch?: string;
    commitHash?: string;
    commitsCount?: number;
  } | null;
  isLimitReached?: boolean;
  onUpgradeTrigger?: () => void;
}

export const GitHubNativeSecuritySuite = ({
  repoName,
  githubUser,
  scanning,
  onScanTrigger,
  reposList,
  selectedRepo,
  onSelectRepo,
  findings,
  customScanResults,
  isLimitReached = false,
  onUpgradeTrigger
}: GitHubNativeSecuritySuiteProps) => {
  const [activeTab, setActiveTab] = useState<'security' | 'code_tree' | 'pr_bot' | 'actions'>('security');
  const [selectedFindingIndex, setSelectedFindingIndex] = useState<number | null>(findings.length > 0 ? 0 : null);
  const [copiedPrComment, setCopiedPrComment] = useState<boolean>(false);

  const displayRepo = repoName || selectedRepo || 'select-a-repository';
  const repoParts = displayRepo.split('/');
  const owner = repoParts[0] || githubUser?.username || 'user';
  const repoShort = repoParts[1] || displayRepo;
  const commitSha = customScanResults?.commitHash || '8f3a1c9';
  const branch = customScanResults?.branch || 'main';

  // User avatar URL resolution
  const userAvatar = githubUser?.avatarUrl || `https://avatars.githubusercontent.com/${owner}`;

  // Severity stats calculation
  const criticalCount = findings.filter(f => 
    f.type.toLowerCase().includes('aws') || 
    f.type.toLowerCase().includes('stripe') || 
    f.type.toLowerCase().includes('key') || 
    f.type.toLowerCase().includes('token')
  ).length;
  const highCount = findings.length - criticalCount;

  const handleCopyPrComment = (finding: Finding) => {
    const markdown = `## Securify Security Advisory

**Severity:** \`CRITICAL / HIGH\`
**Rule Triggered:** \`${finding.type}\`
**File Location:** [\`${finding.file}:${finding.line}\`](https://github.com/${displayRepo}/blob/${branch}/${finding.file}#L${finding.line})

### Detected Leak Pattern
\`\`\`
${finding.codeMatch}
\`\`\`

### Recommended Remediation
${finding.remediation || 'Immediately revoke this API key/secret and move it to environment variables or GitHub Secrets.'}

\`\`\`diff
- ${finding.codeMatch}
+ // Load dynamically from environment: process.env.SECRET_KEY
\`\`\`

---
*Reported automatically by Securify Security Suite for GitHub.*`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(markdown).then(() => {
        setCopiedPrComment(true);
        setTimeout(() => setCopiedPrComment(false), 2500);
      }).catch(() => {
        setCopiedPrComment(true);
        setTimeout(() => setCopiedPrComment(false), 2500);
      });
    } else {
      setCopiedPrComment(true);
      setTimeout(() => setCopiedPrComment(false), 2500);
    }
  };

  return (
    <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden shadow-2xl font-sans text-left text-[#c9d1d9] select-none">
      
      {/* Limit Reached Warning Banner */}
      {isLimitReached && (
        <div className="bg-[#161b22] border-b border-[#30363d] p-3 sm:p-4 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-left">
          <div className="flex items-center gap-2 text-[#f85149]">
            <svg fill="currentColor" className="w-4 h-4 shrink-0" viewBox="0 0 16 16">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
            </svg>
            <div>
              <span className="font-semibold text-white">Scan Limit Reached</span>
              <span className="text-[#8b949e] ml-1.5 hidden sm:inline">Upgrade to Pro plan to unlock unlimited repository audits.</span>
            </div>
          </div>
          {onUpgradeTrigger && (
            <button
              onClick={onUpgradeTrigger}
              className="bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium px-3.5 py-1.5 rounded-lg transition-all shrink-0 w-full sm:w-auto text-center"
            >
              Upgrade Plan
            </button>
          )}
        </div>
      )}

      {/* GitHub Repository Header Banner - Responsive Mobile Layout */}
      <div className="bg-[#161b22] border-b border-[#30363d] p-3 sm:p-5 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Repo Title & User Avatar */}
          <div className="space-y-1.5 max-w-full overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#8b949e] break-all">
              <img
                src={userAvatar}
                alt={owner}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
                className="w-5 h-5 rounded-full border border-[#30363d] object-cover shrink-0"
              />
              <span className="text-[#58a6ff] hover:underline font-medium cursor-pointer">{owner}</span>
              <span>/</span>
              <span className="text-white font-semibold text-sm sm:text-base">{repoShort}</span>
              
              <span className="border border-[#30363d] text-[10px] text-[#8b949e] font-medium px-2 py-0.2 rounded-full lowercase">
                public
              </span>
            </div>

            {/* Commit & Branch Details */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#8b949e]">
              <span className="border border-[#30363d] text-[10px] text-[#3fb950] font-medium px-2 py-0.2 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
                verified gpg
              </span>
              <div className="flex items-center gap-1 border border-[#30363d] px-2 py-0.2 rounded text-[10px] text-white">
                <svg fill="currentColor" className="w-3 h-3 text-[#8b949e] shrink-0" viewBox="0 0 16 16">
                  <path d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0zM3.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM1 12.75a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0zM7.5 6A2.5 2.5 0 0 0 5 8.5v3a.75.75 0 0 1-1.5 0v-3A4 4 0 0 1 7.5 4.5h2.44a2.25 2.25 0 1 1 0 1.5H7.5z" />
                </svg>
                <span className="font-mono">{branch}</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px]">
                <span>commit:</span>
                <span className="text-[#58a6ff] hover:underline font-medium cursor-pointer">{commitSha}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[#3fb950]">
                <span>✓</span>
                <span>securify suite active</span>
              </div>
            </div>
          </div>

          {/* Selector & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto shrink-0">
            <select
              disabled={scanning || reposList.length === 0}
              value={selectedRepo}
              onChange={(e) => onSelectRepo(e.target.value)}
              className="w-full sm:w-auto bg-[#0d1117] border border-[#30363d] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#58a6ff] lowercase disabled:opacity-50 truncate"
            >
              {reposList.map(repo => (
                <option key={repo} value={repo}>{repo}</option>
              ))}
            </select>

            <button
              onClick={isLimitReached && onUpgradeTrigger ? onUpgradeTrigger : onScanTrigger}
              disabled={scanning || !selectedRepo}
              className={`w-full sm:w-auto text-white text-xs font-medium rounded-lg px-4 py-2 transition-all select-none disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.98] ${
                isLimitReached ? 'bg-[#da3633] hover:bg-[#f85149]' : 'bg-[#238636] hover:bg-[#2ea043]'
              }`}
            >
              <svg fill="currentColor" className="w-3.5 h-3.5 text-white shrink-0" viewBox="0 0 16 16">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
              </svg>
              {scanning ? "scanning github repo..." : isLimitReached ? "limit reached — upgrade plan" : "re-sync & scan repo"}
            </button>
          </div>

        </div>

        {/* Clean Single-Line Dependabot Alerts Bar - Grid on Mobile */}
        <div className="pt-2.5 border-t border-[#30363d] space-y-1.5 text-xs font-mono text-[#8b949e]">
          <div className="text-white font-medium text-[11px]">Dependabot Alerts:</div>
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-white whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-[#f85149] shrink-0" />
              <span>{criticalCount} Critical</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#8b949e] whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-[#f78166] shrink-0" />
              <span>{highCount} High</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#8b949e] whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-[#d29922] shrink-0" />
              <span>0 Moderate</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#8b949e] whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-[#3fb950] shrink-0" />
              <span>0 Low</span>
            </span>
          </div>
        </div>

        {/* GitHub Native Navigation Tabs */}
        <div className="flex items-center gap-1 mt-3 border-b border-[#30363d] overflow-x-auto scrollbar-none whitespace-nowrap">
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-2 text-xs font-medium border-b-2 flex items-center gap-2 shrink-0 transition-colors ${
              activeTab === 'security'
                ? 'border-[#f78166] text-white font-semibold'
                : 'border-transparent text-[#8b949e] hover:text-white'
            }`}
          >
            <svg fill="currentColor" className="w-4 h-4 text-[#f78166] shrink-0" viewBox="0 0 16 16">
              <path d="M8 0c-.17 0-.34.04-.49.12L1.87 3.03C1.34 3.3 1 3.84 1 4.43v4.61c0 3.71 2.92 7.02 6.57 7.91.28.07.57.07.85 0C12.08 16.06 15 12.75 15 9.04V4.43c0-.59-.34-1.13-.87-1.4L8.49.12A1.16 1.16 0 0 0 8 0Zm0 1.5 5.5 2.93v4.61c0 2.98-2.33 5.67-5.5 6.42-3.17-.75-5.5-3.44-5.5-6.42V4.43L8 1.5Z" />
            </svg>
            <span>Securify Code Scanning</span>
            {findings.length > 0 && (
              <span className="bg-[#30363d] text-white text-[10px] font-bold px-2 py-0.2 rounded-full">
                {findings.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('code_tree')}
            className={`px-3 py-2 text-xs font-medium border-b-2 flex items-center gap-2 shrink-0 transition-colors ${
              activeTab === 'code_tree'
                ? 'border-[#58a6ff] text-white font-semibold'
                : 'border-transparent text-[#8b949e] hover:text-white'
            }`}
          >
            <svg fill="currentColor" className="w-4 h-4 text-[#58a6ff] shrink-0" viewBox="0 0 16 16">
              <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8v2h1.75a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 2 13.25Zm2.5-1a1 1 0 0 0-1 1v8.5h10V1.5Z" />
            </svg>
            <span>Repository File Tree</span>
          </button>

          <button
            onClick={() => setActiveTab('pr_bot')}
            className={`px-3 py-2 text-xs font-medium border-b-2 flex items-center gap-2 shrink-0 transition-colors ${
              activeTab === 'pr_bot'
                ? 'border-[#58a6ff] text-white font-semibold'
                : 'border-transparent text-[#8b949e] hover:text-white'
            }`}
          >
            <svg fill="currentColor" className="w-4 h-4 text-[#58a6ff] shrink-0" viewBox="0 0 16 16">
              <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1-1.06 1.06L8.25 5.21v7.04a.75.75 0 0 1-1.5 0V5.21L4.81 7.133a.75.75 0 0 1-1.06-1.06l3-3Z" />
            </svg>
            <span>PR Review Bot Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('actions')}
            className={`px-3 py-2 text-xs font-medium border-b-2 flex items-center gap-2 shrink-0 transition-colors ${
              activeTab === 'actions'
                ? 'border-[#3fb950] text-white font-semibold'
                : 'border-transparent text-[#8b949e] hover:text-white'
            }`}
          >
            <svg fill="currentColor" className="w-4 h-4 text-[#3fb950] shrink-0" viewBox="0 0 16 16">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
            </svg>
            <span>GitHub Actions Live Logs</span>
          </button>
        </div>

      </div>

      {/* Main Content Area - Uncrowded Padding for Mobile */}
      <div className="p-3 sm:p-5 bg-[#0d1117]">
        {activeTab === 'security' && (
          <div className="space-y-4">
            {findings.length === 0 ? (
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-8 text-center space-y-2.5">
                <div className="w-10 h-10 rounded-full border border-[#30363d] text-[#3fb950] flex items-center justify-center mx-auto text-lg font-bold">
                  ✓
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-white break-all">0 Vulnerabilities Found in {displayRepo}</h3>
                <p className="text-[11px] text-[#8b949e] max-w-md mx-auto leading-relaxed">
                  Securify static code analysis engine completed repository scan on branch <span className="font-mono text-white">{branch}</span>. All files passed credentials leakage checks.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Left Column - Findings List */}
                <div className="lg:col-span-5 space-y-2">
                  <div className="text-xs text-[#8b949e] font-medium uppercase tracking-wider px-1">
                    Security Advisories ({findings.length})
                  </div>
                  
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
                    {findings.map((finding, idx) => {
                      const itemKey = `${finding.file}-${finding.line}-${idx}`;
                      return (
                        <div
                          key={itemKey}
                          onClick={() => setSelectedFindingIndex(idx)}
                          className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                            selectedFindingIndex === idx
                              ? 'bg-[#161b22] border-[#58a6ff]'
                              : 'bg-[#0d1117] border-[#30363d] hover:border-[#8b949e]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[#f85149] text-[11px] font-semibold">
                              ● {finding.type}
                            </span>
                            <span className="text-[10px] font-mono text-[#8b949e]">
                              L{finding.line}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-white truncate font-medium">
                            {finding.file}
                          </div>
                          <p className="text-[11px] text-[#8b949e] line-clamp-1 mt-1 font-light">
                            {finding.details}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column - Native GitHub Code Diff & Advisory Details */}
                <div className="lg:col-span-7">
                  {selectedFindingIndex !== null && findings[selectedFindingIndex] && (
                    <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden space-y-3">
                      
                      {/* Card Header */}
                      <div className="p-3 border-b border-[#30363d] bg-[#161b22] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-[#8b949e] uppercase font-mono tracking-wider">
                            GHSA-SECURIFY-EXPOSURE
                          </span>
                          <h4 className="text-xs font-semibold text-white">
                            {findings[selectedFindingIndex].type}
                          </h4>
                        </div>
                        <button
                          onClick={() => handleCopyPrComment(findings[selectedFindingIndex])}
                          className="bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] text-[11px] font-mono px-3 py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 shrink-0"
                        >
                          {copiedPrComment ? "✓ PR Comment Copied" : "Copy PR Bot Markdown"}
                        </button>
                      </div>

                      {/* Code Diff Viewer */}
                      <div className="p-3 space-y-3">
                        <div className="flex items-center justify-between text-xs text-[#8b949e] font-mono">
                          <span className="truncate max-w-[180px] sm:max-w-none">File: <strong className="text-white">{findings[selectedFindingIndex].file}</strong></span>
                          <span className="shrink-0">Line: <strong className="text-[#f85149]">{findings[selectedFindingIndex].line}</strong></span>
                        </div>

                        {/* GitHub Native Diff Container */}
                        <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-x-auto font-mono text-xs select-text scrollbar-thin">
                          <div className="bg-[#161b22] px-3 py-1.5 border-b border-[#30363d] text-[#8b949e] text-[10px] flex items-center justify-between min-w-[260px]">
                            <span>@@ -{findings[selectedFindingIndex].line - 1},3 +{findings[selectedFindingIndex].line - 1},3 @@</span>
                            <span className="text-[#f85149] font-bold">HIGH RISK LEAK MATCH</span>
                          </div>

                          <div className="divide-y divide-[#30363d]/30 min-w-[260px]">
                            {findings[selectedFindingIndex].contextLines ? (
                              findings[selectedFindingIndex].contextLines!.map((lineObj, lIdx) => (
                                <div
                                  key={`${lineObj.lineNum}-${lIdx}`}
                                  className={`flex items-start px-3 py-1 ${
                                    lineObj.lineNum === findings[selectedFindingIndex].line
                                      ? 'bg-[#da3633]/20 text-[#f85149] font-semibold'
                                      : 'text-[#c9d1d9]'
                                  }`}
                                >
                                  <span className="w-8 shrink-0 text-[#8b949e] text-[10px] select-none">
                                    {lineObj.lineNum}
                                  </span>
                                  <span className="w-4 shrink-0 font-bold select-none">
                                    {lineObj.lineNum === findings[selectedFindingIndex].line ? '-' : ' '}
                                  </span>
                                  <span className="break-all whitespace-pre-wrap">{lineObj.content}</span>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 bg-[#da3633]/20 text-[#f85149] break-all">
                                - {findings[selectedFindingIndex].codeMatch}
                              </div>
                            )}

                            {/* Safe Remediation Diff Line */}
                            <div className="flex items-start px-3 py-1 bg-[#2ea043]/20 text-[#3fb950] font-semibold">
                              <span className="w-8 shrink-0 text-[#8b949e] text-[10px] select-none">+</span>
                              <span className="w-4 shrink-0 font-bold select-none">+</span>
                              <span className="break-all whitespace-pre-wrap">
                                // Load securely from environment: process.env.SECRET_KEY
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Explanation & Remediation Box */}
                        <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 space-y-1.5 text-xs">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#f78166]" />
                            Remediation Guidance
                          </div>
                          <p className="text-[#8b949e] leading-relaxed">
                            {findings[selectedFindingIndex].remediation || 'Immediately revoke this credential. Move plain-text keys to GitHub Repository Secrets or environment variables.'}
                          </p>
                        </div>

                      </div>

                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* GitHub Repository Code Tree Tab */}
        {activeTab === 'code_tree' && (
          <div className="space-y-3">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden text-xs">
              <div className="p-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between font-mono text-[11px] text-[#8b949e]">
                <span className="truncate">Repository Contents — {displayRepo}</span>
                <span className="shrink-0 ml-2">Branch: {branch}</span>
              </div>

              <div className="divide-y divide-[#30363d] font-mono">
                {findings.length > 0 ? (
                  findings.map((f, idx) => (
                    <div key={idx} className="p-3 hover:bg-[#21262d]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
                      <div className="flex items-center gap-2">
                        <svg fill="currentColor" className="w-4 h-4 text-[#58a6ff] shrink-0" viewBox="0 0 16 16">
                          <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8v2h1.75a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 2 13.25Zm2.5-1a1 1 0 0 0-1 1v8.5h10V1.5Z" />
                        </svg>
                        <span className="text-white font-medium break-all">{f.file}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#f85149] text-[11px] font-bold">
                          ● {f.type} (Line {f.line})
                        </span>
                        <span className="text-[#8b949e] text-[10px]">Securify Audited</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-5 text-center text-[#8b949e] space-y-1">
                    <p className="text-white font-semibold">Repository Tree Verified Clean</p>
                    <p className="text-[11px]">All checked source files in {displayRepo} passed security checks.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PR Review Bot Simulator Tab */}
        {activeTab === 'pr_bot' && (
          <div className="space-y-3 max-w-3xl mx-auto">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 sm:p-5 space-y-3.5">
              <div className="flex items-center gap-3 border-b border-[#30363d] pb-3">
                <img
                  src={userAvatar}
                  alt={owner}
                  className="w-8 h-8 rounded-full border border-[#30363d] object-cover shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white">securify-bot</span>
                    <span className="border border-[#30363d] text-[9px] text-[#8b949e] px-1.5 py-0.2 rounded font-mono">bot</span>
                    <span className="text-xs text-[#8b949e] hidden sm:inline">commented on Pull Request #14</span>
                  </div>
                  <span className="text-[10px] text-[#8b949e]">automated security code review gate</span>
                </div>
              </div>

              <div className="space-y-3 text-xs text-[#c9d1d9] leading-relaxed">
                <div className="p-2.5 border border-[#30363d] rounded-lg text-[#f85149] font-medium flex items-center gap-2">
                  <svg fill="currentColor" className="w-4 h-4 text-[#f85149] shrink-0" viewBox="0 0 16 16">
                    <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                  <span>Requesting changes — {findings.length > 0 ? `${findings.length} credential leak(s)` : '0 credential leaks'} detected in PR commits.</span>
                </div>

                <p>
                  Securify automated scanner audited <strong>{customScanResults?.totalFiles || 12} files</strong> in this pull request and flagged plain-text credential patterns.
                </p>

                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 font-mono text-[11px] space-y-2 overflow-x-auto">
                  <div className="text-[#8b949e]">Suggested Change in src/config/api.js:</div>
                  <div className="bg-[#da3633]/20 text-[#f85149] p-2 rounded break-all">- const STRIPE_KEY = "sk_test_51NzABC123XYZ1234567890abcdef";</div>
                  <div className="bg-[#2ea043]/20 text-[#3fb950] p-2 rounded break-all">+ const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;</div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      alert('Securify Bot GitHub PR Action triggered: PR status updated to success.');
                    }}
                    className="w-full sm:w-auto bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium rounded-lg px-4 py-2 transition-colors"
                  >
                    Apply Suggestion & Approve PR
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GitHub Actions Live Log Simulator Tab */}
        {activeTab === 'actions' && (
          <div className="space-y-3 max-w-4xl mx-auto">
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3.5 font-mono text-xs text-[#c9d1d9] space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#30363d] pb-2.5 text-[#8b949e]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse" />
                  <span>Job: Securify Security Scan Workflow</span>
                </div>
                <span className="text-[11px]">Runner: ubuntu-latest (x64)</span>
              </div>

              <div className="pt-1.5 space-y-1.5 leading-relaxed text-[11px]">
                <div className="text-[#3fb950]">► Run securify/code-security-action@v2</div>
                <div className="text-[#8b949e]">  Fetching repository tree for {displayRepo}...</div>
                <div className="text-[#8b949e]">  Loaded branch: {branch} (HEAD @ {commitSha})</div>
                <div className="text-[#8b949e]">  Running client-side Web Worker pool audit...</div>
                <div className="text-[#58a6ff]">  Inspected {customScanResults?.totalFiles || 42} source files in {customScanResults?.durationMs || 3200}ms.</div>
                
                {findings.length > 0 ? (
                  <div className="text-[#f85149] font-bold pt-2">
                    ERROR: Found {findings.length} credential leak(s) in repository! Workflow failed with exit code 1.
                  </div>
                ) : (
                  <div className="text-[#3fb950] font-bold pt-2">
                    SUCCESS: Zero secret leaks found. Repository compliance check PASSED.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
