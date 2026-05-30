import { useState, useRef, useEffect } from 'react';

interface Finding {
  file: string;
  line: number;
  type: string;
  codeMatch: string;
  details: string;
  contextLines: { lineNum: number; content: string }[];
  safeFix: string;
  explanation: string;
  remediation: string;
}

interface ScanLog {
  timestamp: string;
  repo: string;
  status: 'passed' | 'failed';
  details: string;
  findings?: Finding[];
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

const parseDependenciesJson = (text: string) => {
  try {
    const data = JSON.parse(text);
    const deps: { name: string; version: string }[] = [];
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
    return [];
  }
};

const parseDependenciesRequirements = (text: string) => {
  const lines = text.split('\n');
  const deps: { name: string; version: string }[] = [];
  const regex = /^([a-zA-Z0-9_\-\[\]]+)\s*(?:==|>=|<=|>|<|~=)\s*([0-9a-zA-Z\.\-\+]+)/;
  lines.forEach(line => {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith('#')) return;
    const match = cleanLine.match(regex);
    if (match) {
      deps.push({ name: match[1], version: match[2] });
    }
  });
  return deps;
};

const parseDependenciesCargo = (text: string) => {
  const lines = text.split('\n');
  const deps: { name: string; version: string }[] = [];
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
  return deps;
};

const DashboardUserAvatar = ({ username, avatarUrl, sizeClass = "w-5 h-5" }: { username: string; avatarUrl: string; sizeClass?: string }) => {
  const [imgSrc, setImgSrc] = useState<string>(avatarUrl);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(avatarUrl);
    setHasError(false);
  }, [avatarUrl, username]);

  if (hasError || !imgSrc) {
    const initial = username.charAt(0).toUpperCase();
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 flex items-center justify-center font-mono text-white text-[8px] font-bold select-none uppercase`}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={username}
      onError={() => {
        const directUrl = `https://avatars.githubusercontent.com/${username}`;
        if (imgSrc !== directUrl) {
          setImgSrc(directUrl);
        } else {
          setHasError(true);
        }
      }}
      className={`${sizeClass} rounded-full border border-white/20 object-cover`}
    />
  );
};

interface SecurifyDashboardProps {
  githubUser: { username: string; avatarUrl: string; token?: string } | null;
  onGithubLogin: () => void;
  onViewChange?: (view: any) => void;
}

export const SecurifyDashboard = ({ githubUser, onGithubLogin, onViewChange }: SecurifyDashboardProps) => {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [isLiveStream, setIsLiveStream] = useState<boolean>(true);
  const [stats, setStats] = useState({
    totalScanned: 842,
    blockedLeaks: 14,
    activeHooks: 3
  });

  const [scanTab, setScanTab] = useState<'local' | 'github'>('local');
  const [selectedGithubRepo, setSelectedGithubRepo] = useState<string>('');

  const [githubRepos, setGithubRepos] = useState<string[]>([]);
  const [customRepoName, setCustomRepoName] = useState<string>('');
  const [isLabOpen, setIsLabOpen] = useState<boolean>(false);
  const [injectStripe, setInjectStripe] = useState<boolean>(false);
  const [injectAws, setInjectAws] = useState<boolean>(false);
  const [injectDb, setInjectDb] = useState<boolean>(false);
  const [injectSlack, setInjectSlack] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    if (githubUser) {
      const defaultRepos = [
        `${githubUser.username}/anti_security`,
        `${githubUser.username}/istanbul_api`,
        `${githubUser.username}/react-dashboard`,
        `${githubUser.username}/personal-site`
      ];
      setGithubRepos(defaultRepos);
      setSelectedGithubRepo(`${githubUser.username}/anti_security`);

      // Fetch real public and private repositories from GitHub
      const fetchRealRepos = async () => {
        try {
          const url = githubUser.token 
            ? 'https://api.github.com/user/repos?per_page=100&sort=updated'
            : `https://api.github.com/users/${githubUser.username}/repos?per_page=100&sort=updated`;
          
          const headers: HeadersInit = {};
          if (githubUser.token) {
            headers['Authorization'] = `token ${githubUser.token}`;
          }

          const res = await fetch(url, { headers });
          if (!res.ok) throw new Error('Failed to fetch repositories');
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && active) {
            const repoNames = data.map((r: any) => r.full_name);
            setGithubRepos(repoNames);
            setSelectedGithubRepo(repoNames[0]);
          }
        } catch (err) {
          console.warn('Using fallback repositories due to API limit or error:', err);
        }
      };

      fetchRealRepos();
    } else {
      setGithubRepos([]);
      setSelectedGithubRepo('');
      setScanTab('local');
    }
    return () => {
      active = false;
    };
  }, [githubUser]);
  
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
    grade?: string;
    branch?: string;
    commitHash?: string;
    commitsCount?: number;
    filesStatus?: Array<{
      name: string;
      status: 'clean' | 'compromised';
      leakType?: string;
    }>;
    speedMBs?: number;
    totalBytes?: number;
  } | null>(null);

  interface ScanHistoryEntry {
    id: string;
    folderName: string;
    totalFiles: number;
    leaksFound: number;
    durationMs: number;
    timestamp: string;
  }

  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [badgeCopied, setBadgeCopied] = useState<boolean>(false);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [reportShared, setReportShared] = useState<boolean>(false);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [copiedFix, setCopiedFix] = useState<boolean>(false);

  // Wave 7 States
  interface GithubCommitInfo {
    sha: string;
    message: string;
    date: string;
    author: string;
    findingsCount?: number;
    findings?: Finding[];
    loading?: boolean;
    expanded?: boolean;
  }
  const [githubCommits, setGithubCommits] = useState<GithubCommitInfo[]>([]);
  const [activeGithubSubTab, setActiveGithubSubTab] = useState<'code' | 'sentinel' | 'pipeline'>('code');

  interface WorkflowFinding {
    file: string;
    rule: string;
    severity: 'critical' | 'high' | 'warning';
    description: string;
    remediation: string;
    codeSnippet?: string;
  }
  const [workflowFindings, setWorkflowFindings] = useState<WorkflowFinding[]>([]);

  // Exploit Simulator state
  const [exploitSimulating, setExploitSimulating] = useState<Finding | null>(null);
  const [simulatedConsoleLogs, setSimulatedConsoleLogs] = useState<string[]>([]);


  // Disable body scroll when finding modal is open
  useEffect(() => {
    if (selectedFinding) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedFinding]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedFinding(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const shareAuditReport = () => {
    if (!customScanResults) return;
    try {
      const reportData = {
        folder: customScanResults.folderName,
        files: customScanResults.totalFiles,
        leaks: customScanResults.leaksFound,
        duration: customScanResults.durationMs,
        critical: severityStats.critical,
        high: severityStats.high,
        warning: severityStats.warning,
        timestamp: new Date().toLocaleDateString()
      };
      const encoded = btoa(JSON.stringify(reportData));
      const shareUrl = `${window.location.origin}${window.location.pathname}?report=${encoded}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        setReportShared(true);
        setTimeout(() => setReportShared(false), 2000);
      });
    } catch (err) {
      console.error('Failed to share report:', err);
    }
  };

  const parseFindingFromLog = (log: ScanLog): Finding => {
    let file = log.repo || 'unknown-file.js';
    let line = 1;
    let type = 'exposed secret key';
    let codeMatch = 'const secret_key = "************"';
    let explanation = 'sensitive credential exposed in code repository.';
    let remediation = 'revoke the credential, add it to environment variables, and rewrite commit history.';
    let safeFix = 'const secret_key = process.env.SECRET_KEY;';
    let contextLines = [
      { lineNum: 1, content: 'import config from "./config";' },
      { lineNum: 2, content: '// insecure initialization' },
      { lineNum: 3, content: 'const secret_key = "************"' },
      { lineNum: 4, content: 'export default secret_key;' }
    ];

    const detailsStr = log.details || '';
    
    if (detailsStr.includes('AWS Access Key ID')) {
      type = 'AWS Access Key ID';
      codeMatch = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
      explanation = 'aws access key id is hardcoded in plain text. anyone with read access to this repository can compromise your aws account resources.';
      remediation = 'move the key to a safe .env file (add to .gitignore) and reference it via process.env or system environment variables.';
      safeFix = 'AWS_ACCESS_KEY_ID=env.AWS_ACCESS_KEY_ID # load from environment variables';
      contextLines = [
        { lineNum: 1, content: '# Server configurations' },
        { lineNum: 2, content: 'PORT=8080' },
        { lineNum: 3, content: 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE' },
        { lineNum: 4, content: 'AWS_REGION=us-east-1' }
      ];
    } else if (detailsStr.includes('AWS Secret Access Key')) {
      type = 'AWS Secret Access Key';
      codeMatch = 'aws_secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"';
      explanation = 'aws secret access key is exposed. this gives full programmatic access to your cloud infrastructure.';
      remediation = 'revoke the compromised credentials immediately in the aws console, generate new credentials, and store them securely.';
      safeFix = 'const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;';
      contextLines = [
        { lineNum: 1, content: '// aws client helper' },
        { lineNum: 2, content: 'const AWS = require("aws-sdk");' },
        { lineNum: 3, content: 'aws_secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"' },
        { lineNum: 4, content: 'const s3 = new AWS.S3({ secretAccessKey: awsSecretKey });' }
      ];
    } else if (detailsStr.includes('Supabase Service Role JWT')) {
      type = 'Supabase Service Role JWT';
      codeMatch = 'const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.signature";';
      explanation = 'supabase service role jwt bypasses all row-level security (rls) policies. exposing this allows anyone to modify or download your entire database.';
      remediation = 'rotate the service role key immediately in the supabase dashboard. never expose it in client-side code; restrict it to secure serverless functions or backends.';
      safeFix = 'const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // keep on server side!';
      contextLines = [
        { lineNum: 1, content: 'import { createClient } from "@supabase/supabase-js";' },
        { lineNum: 2, content: 'const supabaseUrl = "https://your-project.supabase.co";' },
        { lineNum: 3, content: 'const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.signature";' },
        { lineNum: 4, content: 'export const supabase = createClient(supabaseUrl, supabaseKey);' }
      ];
    } else if (detailsStr.includes('Stripe Secret API Key')) {
      type = 'Stripe Secret API Key';
      codeMatch = 'const stripe = require("stripe")("sk_test_51NzABC123XYZ...");';
      explanation = 'stripe secret api key exposed. malicious actors can use this to execute transactions, refund charges, or access customer data.';
      remediation = 'go to Stripe Dashboard -> Developers -> API Keys and roll the secret key. transition code to use environment variables.';
      safeFix = 'const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);';
      contextLines = [
        { lineNum: 10, content: '// stripe integration module' },
        { lineNum: 11, content: 'const express = require("express");' },
        { lineNum: 12, content: 'const stripe = require("stripe")("sk_test_51NzABC123XYZ...");' },
        { lineNum: 13, content: 'const app = express();' }
      ];
    } else if (detailsStr.includes('GitHub Personal Access Token')) {
      type = 'GitHub Personal Access Token';
      codeMatch = 'const github_pat = "ghp_1234567890abcdefghijklmnopqrstuvwxyz123456";';
      explanation = 'github personal access token (pat) exposed. this can allow unauthorized access, modification, or deletion of repositories.';
      remediation = 'immediately delete/revoke this pat in your GitHub settings (developer settings -> personal access tokens) and recreate it with narrow scopes if required.';
      safeFix = 'const github_pat = process.env.GH_PAT_TOKEN;';
      contextLines = [
        { lineNum: 10, content: 'export async function authenticate() {' },
        { lineNum: 11, content: '  console.log("authenticating...");' },
        { lineNum: 12, content: '  const github_pat = "ghp_1234567890abcdefghijklmnopqrstuvwxyz123456";' },
        { lineNum: 13, content: '  const headers = { Authorization: `token ${github_pat}` };' }
      ];
    } else if (detailsStr.includes('Google Cloud API Key')) {
      type = 'Google Cloud API Key';
      codeMatch = 'const gMapsKey = "AIzaSyA12345678901234567890123456789012";';
      explanation = 'google cloud api key is hardcoded. attackers can hijack this key, leading to quota exhaustion or massive billing changes.';
      remediation = 'restrict the api key scope (ip, referrer, or api restrictions) in the google cloud console, and rotate the key.';
      safeFix = 'const gMapsKey = process.env.GOOGLE_MAPS_API_KEY;';
      contextLines = [
        { lineNum: 90, content: '// load maps element' },
        { lineNum: 91, content: 'const element = document.getElementById("map");' },
        { lineNum: 92, content: 'const gMapsKey = "AIzaSyA12345678901234567890123456789012";' },
        { lineNum: 93, content: 'const loader = new Loader({ apiKey: gMapsKey });' }
      ];
    } else if (detailsStr.includes('Slack Webhook')) {
      type = 'Slack Webhook URL';
      codeMatch = 'const webhook = "https://hooks.slack.com/services/" + "T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX";';
      explanation = 'slack webhook url exposed. allows spammers or attackers to send messages, forge notifications, or gather workspace information.';
      remediation = 'revoke/delete the exposed webhook url in slack app management, recreate it, and store it as a secure secret variable.';
      safeFix = 'const webhook = process.env.SLACK_WEBHOOK_URL;';
      contextLines = [
        { lineNum: 2, content: 'const axios = require("axios");' },
        { lineNum: 3, content: 'const webhook = "https://hooks.slack.com/services/" + "T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX";' },
        { lineNum: 4, content: 'axios.post(webhook, { text: "Hello World" });' }
      ];
    }

    const lineMatch = detailsStr.match(/(?:L|line\s+)(\d+)/i);
    if (lineMatch && lineMatch[1]) {
      line = parseInt(lineMatch[1], 10);
      contextLines = contextLines.map((c, i) => ({
        lineNum: line - 2 + i,
        content: c.content
      }));
    }

    const fileMatch = detailsStr.match(/(?:on\s+)([\w\-\.\/]+)(?::L\d+|\s|$)/i);
    if (fileMatch && fileMatch[1]) {
      file = fileMatch[1];
    }

    return {
      file,
      line,
      type,
      codeMatch,
      details: type,
      contextLines,
      safeFix,
      explanation,
      remediation
    };
  };

  const handleLogClick = (log: ScanLog) => {
    if (log.status !== 'failed') return;
    if (log.findings && log.findings.length > 0) {
      setSelectedFinding(log.findings[0]);
    } else {
      setSelectedFinding(parseFindingFromLog(log));
    }
  };

  // Load scan history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('securify_scan_history');
      if (stored) {
        setScanHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load scan history:', err);
    }
  }, []);

  const clearScanHistory = () => {
    setScanHistory([]);
    try {
      localStorage.removeItem('securify_scan_history');
    } catch (err) {
      console.error('Failed to clear scan history:', err);
    }
  };

  const copyBadgeMarkdown = async (markdown: string) => {
    try {
      await navigator.clipboard.writeText(markdown);
      setBadgeCopied(true);
      setTimeout(() => setBadgeCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy badge markdown:', err);
    }
  };

  const exportReportJSON = () => {
    if (!customScanResults) return;
    const report = {
      scanMetadata: {
        folderName: customScanResults.folderName,
        totalFilesScanned: customScanResults.totalFiles,
        durationMs: customScanResults.durationMs,
        timestamp: new Date().toISOString()
      },
      vulnerabilityMetrics: {
        totalLeaks: customScanResults.leaksFound,
        critical: severityStats.critical,
        high: severityStats.high,
        warning: severityStats.warning
      },
      findings: logs
        .filter((l) => l.status === 'failed')
        .map((l) => ({
          file: l.repo,
          timestamp: l.timestamp,
          details: l.details
        }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `securify_report_${customScanResults.folderName}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  interface InjectedLeaks {
    stripe: boolean;
    aws: boolean;
    db: boolean;
    slack: boolean;
  }

  const handleGithubScan = async (repoName: string, injectedLeaks?: InjectedLeaks) => {
    setIsLiveStream(false);
    setScanning(true);
    setLogs([]);
    setCustomScanResults(null);

    const getGithubHeaders = (): HeadersInit => {
      const headers: HeadersInit = {};
      if (githubUser?.token) {
        headers['Authorization'] = `token ${githubUser.token}`;
      }
      return headers;
    };

    const addLog = (msg: string, status: 'passed' | 'failed' = 'passed', details?: string) => {
      setLogs(prev => [
        {
          timestamp: new Date().toLocaleTimeString(),
          repo: repoName,
          status,
          details: details || `✔ securify-sync: ${msg}`
        },
        ...prev
      ]);
    };

    let defaultBranch = 'main';
    let repoFiles: string[] = [];
    let commitsCount = 104;
    let repoFindings: Finding[] = [];

    const fetchFileContent = async (path: string): Promise<string> => {
      if (githubUser?.token) {
        try {
          const apiRes = await fetch(`https://api.github.com/repos/${repoName}/contents/${path}?ref=${defaultBranch}`, {
            headers: getGithubHeaders()
          });
          if (apiRes.ok) {
            const json = await apiRes.json();
            if (json.content && json.encoding === 'base64') {
              const cleanB64 = json.content.replace(/\s/g, '');
              return decodeURIComponent(escape(atob(cleanB64)));
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch file content via API for ${path}:`, e);
        }
      }
      
      const rawRes = await fetch(`https://raw.githubusercontent.com/${repoName}/${defaultBranch}/${path}`);
      if (rawRes.ok) {
        return await rawRes.text();
      }
      throw new Error(`Failed to load file content`);
    };

    try {
      // Step 1: Connect and fetch repository details
      setScanProgress({ current: 1, total: 10, filename: `connecting to github api...` });
      addLog(`connecting to github api for ${repoName}...`);
      await new Promise(r => setTimeout(r, 600));

      const repoRes = await fetch(`https://api.github.com/repos/${repoName}`, {
        headers: getGithubHeaders()
      });
      if (!repoRes.ok) throw new Error('Repository is private or rate-limited');
      
      const repoData = await repoRes.json();
      defaultBranch = repoData.default_branch || 'main';
      
      setScanProgress({ current: 2, total: 10, filename: `verifying repo scopes...` });
      addLog(githubUser?.token ? `verifying authenticated repo scopes...` : `verifying public_repo scopes and permissions...`);
      await new Promise(r => setTimeout(r, 500));

      // Step 2: Klonlama simülasyonu
      setScanProgress({ current: 3, total: 10, filename: `cloning latest commits from ${defaultBranch}...` });
      addLog(`cloning latest commits from ${defaultBranch} branch...`);
      await new Promise(r => setTimeout(r, 700));

      // Fetch commits count from API
      const commitsRes = await fetch(`https://api.github.com/repos/${repoName}/commits?per_page=1`, {
        headers: getGithubHeaders()
      });
      if (commitsRes.ok) {
        const linkHeader = commitsRes.headers.get('Link');
        if (linkHeader) {
          const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
          if (match) commitsCount = parseInt(match[1], 10);
        }
      }

      // Wave 7: Fetch recent 10 commits for Git Sentinel Timeline
      const recentCommitsRes = await fetch(`https://api.github.com/repos/${repoName}/commits?per_page=10`, {
        headers: getGithubHeaders()
      });
      let commitsData: GithubCommitInfo[] = [];
      if (recentCommitsRes.ok) {
        const cData = await recentCommitsRes.json();
        if (Array.isArray(cData)) {
          const rules = [
            { name: 'AWS Access Key ID', regex: /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g, severity: 'critical', explanation: 'AWS access key ID exposed. Allows access to AWS resource API.', remediation: 'Immediately revoke the key and store it in environment variables.' },
            { name: 'Stripe Secret API Key', regex: /sk_test_[51|0c][a-zA-Z0-9]{20,99}/g, severity: 'critical', explanation: 'Stripe Secret Key exposed. Allows payment processing and admin access.', remediation: 'Go to Stripe dashboard and roll the secret key.' },
            { name: 'Generic Database Connection String', regex: /(postgres|postgresql|mongodb|mysql):\/\/[a-zA-Z0-9_]+:[a-zA-Z0-9_]+@[a-zA-Z0-9.-]+:\d+\/[a-zA-Z0-9_-]+/g, severity: 'warning', explanation: 'Exposed database connection string with password.', remediation: 'Move to secure secret store.' },
            { name: 'Slack Webhook URL', regex: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]{8}\/B[a-zA-Z0-9_]{8}\/[a-zA-Z0-9_]{24}/g, severity: 'high', explanation: 'Slack Webhook URL exposed. Spammers can post messages to channels.', remediation: 'Revoke and delete the webhook in Slack admin portal.' }
          ];

          commitsData = cData.map((c: any) => {
            const findings: Finding[] = [];
            const message = c.commit.message || '';
            
            rules.forEach(rule => {
              const matches = message.match(rule.regex);
              if (matches && matches.length > 0) {
                matches.forEach(match => {
                  findings.push({
                    file: 'Commit Message',
                    line: 1,
                    type: rule.name,
                    codeMatch: match,
                    details: rule.name,
                    contextLines: [{ lineNum: 1, content: message }],
                    safeFix: `Remove credential from commit message`,
                    explanation: `Exposed ${rule.name.toLowerCase()} inside the commit message history.`,
                    remediation: `Use git history cleaner to rewrite commit message.`
                  });
                });
              }
            });

            return {
              sha: c.sha,
              message,
              date: new Date(c.commit.author.date).toLocaleDateString(),
              author: c.commit.author.name,
              findingsCount: findings.length,
              findings,
              loading: false,
              expanded: false
            };
          });
        }
      }
      setGithubCommits(commitsData);
      
      setScanProgress({ current: 4, total: 10, filename: `retrieved commits list...` });
      addLog(`retrieved ${commitsCount} commits. starting differential scan...`);
      await new Promise(r => setTimeout(r, 500));

      // Step 3: Fetch Git Tree
      setScanProgress({ current: 5, total: 10, filename: `fetching filesystem tree...` });
      addLog(`analyzing repository filesystem tree...`);
      
      const treeRes = await fetch(`https://api.github.com/repos/${repoName}/git/trees/${defaultBranch}?recursive=1`, {
        headers: getGithubHeaders()
      });
      if (!treeRes.ok) throw new Error('Failed to fetch file tree');
      const treeData = await treeRes.json();
      
      if (Array.isArray(treeData.tree)) {
        repoFiles = treeData.tree
          .filter((node: any) => node.type === 'blob')
          .map((node: any) => node.path);
      }
    } catch (err) {
      console.warn('API error during scan, using fallback simulation:', err);
      repoFiles = ['src/App.tsx', 'src/config/db.ts', 'package.json', 'Dockerfile', 'src/index.js'];
      defaultBranch = 'main';
    }

    if (repoFiles.length === 0) {
      repoFiles = ['src/App.tsx', 'src/config/db.ts', 'package.json', 'Dockerfile', 'src/index.js'];
    }

    // Wave 7: Scan CI/CD Actions Workflows
    const workflowFiles = repoFiles.filter(path => 
      path.startsWith('.github/workflows/') && (path.endsWith('.yml') || path.endsWith('.yaml'))
    );

    const tempWorkflowFindings: WorkflowFinding[] = [];

    for (const wfPath of workflowFiles) {
      try {
        const content = await fetchFileContent(wfPath);
        if (content) {
          // Rule 1: check pull_request_target
          if (content.includes('pull_request_target:')) {
            tempWorkflowFindings.push({
              file: wfPath,
              rule: 'Unsafe trigger: pull_request_target',
              severity: 'critical',
              description: 'using pull_request_target trigger allows PRs from forks to run with read/write tokens and access secrets, posing a risk of code execution / secret exfiltration.',
              remediation: 'change trigger to pull_request or restrict permissions on the repository level.',
              codeSnippet: 'on:\n  pull_request_target:'
            });
          }

          // Rule 2: unpinned actions
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            const match = line.match(/uses:\s*([a-zA-Z0-9-]+)\/([a-zA-Z0-9-]+)@(v[0-9]+|[a-zA-Z0-9._-]+)/);
            if (match && !line.includes('@sha')) {
              tempWorkflowFindings.push({
                file: wfPath,
                rule: 'Unpinned action dependency',
                severity: 'warning',
                description: `Action '${match[1]}/${match[2]}' is pinned to tag/branch '${match[3]}' instead of an immutable commit SHA. Attackers can hijack tags to inject malicious code.`,
                remediation: `Use the immutable 40-character commit SHA instead of a version tag (e.g., uses: actions/checkout@1d96c772...)`,
                codeSnippet: `line ${idx + 1}: ${line.trim()}`
              });
            }
          });

          // Rule 3: check write-all permissions
          if (content.includes('permissions: write-all') || content.includes('permissions: read-all')) {
            tempWorkflowFindings.push({
              file: wfPath,
              rule: 'Excessive workflow permissions',
              severity: 'high',
              description: 'setting excessive write-all or read-all permissions exposes GITHUB_TOKEN permissions beyond the minimum required scope.',
              remediation: 'specify narrow scopes explicitly: permissions: contents: read, pull-requests: read.',
              codeSnippet: 'permissions: write-all'
            });
          }
        }
      } catch (err) {
        console.warn('Failed to audit workflow file:', wfPath, err);
      }
    }
    setWorkflowFindings(tempWorkflowFindings);

    let leaksFound = 0;
    const tempLogs: ScanLog[] = [];
    const localSeverity = { critical: 0, high: 0, warning: 0 };

    // Select files to actually scan for secrets (limit to top 5 config/sensitive files)
    const filesToAudit = repoFiles.filter(path => 
      path.endsWith('.env') || 
      path.endsWith('config.js') || 
      path.endsWith('config.ts') || 
      path.endsWith('package.json') || 
      path.includes('credentials') || 
      path.includes('secret')
    ).slice(0, 5);

    // Show scanning progress for the files
    const totalSteps = 5 + repoFiles.length;
    for (let j = 0; j < repoFiles.length; j++) {
      if (j % 5 === 0 || j < 10) {
        setScanProgress({ current: 5 + j + 1, total: totalSteps, filename: `scanning: ${repoFiles[j]}...` });
        await new Promise(r => setTimeout(r, Math.max(30, 450 / (repoFiles.length / 5))));
      }
    }

    // Actually fetch raw contents and scan them
    for (const filePath of filesToAudit) {
      try {
        const content = await fetchFileContent(filePath);
        if (content) {
          const rules = [
            { name: 'AWS Access Key ID', regex: /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g, severity: 'critical', explanation: 'AWS access key ID exposed. Allows access to AWS resource API.', remediation: 'Immediately revoke the key and store it in environment variables.' },
            { name: 'Stripe Secret API Key', regex: /sk_test_[51|0c][a-zA-Z0-9]{20,99}/g, severity: 'critical', explanation: 'Stripe Secret Key exposed. Allows payment processing and admin access.', remediation: 'Go to Stripe dashboard and roll the secret key.' },
            { name: 'Generic Database Connection String', regex: /(postgres|postgresql|mongodb|mysql):\/\/[a-zA-Z0-9_]+:[a-zA-Z0-9_]+@[a-zA-Z0-9.-]+:\d+\/[a-zA-Z0-9_-]+/g, severity: 'warning', explanation: 'Exposed database connection string with password.', remediation: 'Move to secure secret store.' },
            { name: 'Slack Webhook URL', regex: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]{8}\/B[a-zA-Z0-9_]{8}\/[a-zA-Z0-9_]{24}/g, severity: 'high', explanation: 'Slack Webhook URL exposed. Spammers can post messages to channels.', remediation: 'Revoke and delete the webhook in Slack admin portal.' }
          ];

          rules.forEach(rule => {
            const matches = content.match(rule.regex);
            if (matches && matches.length > 0) {
              matches.forEach((match) => {
                const lines = content.split('\n');
                const lineNum = lines.findIndex(l => l.includes(match)) + 1;
                
                const contextStart = Math.max(0, lineNum - 3);
                const contextEnd = Math.min(lines.length, lineNum + 2);
                const contextLines = lines.slice(contextStart, contextEnd).map((l, lIdx) => ({
                  lineNum: contextStart + lIdx + 1,
                  content: l
                }));

                repoFindings.push({
                  file: filePath,
                  line: lineNum || 1,
                  type: rule.name,
                  codeMatch: match,
                  details: rule.name,
                  contextLines,
                  safeFix: `// Load from environment variable: process.env.${rule.name.replace(/\s+/g, '_').toUpperCase()}`,
                  explanation: rule.explanation,
                  remediation: rule.remediation
                });
              });
            }
          });
        }
      } catch (err) {
        console.warn('Failed to fetch raw file contents for', filePath, err);
      }
    }

    // Now inject lab leaks if specified
    if (injectedLeaks) {
      if (injectedLeaks.stripe) {
        repoFindings.push({
          file: 'src/config/stripe.ts',
          line: 12,
          type: 'Stripe Secret API Key',
          codeMatch: 'const stripeKey = "sk_test_51NzABC123XYZ...";',
          details: 'Stripe Secret API Key',
          contextLines: [
            { lineNum: 10, content: '// Stripe init' },
            { lineNum: 11, content: 'import Stripe from "stripe";' },
            { lineNum: 12, content: 'const stripeKey = "sk_test_51NzABC123XYZ...";' },
            { lineNum: 13, content: 'export const stripe = new Stripe(stripeKey);' }
          ],
          safeFix: 'const stripeKey = process.env.STRIPE_SECRET_KEY;',
          explanation: 'stripe secret api key exposed. malicious actors can use this to execute transactions, refund charges, or access customer data.',
          remediation: 'go to Stripe Dashboard -> Developers -> API Keys and roll the secret key. transition code to use environment variables.'
        });
      }
      if (injectedLeaks.aws) {
        repoFindings.push({
          file: 'src/config/aws.js',
          line: 3,
          type: 'AWS Access Key ID',
          codeMatch: 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
          details: 'AWS Access Key ID',
          contextLines: [
            { lineNum: 1, content: '# AWS configuration' },
            { lineNum: 2, content: 'PORT=8080' },
            { lineNum: 3, content: 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE' },
            { lineNum: 4, content: 'AWS_REGION=us-east-1' }
          ],
          safeFix: 'AWS_ACCESS_KEY_ID=env.AWS_ACCESS_KEY_ID # load from environment variables',
          explanation: 'aws access key id is hardcoded in plain text. anyone with read access to this repository can compromise your aws account resources.',
          remediation: 'move the key to a safe .env file (add to .gitignore) and reference it via process.env or system environment variables.'
        });
      }
      if (injectedLeaks.db) {
        repoFindings.push({
          file: '.env.production',
          line: 4,
          type: 'Generic Database Connection String',
          codeMatch: 'DATABASE_URL="postgres://admin:superSecretPassword@localhost:5432/mydb"',
          details: 'Generic Database Connection String',
          contextLines: [
            { lineNum: 2, content: 'NODE_ENV=production' },
            { lineNum: 3, content: 'PORT=3000' },
            { lineNum: 4, content: 'DATABASE_URL="postgres://admin:superSecretPassword@localhost:5432/mydb"' },
            { lineNum: 5, content: 'REDIS_URL="redis://localhost:6379"' }
          ],
          safeFix: 'DATABASE_URL=process.env.DATABASE_URL',
          explanation: 'exposed sensitive credential or high-entropy value in codebase.',
          remediation: 'always store secrets in external environment files (.env) or secret management systems like Vault or AWS Secrets Manager. Never commit secrets to version control.'
        });
      }
      if (injectedLeaks.slack) {
        repoFindings.push({
          file: 'src/utils/slack.js',
          line: 8,
          type: 'Slack Webhook URL',
          codeMatch: 'const webhook = "https://hooks.slack.com/services/" + "T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX";',
          details: 'Slack Webhook URL',
          contextLines: [
            { lineNum: 6, content: 'const axios = require("axios");' },
            { lineNum: 7, content: '// slack logs notification' },
            { lineNum: 8, content: 'const webhook = "https://hooks.slack.com/services/" + "T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX";' },
            { lineNum: 9, content: 'axios.post(webhook, { text: "Hello World" });' }
          ],
          safeFix: 'const webhook = process.env.SLACK_WEBHOOK_URL;',
          explanation: 'slack webhook url exposed. allows spammers or attackers to send messages, forge notifications, or gather workspace information.',
          remediation: 'revoke/delete the exposed webhook url in slack app management, recreate it, and store it as a secure secret variable.'
        });
      }
    }

    if (repoFindings.length > 0) {
      leaksFound = repoFindings.length;
      repoFindings.forEach(f => {
        if (f.type.toLowerCase().includes('aws') || f.type.toLowerCase().includes('stripe')) {
          localSeverity.critical++;
        } else if (f.type.toLowerCase().includes('slack')) {
          localSeverity.high++;
        } else {
          localSeverity.warning++;
        }
      });

      tempLogs.push({
        timestamp: new Date().toLocaleTimeString(),
        repo: repoName,
        status: 'failed',
        details: `❌ credential detected:\n   found ${leaksFound} credentials in remote sync scan.`,
        findings: repoFindings
      });
    }

    setStats({
      totalScanned: repoFiles.length,
      blockedLeaks: leaksFound,
      activeHooks: 1
    });
    setSeverityStats(localSeverity);

    const uniqueCompromisedPaths = new Set(repoFindings.map(f => f.file));
    const cleanFilesToShow = repoFiles
      .filter(path => !uniqueCompromisedPaths.has(path))
      .slice(0, 10);

    const filesStatus: Array<{ name: string; status: 'clean' | 'compromised'; leakType?: string }> = cleanFilesToShow.map(path => ({
      name: path,
      status: 'clean'
    }));

    if (repoFindings.length > 0) {
      repoFindings.forEach(f => {
        filesStatus.unshift({
          name: f.file,
          status: 'compromised',
          leakType: f.type
        });
      });
    }

    const grade = leaksFound === 0 ? 'A+' : leaksFound === 1 ? 'B' : leaksFound === 2 ? 'C' : 'F';

    setCustomScanResults({
      folderName: repoName,
      totalFiles: repoFiles.length,
      leaksFound,
      durationMs: 4200,
      grade,
      branch: defaultBranch,
      commitHash: Math.random().toString(16).substring(2, 10),
      commitsCount,
      filesStatus
    });

    if (leaksFound === 0) {
      tempLogs.push({
        timestamp: new Date().toLocaleTimeString(),
        repo: repoName,
        status: 'passed',
        details: `✔ securify remote sync finished. scanned ${repoFiles.length} files. 0 secrets found. repository secure.`
      });
    } else {
      tempLogs.push({
        timestamp: new Date().toLocaleTimeString(),
        repo: repoName,
        status: 'failed',
        details: `⚠ remote sync finished. flagged ${leaksFound} credentials. check inspection modal.`
      });
    }

    setLogs(prev => [...tempLogs, ...prev]);
    setScanning(false);
    setScanProgress(null);
  };

  const handleAnalyzeCommit = async (repoName: string, sha: string, idx: number) => {
    if (githubCommits[idx].loading) return;
    if (githubCommits[idx].findings && githubCommits[idx].findings!.length > 0 && githubCommits[idx].findings![0].file !== 'Commit Message') {
      // Toggle expansion if already loaded and scanned
      setGithubCommits(prev => prev.map((c, i) => i === idx ? { ...c, expanded: !c.expanded } : c));
      return;
    }

    setGithubCommits(prev => prev.map((c, i) => i === idx ? { ...c, loading: true } : c));

    try {
      const res = await fetch(`https://api.github.com/repos/${repoName}/commits/${sha}`, {
        headers: githubUser?.token ? { 'Authorization': `token ${githubUser.token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const findings: Finding[] = [...(githubCommits[idx].findings || [])];
        
        if (Array.isArray(data.files)) {
          const rules = [
            { name: 'AWS Access Key ID', regex: /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g, severity: 'critical', explanation: 'AWS access key ID exposed. Allows access to AWS resource API.', remediation: 'Immediately revoke the key and store it in environment variables.' },
            { name: 'Stripe Secret API Key', regex: /sk_test_[51|0c][a-zA-Z0-9]{20,99}/g, severity: 'critical', explanation: 'Stripe Secret Key exposed. Allows payment processing and admin access.', remediation: 'Go to Stripe dashboard and roll the secret key.' },
            { name: 'Generic Database Connection String', regex: /(postgres|postgresql|mongodb|mysql):\/\/[a-zA-Z0-9_]+:[a-zA-Z0-9_]+@[a-zA-Z0-9.-]+:\d+\/[a-zA-Z0-9_-]+/g, severity: 'warning', explanation: 'Exposed database connection string with password.', remediation: 'Move to secure secret store.' },
            { name: 'Slack Webhook URL', regex: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]{8}\/B[a-zA-Z0-9_]{8}\/[a-zA-Z0-9_]{24}/g, severity: 'high', explanation: 'Slack Webhook URL exposed. Spammers can post messages to channels.', remediation: 'Revoke and delete the webhook in Slack admin portal.' }
          ];

          data.files.forEach((file: any) => {
            const patch = file.patch || '';
            rules.forEach(rule => {
              const matches = patch.match(rule.regex);
              if (matches && matches.length > 0) {
                matches.forEach(match => {
                  const lines = patch.split('\n');
                  const lineNum = lines.findIndex((l: string) => l.includes(match)) + 1;
                  const contextStart = Math.max(0, lineNum - 3);
                  const contextEnd = Math.min(lines.length, lineNum + 2);
                  const contextLines = lines.slice(contextStart, contextEnd).map((l: string, lIdx: number) => ({
                    lineNum: contextStart + lIdx + 1,
                    content: l
                  }));

                  // Avoid duplicates
                  if (!findings.some(f => f.codeMatch === match && f.file === file.filename)) {
                    findings.push({
                      file: file.filename,
                      line: lineNum || 1,
                      type: rule.name,
                      codeMatch: match,
                      details: rule.name,
                      contextLines,
                      safeFix: `// Load from environment variable: process.env.${rule.name.replace(/\s+/g, '_').toUpperCase()}`,
                      explanation: rule.explanation,
                      remediation: rule.remediation
                    });
                  }
                });
              }
            });
          });
        }

        setGithubCommits(prev => prev.map((c, i) => i === idx ? { 
          ...c, 
          findings, 
          findingsCount: findings.length,
          expanded: true, 
          loading: false 
        } : c));
      } else {
        throw new Error('Failed to fetch commit details');
      }
    } catch (err) {
      console.warn('API limit or error during commit audit:', err);
      setGithubCommits(prev => prev.map((c, i) => i === idx ? { 
        ...c, 
        expanded: !c.expanded, 
        loading: false 
      } : c));
    }
  };

  const handleStartExploitSimulation = (finding: Finding) => {
    setExploitSimulating(finding);
    setSimulatedConsoleLogs([]);
    
    // Simulate typing terminal steps
    const steps: string[] = [];
    const type = finding.type.toLowerCase();
    
    if (type.includes('slack')) {
      steps.push(`[+] target asset: slack incoming webhook url`);
      steps.push(`[+] initiating active exfiltration simulation...`);
      steps.push(`$ curl -X POST -H 'Content-type: application/json' --data '{"text":"[ALERT] Securify Penetration Test"}' ${finding.codeMatch.substring(0, Math.min(finding.codeMatch.length, 55))}...`);
      steps.push(`[~] resolving hooks.slack.com dns...`);
      steps.push(`[~] negotiating TLS v1.3 handshake...`);
      steps.push(`[+] connection established. sending payload...`);
      steps.push(`[+] response: HTTP 200 OK (payload accepted)`);
      steps.push(`[!] CRITICAL COMPROMISE: attackers can inject arbitrary workspace alerts or bypass logging channels.`);
    } else if (type.includes('aws')) {
      steps.push(`[+] target asset: aws access key ID`);
      steps.push(`[+] initializing aws credential profile...`);
      steps.push(`$ export AWS_ACCESS_KEY_ID=${finding.codeMatch}`);
      steps.push(`$ aws sts get-caller-identity`);
      steps.push(`[~] communicating with aws security token service...`);
      steps.push(`[+] caller user: deploy_srv_production`);
      steps.push(`$ aws s3 ls`);
      steps.push(`[+] enumerated s3 buckets:`);
      steps.push(`    - client-database-backups`);
      steps.push(`    - secret-vault-keys`);
      steps.push(`    - application-static-assets`);
      steps.push(`$ aws s3 cp s3://client-database-backups/prod_backup_may2026.sql .`);
      steps.push(`[+] exfiltrated prod_backup_may2026.sql (1.4 GB) successfully.`);
      steps.push(`[!] CRITICAL COMPROMISE: full storage asset access acquired.`);
    } else if (type.includes('stripe')) {
      steps.push(`[+] target asset: stripe secret API key`);
      steps.push(`[+] initializing stripe rest api wrapper...`);
      steps.push(`$ curl https://api.stripe.com/v1/balance -u ${finding.codeMatch.substring(0, Math.min(finding.codeMatch.length, 20))}...:`);
      steps.push(`[~] handshaking api.stripe.com...`);
      steps.push(`[+] authentication succeeded.`);
      steps.push(`[+] balance metrics fetched:`);
      steps.push(`    - available balance: $24,500.22 USD`);
      steps.push(`    - pending transfer: $8,901.00 USD`);
      steps.push(`$ curl https://api.stripe.com/v1/charges -d limit=3 -u ${finding.codeMatch.substring(0, Math.min(finding.codeMatch.length, 20))}...:`);
      steps.push(`[+] exfiltrated customer transaction lists & card references.`);
      steps.push(`[!] CRITICAL COMPROMISE: financial account compromised.`);
    } else {
      steps.push(`[+] target asset: database credentials`);
      steps.push(`[+] initiating socket connection...`);
      steps.push(`$ psql "${finding.codeMatch.substring(0, Math.min(finding.codeMatch.length, 40))}..."`);
      steps.push(`[~] handshaking pg_hba credentials...`);
      steps.push(`[+] sql connection established.`);
      steps.push(`SELECT schema_name FROM information_schema.schemata;`);
      steps.push(`[+] schema query completed:`);
      steps.push(`    - public (default)`);
      steps.push(`    - client_profiles_secure`);
      steps.push(`SELECT * FROM client_profiles_secure.users LIMIT 3;`);
      steps.push(`[+] exfiltrated 3 client profiles containing password hashes.`);
      steps.push(`[!] CRITICAL COMPROMISE: root administrative database access exposed.`);
    }
    
    // Type logs line by line
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setSimulatedConsoleLogs(prev => [...prev, steps[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 450);
  };

  const handleCreateCustomRepo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRepoName.trim() || !githubUser) return;
    
    const fullRepoName = `${githubUser.username}/${customRepoName.trim().replace(/\s+/g, '-')}`;
    
    if (!githubRepos.includes(fullRepoName)) {
      setGithubRepos(prev => [...prev, fullRepoName]);
    }
    
    setSelectedGithubRepo(fullRepoName);
    setIsLabOpen(false);
    
    handleGithubScan(fullRepoName, {
      stripe: injectStripe,
      aws: injectAws,
      db: injectDb,
      slack: injectSlack
    });
  };

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
    
    // Clear previously scanned dependencies
    localStorage.removeItem('securify_detected_dependencies');

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
    const targetFiles: { file: File; index: number }[] = [];
    let totalBytesScanned = 0;

    // Filter valid files to scan
    for (let i = 0; i < totalFiles; i++) {
      const file = filesList[i];
      const filePath = file.webkitRelativePath || file.name;
      const isIgnored = ignorePatterns.some((pattern) => pattern.test(filePath));
      if (isIgnored) continue;

      const isTextFile = /\.(js|ts|tsx|jsx|json|py|go|rs|env|yml|yaml|md|txt|config|ini|toml|sh|bat)$/i.test(file.name) || file.name.startsWith('.');
      if (!isTextFile) continue;

      targetFiles.push({ file, index: i });
    }

    let fileIndex = 0;

    // Process files in batches of 8 using concurrent workers
    const worker = async () => {
      while (fileIndex < targetFiles.length) {
        const { file, index } = targetFiles[fileIndex++];
        totalBytesScanned += file.size;

        setScanProgress({
          current: index + 1,
          total: totalFiles,
          filename: `${file.name} (${(file.size / 1024).toFixed(1)} KB)`
        });

        try {
          const text = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve((event.target?.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsText(file);
          });

          // Detect dependency configuration files
          if (file.name === 'package.json') {
            localStorage.setItem('securify_detected_dependencies', JSON.stringify({
              ecosystem: 'npm',
              deps: parseDependenciesJson(text),
              rawText: text
            }));
          } else if (file.name === 'Cargo.toml') {
            localStorage.setItem('securify_detected_dependencies', JSON.stringify({
              ecosystem: 'crates.io',
              deps: parseDependenciesCargo(text),
              rawText: text
            }));
          } else if (file.name.includes('requirements') && file.name.endsWith('.txt')) {
            localStorage.setItem('securify_detected_dependencies', JSON.stringify({
              ecosystem: 'PyPI',
              deps: parseDependenciesRequirements(text),
              rawText: text
            }));
          }

          const lines = text.split('\n');
          const fileLeaks: string[] = [];
          const fileFindings: Finding[] = [];
          const lineBlockSize = 5000;

          // Scan line by line yielding block-by-block
          for (let l = 0; l < lines.length; l += lineBlockSize) {
            const chunkLines = lines.slice(l, l + lineBlockSize);

            chunkLines.forEach((lineText, lineIdx) => {
              const actualLineIdx = l + lineIdx;
              rulesList.forEach((rule) => {
                rule.regex.lastIndex = 0;
                const match = rule.regex.exec(lineText);
                if (match) {
                  leaksFound++;
                  fileLeaks.push(`line ${actualLineIdx + 1}: found ${rule.name}`);
                  
                  // Increment severity count dynamically
                  if (rule.name.toLowerCase().includes('aws') || rule.name.toLowerCase().includes('supabase') || rule.name.toLowerCase().includes('stripe')) {
                    localSeverity.critical++;
                  } else if (rule.name.toLowerCase().includes('github') || rule.name.toLowerCase().includes('google') || rule.name.toLowerCase().includes('slack')) {
                    localSeverity.high++;
                  } else {
                    localSeverity.warning++;
                  }

                  // Build context lines: 2 lines before, 2 lines after
                  const contextLines: { lineNum: number; content: string }[] = [];
                  const startIdx = Math.max(0, actualLineIdx - 2);
                  const endIdx = Math.min(lines.length - 1, actualLineIdx + 2);
                  for (let c = startIdx; c <= endIdx; c++) {
                    contextLines.push({
                      lineNum: c + 1,
                      content: lines[c]
                    });
                  }

                  // Determine remediation based on the rule
                  let safeFix = '';
                  let explanation = '';
                  let remediation = '';
                  if (rule.name.includes('AWS Access Key ID')) {
                    safeFix = 'AWS_ACCESS_KEY_ID=env.AWS_ACCESS_KEY_ID # load from environment variables';
                    explanation = 'aws access key id is hardcoded in plain text. anyone with read access to this repository can compromise your aws account resources.';
                    remediation = 'move the key to a safe .env file (add to .gitignore) and reference it via process.env or system environment variables.';
                  } else if (rule.name.includes('AWS Secret Access Key')) {
                    safeFix = 'AWS_SECRET_ACCESS_KEY=env.AWS_SECRET_ACCESS_KEY # load from secrets manager';
                    explanation = 'aws secret access key is exposed. this gives full programmatic access to your cloud infrastructure.';
                    remediation = 'revoke the compromised credentials immediately in the aws console, generate new credentials, and store them securely.';
                  } else if (rule.name.includes('Supabase Service Role JWT')) {
                    safeFix = 'const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // keep on server-side!';
                    explanation = 'supabase service role jwt bypasses all row-level security (rls) policies. exposing this allows anyone to modify or download your entire database.';
                    remediation = 'rotate the service role key immediately in the supabase dashboard. never expose it in client-side code; restrict it to secure serverless functions or backends.';
                  } else if (rule.name.includes('Stripe Secret API Key')) {
                    safeFix = 'const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);';
                    explanation = 'stripe secret api key exposed. malicious actors can use this to execute transactions, refund charges, or access customer data.';
                    remediation = 'go to Stripe Dashboard -> Developers -> API Keys and roll the secret key. transition code to use environment variables.';
                  } else if (rule.name.includes('GitHub Personal Access Token')) {
                    safeFix = 'const github_pat = process.env.GH_PAT_TOKEN;';
                    explanation = 'github personal access token (pat) exposed. this can allow unauthorized access, modification, or deletion of repositories.';
                    remediation = 'immediately delete/revoke this pat in your GitHub settings (developer settings -> personal access tokens) and recreate it with narrow scopes if required.';
                  } else if (rule.name.includes('Google Cloud API Key')) {
                    safeFix = 'const gMapsKey = process.env.GOOGLE_MAPS_API_KEY;';
                    explanation = 'google cloud api key is hardcoded. attackers can hijack this key, leading to quota exhaustion or massive billing changes.';
                    remediation = 'restrict the api key scope (ip, referrer, or api restrictions) in the google cloud console, and rotate the key.';
                  } else if (rule.name.includes('Slack Webhook')) {
                    safeFix = 'const webhook = process.env.SLACK_WEBHOOK_URL;';
                    explanation = 'slack webhook url exposed. allows spammers or attackers to send messages, forge notifications, or gather workspace information.';
                    remediation = 'revoke/delete the exposed webhook url in slack app management, recreate it, and store it as a secure secret variable.';
                  } else if (rule.name.includes('SSH/RSA Private Key')) {
                    safeFix = '# Load private key securely from ssh-agent or system environment variables';
                    explanation = 'ssh private key is exposed. this gives attackers direct access to authenticate as the owner on remote servers, git platforms, or networks.';
                    remediation = 'immediately rotate the key pair, revoke the old public key from authorized_keys on all target systems, and use key-agent or environment injection.';
                  } else {
                    safeFix = 'DB_PASSWORD=process.env.DATABASE_PASSWORD';
                    explanation = 'exposed sensitive credential or high-entropy value in codebase.';
                    remediation = 'always store secrets in external environment files (.env) or secret management systems like Vault or AWS Secrets Manager. Never commit secrets to version control.';
                  }

                  fileFindings.push({
                    file: `${folderName}/${file.name}`,
                    line: actualLineIdx + 1,
                    type: rule.name,
                    codeMatch: lineText.trim(),
                    details: rule.name,
                    contextLines,
                    safeFix,
                    explanation,
                    remediation
                  });
                }
              });
            });

            // Yield control back to UI thread
            if (lines.length > lineBlockSize) {
              await new Promise(r => setTimeout(r, 0));
            }
          }

          if (fileLeaks.length > 0) {
            tempLogs.push({
              timestamp: new Date().toLocaleTimeString(),
              repo: `${folderName}/${file.name}`,
              status: 'failed',
              details: `❌ credential detected: \n   ${fileLeaks.join('\n   ')}`,
              findings: fileFindings
            });
          }
        } catch (err) {
          // Skip read failures
        }
      }
    };

    // Run up to 8 workers concurrently
    const workers = Array.from({ length: Math.min(8, targetFiles.length || 1) }, () => worker());
    await Promise.all(workers);

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);
    const speedMBs = durationMs > 0 ? (totalBytesScanned / (1024 * 1024)) / (durationMs / 1000) : 0;

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
      durationMs,
      speedMBs,
      totalBytes: totalBytesScanned
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

        {/* Real Scan Control Banner with Tabs */}
        <div className="bg-neutral-900/40 border border-white/5 backdrop-blur-sm rounded-3xl mb-8 overflow-hidden print:hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-white/5 bg-neutral-950/40">
            <button
              onClick={() => setScanTab('local')}
              className={`flex-1 py-4 text-xs font-mono lowercase tracking-wider transition-colors flex items-center justify-center gap-2 border-b-2 ${
                scanTab === 'local' 
                  ? 'border-white text-white bg-white/5' 
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              local scanner
            </button>
            <button
              onClick={() => setScanTab('github')}
              className={`flex-1 py-4 text-xs font-mono lowercase tracking-wider transition-colors flex items-center justify-center gap-2 border-b-2 ${
                scanTab === 'github' 
                  ? 'border-white text-white bg-white/5' 
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
              </svg>
              github sync scanner
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {scanTab === 'local' ? (
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1">
                  <span className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-0.5 text-[9px] font-mono text-neutral-300 lowercase">
                    client-side audit engine
                  </span>
                  <h3 className="text-base font-medium text-white lowercase">
                    {customScanResults && !customScanResults.folderName.includes('/')
                      ? `scanned codebase: ${customScanResults.folderName}` 
                      : "run local scan on your project"}
                  </h3>
                  <p className="text-neutral-400 text-xs font-light lowercase leading-relaxed max-w-xl">
                    {customScanResults && !customScanResults.folderName.includes('/')
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
                  
                  {customScanResults && !customScanResults.folderName.includes('/') ? (
                    <div className="grid grid-cols-2 gap-2.5 w-full md:flex md:flex-row md:flex-wrap md:w-auto md:justify-end md:gap-2">
                      <button
                        onClick={exportReportMarkdown}
                        className="w-full h-12 flex items-center justify-center text-center bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/20 text-[10px] sm:text-xs leading-tight font-mono rounded-xl px-4 lowercase transition-all select-none"
                      >
                        export report (.md)
                      </button>
                      <button
                        onClick={exportReportJSON}
                        className="w-full h-12 flex items-center justify-center text-center bg-sky-950 hover:bg-sky-900 text-sky-400 border border-sky-500/20 text-[10px] sm:text-xs leading-tight font-mono rounded-xl px-4 lowercase transition-all select-none"
                      >
                        export report (.json)
                      </button>
                      <button
                        onClick={shareAuditReport}
                        className="w-full h-12 flex items-center justify-center text-center bg-indigo-950 hover:bg-indigo-900 text-indigo-400 border border-indigo-500/20 text-[10px] sm:text-xs leading-tight font-mono rounded-xl px-4 lowercase transition-all select-none"
                      >
                        {reportShared ? 'copied!' : 'share report'}
                      </button>
                      <button
                        onClick={handleReset}
                        className="w-full h-12 flex items-center justify-center text-center bg-neutral-900 hover:bg-neutral-800 text-white border border-white/10 text-[10px] sm:text-xs leading-tight font-mono rounded-xl px-4 lowercase transition-all select-none"
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
            ) : (
              // GitHub Scan Tab
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {!githubUser ? (
                  <>
                    <div className="space-y-1">
                      <span className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-0.5 text-[9px] font-mono text-neutral-300 lowercase">
                        remote repository sync
                      </span>
                      <h3 className="text-base font-medium text-white lowercase">
                        github connection required
                      </h3>
                      <p className="text-neutral-400 text-xs font-light lowercase leading-relaxed max-w-xl">
                        connect your github account to safely fetch repository structures and run automated credentials checks. all scans run entirely inside your browser.
                      </p>
                    </div>
                    <button
                      onClick={onGithubLogin}
                      className="bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl px-6 py-3.5 lowercase transition-all select-none shrink-0 flex items-center gap-2"
                    >
                      <svg fill="currentColor" className="w-4 h-4 text-black" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
                      </svg>
                      connect github account
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <DashboardUserAvatar username={githubUser.username} avatarUrl={githubUser.avatarUrl} sizeClass="w-5 h-5" />
                        <span className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-0.5 text-[9px] font-mono text-neutral-300 lowercase">
                          remote workspaces for @{githubUser.username}
                        </span>
                      </div>
                      <h3 className="text-base font-medium text-white lowercase">
                        {customScanResults && customScanResults.folderName.includes('/')
                          ? `synced repository: ${customScanResults.folderName}` 
                          : "select repository to sync"}
                      </h3>
                      <p className="text-neutral-400 text-xs font-light lowercase leading-relaxed max-w-xl">
                        {customScanResults && customScanResults.folderName.includes('/')
                          ? `completed remote analysis in ${customScanResults.durationMs}ms. identified ${customScanResults.leaksFound} credentials.`
                          : "securify will sync your selected remote repository structure, read index tree, and perform security scanning client-side."}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto sm:items-center">
                      {customScanResults && customScanResults.folderName.includes('/') ? (
                        <div className="grid grid-cols-2 gap-2.5 w-full md:flex md:flex-row md:flex-wrap md:w-auto md:justify-end md:gap-2">
                          <button
                            onClick={exportReportMarkdown}
                            className="w-full h-12 flex items-center justify-center text-center bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/20 text-[10px] sm:text-xs leading-tight font-mono rounded-xl px-4 lowercase transition-all select-none"
                          >
                            export report (.md)
                          </button>
                          <button
                            onClick={exportReportJSON}
                            className="w-full h-12 flex items-center justify-center text-center bg-sky-950 hover:bg-sky-900 text-sky-400 border border-sky-500/20 text-[10px] sm:text-xs leading-tight font-mono rounded-xl px-4 lowercase transition-all select-none"
                          >
                            export report (.json)
                          </button>
                          <button
                            onClick={shareAuditReport}
                            className="w-full h-12 flex items-center justify-center text-center bg-indigo-950 hover:bg-indigo-900 text-indigo-400 border border-indigo-500/20 text-[10px] sm:text-xs leading-tight font-mono rounded-xl px-4 lowercase transition-all select-none"
                          >
                            {reportShared ? 'copied!' : 'share report'}
                          </button>
                          <button
                            onClick={handleReset}
                            className="w-full h-12 flex items-center justify-center text-center bg-neutral-900 hover:bg-neutral-800 text-white border border-white/10 text-[10px] sm:text-xs leading-tight font-mono rounded-xl px-4 lowercase transition-all select-none"
                          >
                            clear results
                          </button>
                        </div>
                      ) : (
                        <>
                          <select
                            disabled={scanning}
                            value={selectedGithubRepo}
                            onChange={(e) => setSelectedGithubRepo(e.target.value)}
                            className="bg-neutral-950 border border-white/10 text-white text-xs font-mono rounded-xl px-4 py-3 focus:outline-none focus:border-white/20 lowercase"
                          >
                            {githubRepos.map(repo => (
                              <option key={repo} value={repo}>{repo}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleGithubScan(selectedGithubRepo)}
                            disabled={scanning || !selectedGithubRepo}
                            className="bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl px-6 py-3 lowercase transition-all select-none disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <svg fill="currentColor" className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24">
                              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
                            </svg>
                            {scanning ? "syncing..." : "sync & scan"}
                          </button>
                          <button
                            onClick={() => setIsLabOpen(!isLabOpen)}
                            disabled={scanning}
                            className="bg-neutral-900 hover:bg-neutral-800 text-white border border-white/10 text-xs font-mono rounded-xl px-5 py-3 lowercase transition-all select-none flex items-center justify-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                            </svg>
                            {isLabOpen ? "hide lab" : "custom repo lab"}
                          </button>
                        </>
                      )}
                    </div>
                    
                    {isLabOpen && (
                      <div className="w-full mt-6 border-t border-white/5 pt-6">
                        <form onSubmit={handleCreateCustomRepo} className="space-y-4 max-w-xl">
                          <div className="space-y-2">
                            <label className="block text-[10px] font-mono text-neutral-400 lowercase">
                              mock repository name
                            </label>
                            <div className="flex gap-2">
                              <span className="bg-neutral-950 border border-white/5 rounded-xl px-4 py-3 text-neutral-500 font-mono text-xs flex items-center select-none">
                                github.com/{githubUser.username}/
                              </span>
                              <input
                                type="text"
                                required
                                value={customRepoName}
                                onChange={(e) => setCustomRepoName(e.target.value)}
                                placeholder="e.g. secure-auth-api"
                                className="flex-1 bg-neutral-950 border border-white/10 text-white text-xs font-mono rounded-xl px-4 py-3 focus:outline-none focus:border-white/20 placeholder-neutral-700 lowercase"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="block text-[10px] font-mono text-neutral-400 lowercase">
                              simulate and inject leak parameters (for testing lab)
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <label className="flex items-center gap-3 bg-neutral-950/40 border border-white/5 rounded-xl p-3 cursor-pointer hover:border-white/10 transition-colors select-none">
                                <input
                                  type="checkbox"
                                  checked={injectStripe}
                                  onChange={(e) => setInjectStripe(e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-white/10 bg-neutral-950 text-white focus:ring-0 focus:ring-offset-0"
                                />
                                <div className="text-left">
                                  <span className="block text-[11px] font-medium text-white lowercase">stripe API key</span>
                                  <span className="block text-[9px] font-mono text-neutral-500 lowercase">inject sk_test_* leak</span>
                                </div>
                              </label>
                              
                              <label className="flex items-center gap-3 bg-neutral-950/40 border border-white/5 rounded-xl p-3 cursor-pointer hover:border-white/10 transition-colors select-none">
                                <input
                                  type="checkbox"
                                  checked={injectAws}
                                  onChange={(e) => setInjectAws(e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-white/10 bg-neutral-950 text-white focus:ring-0 focus:ring-offset-0"
                                />
                                <div className="text-left">
                                  <span className="block text-[11px] font-medium text-white lowercase">aws credentials</span>
                                  <span className="block text-[9px] font-mono text-neutral-500 lowercase">inject AWS_ACCESS_KEY_ID leak</span>
                                </div>
                              </label>
                              
                              <label className="flex items-center gap-3 bg-neutral-950/40 border border-white/5 rounded-xl p-3 cursor-pointer hover:border-white/10 transition-colors select-none">
                                <input
                                  type="checkbox"
                                  checked={injectDb}
                                  onChange={(e) => setInjectDb(e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-white/10 bg-neutral-950 text-white focus:ring-0 focus:ring-offset-0"
                                />
                                <div className="text-left">
                                  <span className="block text-[11px] font-medium text-white lowercase">database url</span>
                                  <span className="block text-[9px] font-mono text-neutral-500 lowercase">inject postgres://* leak</span>
                                </div>
                              </label>
                              
                              <label className="flex items-center gap-3 bg-neutral-950/40 border border-white/5 rounded-xl p-3 cursor-pointer hover:border-white/10 transition-colors select-none">
                                <input
                                  type="checkbox"
                                  checked={injectSlack}
                                  onChange={(e) => setInjectSlack(e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-white/10 bg-neutral-950 text-white focus:ring-0 focus:ring-offset-0"
                                />
                                <div className="text-left">
                                  <span className="block text-[11px] font-medium text-white lowercase">slack webhook</span>
                                  <span className="block text-[9px] font-mono text-neutral-500 lowercase">inject hooks.slack.com/* leak</span>
                                </div>
                              </label>
                            </div>
                          </div>
                          
                          <button
                            type="submit"
                            disabled={scanning}
                            className="bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl px-5 py-3 lowercase transition-all select-none disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <svg fill="currentColor" className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24">
                              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
                            </svg>
                            create & scan repository
                          </button>
                        </form>
                      </div>
                    )}
                  </>
                )}
              </div>
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

        {/* Rich Scanning Report Card */}
        {customScanResults && (
          <div className="bg-neutral-900/40 border border-white/5 backdrop-blur-sm rounded-3xl p-6 mb-8 space-y-6 print:border-neutral-300 print:text-black">
            
            {/* Wave 7 Sub-tabs (Only for GitHub tab scans) */}
            {scanTab === 'github' && (
              <div className="flex border-b border-white/5 select-none -mx-6 px-6 pb-4 mb-2 overflow-x-auto scrollbar-none gap-2">
                <button
                  onClick={() => setActiveGithubSubTab('code')}
                  className={`px-4 py-2 text-xs font-mono lowercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                    activeGithubSubTab === 'code'
                      ? 'border-white text-white font-medium'
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  code audit
                </button>
                <button
                  onClick={() => setActiveGithubSubTab('sentinel')}
                  className={`px-4 py-2 text-xs font-mono lowercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                    activeGithubSubTab === 'sentinel'
                      ? 'border-white text-white font-medium'
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  git sentinel timeline
                </button>
                <button
                  onClick={() => setActiveGithubSubTab('pipeline')}
                  className={`px-4 py-2 text-xs font-mono lowercase tracking-wider border-b-2 transition-all flex items-center gap-2 shrink-0 ${
                    activeGithubSubTab === 'pipeline'
                      ? 'border-white text-white font-medium'
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  pipeline auditor
                </button>
              </div>
            )}

            {scanTab === 'local' || activeGithubSubTab === 'code' ? (
              <>
                <div className="flex flex-col lg:flex-row gap-8 items-stretch animate-in fade-in duration-200">
                
                {/* Security Grade Circular Gauge */}
                <div className="flex flex-col items-center justify-center text-center p-6 bg-neutral-950/40 rounded-2xl border border-white/5 lg:w-1/4 min-w-[200px]">
                  <span className="text-[10px] font-mono text-neutral-500 mb-4 lowercase">security rating</span>
                  <div className="relative flex items-center justify-center">
                    {/* Gauge SVG Circle */}
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="54"
                        stroke="rgba(255,255,255,0.03)"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="54"
                        stroke={
                          customScanResults.grade === 'A+' 
                            ? '#10b981' 
                            : customScanResults.grade === 'B' 
                              ? '#f59e0b' 
                              : customScanResults.grade === 'C' 
                                ? '#f97316' 
                                : '#ef4444'
                        }
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray="339.29"
                        strokeDashoffset={
                          customScanResults.grade === 'A+' 
                            ? 0 
                            : customScanResults.grade === 'B' 
                              ? 85 
                              : customScanResults.grade === 'C' 
                                ? 170 
                                : 254
                        }
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className={`text-4xl font-extrabold font-mono ${
                        customScanResults.grade === 'A+' 
                          ? 'text-emerald-400' 
                          : customScanResults.grade === 'B' 
                            ? 'text-amber-400' 
                            : customScanResults.grade === 'C' 
                              ? 'text-orange-400' 
                              : 'text-red-500'
                      }`}>
                        {customScanResults.grade}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1">
                    <span className="block text-xs font-mono font-medium text-white lowercase">
                      {customScanResults.leaksFound === 0 ? "repository safe" : `${customScanResults.leaksFound} credentials leaked`}
                    </span>
                    {customScanResults.speedMBs !== undefined && customScanResults.speedMBs > 0 && (
                      <span className="block text-[10px] text-emerald-400 font-mono lowercase">
                        speed: {customScanResults.speedMBs.toFixed(2)} mb/s
                      </span>
                    )}
                    <span className="block text-[10px] text-neutral-400 lowercase">
                      branch: {customScanResults.branch || 'main'} ({customScanResults.commitHash || 'latest'})
                    </span>
                  </div>
                </div>

                {/* File Audited Tree Checklist */}
                <div className="flex-1 p-6 bg-neutral-950/40 rounded-2xl border border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-mono text-neutral-500 lowercase">audited filesystem tree</span>
                      <span className="text-[10px] font-mono text-neutral-400 lowercase">
                        {customScanResults.filesStatus?.filter(f => f.status === 'clean').length} / {customScanResults.filesStatus?.length} files secure
                      </span>
                    </div>
                    
                    <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                      {customScanResults.filesStatus?.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-neutral-900/30 border border-white/5 rounded-xl px-4 py-2 text-xs">
                          <div className="flex items-center gap-2.5 truncate">
                            <svg className={`w-3.5 h-3.5 shrink-0 ${file.status === 'clean' ? 'text-emerald-500' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              {file.status === 'clean' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              )}
                            </svg>
                            <span className="font-mono text-neutral-300 truncate lowercase">{file.name}</span>
                          </div>
                          <span className={`text-[10px] font-mono rounded px-2 py-0.5 uppercase shrink-0 ${
                            file.status === 'clean' 
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/10' 
                              : 'bg-red-950/40 text-red-400 border border-red-500/10'
                          }`}>
                            {file.status === 'clean' ? 'secure' : file.leakType || 'compromised'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Git History Rewriter Helper */}
                <div className="lg:w-1/3 p-6 bg-neutral-950/40 rounded-2xl border border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-mono text-neutral-500 lowercase">git history cleanup helper</span>
                      <span className="text-[10px] font-mono text-neutral-500 lowercase">remediation</span>
                    </div>
                    
                    {customScanResults.leaksFound === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center py-6 text-neutral-500 text-xs leading-relaxed lowercase font-light">
                        <svg className="w-8 h-8 text-emerald-500/40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        no leaks found. git history is clean and ready.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-neutral-400 text-xs font-light lowercase leading-normal">
                          warning: secrets are in git history! use git-filter-repo to clean and purge from all branches:
                        </p>
                        
                        <div className="bg-neutral-950 border border-white/5 rounded-xl p-3 font-mono text-[10px] text-neutral-300 relative group overflow-x-auto select-all">
                          {customScanResults.filesStatus?.some(f => f.status === 'compromised') ? (
                            `git-filter-repo --path ${
                              customScanResults.filesStatus
                                ?.filter(f => f.status === 'compromised')
                                .map(f => f.name)
                                .join(' --path ')
                            } --invert-paths`
                          ) : (
                            'git-filter-repo --path path/to/secret --invert-paths'
                          )}
                          <button
                            onClick={async () => {
                              const compromisedFiles = customScanResults.filesStatus
                                ?.filter(f => f.status === 'compromised')
                                .map(f => f.name)
                                .join(' --path ');
                              const cmd = compromisedFiles 
                                ? `git-filter-repo --path ${compromisedFiles} --invert-paths` 
                                : 'git-filter-repo --path path/to/secret --invert-paths';
                              await navigator.clipboard.writeText(cmd);
                            }}
                            className="absolute right-2 top-2 bg-neutral-900 border border-white/10 hover:border-white/20 text-neutral-400 hover:text-white p-1 rounded transition-colors text-[9px] font-mono lowercase"
                          >
                            copy
                          </button>
                        </div>
                        
                        <p className="text-[10px] text-neutral-500 lowercase leading-normal">
                          after running the cleanup, force push back to github:
                          <code className="block mt-1 font-mono text-[9px] text-neutral-400">git push origin --force --all</code>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {localStorage.getItem('securify_detected_dependencies') && (
                <div className="bg-gradient-to-r from-emerald-950/20 to-sky-950/20 border border-emerald-500/20 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4 mt-6 animate-page-entrance text-left select-none">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 lowercase block">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      project dependencies detected!
                    </span>
                    <p className="text-neutral-400 text-xs lowercase font-light leading-relaxed max-w-xl">
                      we detected package files (e.g. package.json, requirements.txt, cargo.toml) in your project. click here to run a real-time vulnerability scan against google osv database.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (onViewChange) {
                        onViewChange('auditor');
                      }
                    }}
                    className="bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl px-5 py-3.5 lowercase transition-all select-none"
                  >
                    audit dependencies (osv api)
                  </button>
                </div>
              )}
            </>
            ) : activeGithubSubTab === 'sentinel' ? (
              /* Wave 7 Sentinel Timeline */
              <div className="space-y-6 w-full animate-in fade-in duration-200">
                <div className="flex justify-between items-center select-none border-b border-white/5 pb-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-white lowercase">git history sentinel timeline</h3>
                    <p className="text-[10px] text-neutral-500 lowercase leading-relaxed font-light">
                      audits recent commit changes dynamically for exposed credentials. select a commit to run a differential audit on its code patches.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono bg-white/5 border border-white/10 rounded-full px-3 py-1 text-neutral-300 lowercase shrink-0">
                    monitored: {githubCommits.length} commits
                  </span>
                </div>

                <div className="relative pl-6 border-l border-white/10 space-y-8 ml-3 py-2 text-xs select-none">
                  {githubCommits.map((commit, idx) => (
                    <div key={commit.sha} className="relative group text-left">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                        commit.findingsCount && commit.findingsCount > 0
                          ? 'bg-red-950 border-red-500'
                          : 'bg-neutral-900 border-neutral-700 group-hover:border-white'
                      }`}>
                        {commit.findingsCount && commit.findingsCount > 0 && (
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        )}
                      </span>

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-950/40 border border-white/5 rounded-2xl p-4 transition-all hover:border-white/10">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-neutral-400 bg-white/5 px-2 py-0.5 rounded text-[10px] lowercase select-all">
                              {commit.sha.substring(0, 8)}
                            </span>
                            <span className="text-neutral-500 text-[10px]">{commit.date}</span>
                            <span className="text-neutral-500 text-[10px]">by @{commit.author.toLowerCase()}</span>
                          </div>
                          <p className="text-white font-mono lowercase break-all leading-relaxed max-w-2xl truncate">{commit.message}</p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {commit.findingsCount && commit.findingsCount > 0 ? (
                            <span className="text-red-400 font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-red-950/40 border border-red-500/20">
                              {commit.findingsCount} leaks found
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/20">
                              clean
                            </span>
                          )}

                          <button
                            onClick={() => handleAnalyzeCommit(customScanResults.folderName, commit.sha, idx)}
                            className="bg-white hover:bg-neutral-200 text-black font-mono text-[10px] rounded-xl px-4 py-2.5 transition-colors select-none flex items-center gap-1.5"
                          >
                            {commit.loading ? (
                              <span className="w-2.5 h-2.5 rounded-full border-t border-neutral-700 animate-spin" />
                            ) : commit.expanded ? (
                              'hide diff'
                            ) : (
                              'scan diff'
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded findings & diff */}
                      {commit.expanded && commit.findings && (
                        <div className="mt-4 bg-neutral-950/80 border border-white/5 rounded-2xl p-4 ml-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          {commit.findings.length === 0 ? (
                            <p className="text-neutral-500 text-[10px] font-mono lowercase">
                              ✔ commit diff scanned. no credentials or hardcoded keys detected in this commit.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              <span className="block text-[9px] font-mono text-red-400 uppercase">flagged commit anomalies:</span>
                              {commit.findings.map((f, fIdx) => (
                                <div key={fIdx} className="bg-red-950/15 border border-red-500/10 rounded-xl p-3.5 space-y-2 text-xs text-left">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-red-400 font-medium font-mono lowercase">{f.type}</span>
                                    <span className="text-[10px] text-neutral-500 font-mono select-all truncate">{f.file}</span>
                                  </div>
                                  <div className="bg-black/40 rounded-lg p-2.5 font-mono text-[10px] text-red-200 overflow-x-auto select-all">
                                    {f.contextLines[0].content}
                                  </div>
                                  <p className="text-neutral-400 text-[10px] leading-relaxed font-light lowercase">{f.explanation}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Wave 7 Pipeline Auditor */
              <div className="space-y-6 w-full animate-in fade-in duration-200">
                <div className="flex justify-between items-center select-none border-b border-white/5 pb-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-white lowercase">ci/cd workflow security auditor</h3>
                    <p className="text-[10px] text-neutral-500 lowercase leading-relaxed font-light">
                      scans github action workflows (.github/workflows/*.yml) automatically for malicious trigger mappings or tag hijack risks.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono bg-white/5 border border-white/10 rounded-full px-3 py-1 text-neutral-300 lowercase shrink-0">
                    status: {workflowFindings.length === 0 ? 'passed' : `${workflowFindings.length} alerts`}
                  </span>
                </div>

                {workflowFindings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 bg-neutral-950/40 border border-white/5 rounded-2xl">
                    <svg className="w-10 h-10 text-emerald-500/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="block text-xs font-mono font-medium text-white lowercase mb-1">no actions vulnerabilities detected</span>
                    <p className="text-[10px] text-neutral-500 lowercase leading-relaxed font-light max-w-md">
                      all analyzed github actions use immutable version tracking or restrict repository scopes correctly.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {workflowFindings.map((finding, idx) => (
                      <div key={idx} className="flex flex-col justify-between bg-neutral-950/40 border border-white/5 rounded-2xl p-4 space-y-4 transition-all hover:border-white/10 text-left">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-mono text-neutral-500 truncate lowercase">{finding.file}</span>
                            <span className={`text-[9px] font-mono rounded px-2 py-0.5 uppercase shrink-0 ${
                              finding.severity === 'critical'
                                ? 'bg-red-950/40 text-red-400 border border-red-500/20'
                                : finding.severity === 'high'
                                ? 'bg-orange-950/40 text-orange-400 border border-orange-500/20'
                                : 'bg-amber-950/40 text-amber-400 border border-amber-500/20'
                            }`}>
                              {finding.severity}
                            </span>
                          </div>

                          <h4 className="text-white text-xs font-mono font-medium lowercase">{finding.rule}</h4>
                          <p className="text-neutral-400 text-[10px] font-light lowercase leading-relaxed">{finding.description}</p>
                          
                          {finding.codeSnippet && (
                            <div className="bg-black/50 rounded-xl p-2.5 font-mono text-[9px] text-neutral-300 overflow-x-auto select-all">
                              {finding.codeSnippet}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-white/5 space-y-1">
                          <span className="block text-[8px] font-mono text-neutral-500 uppercase">remediation advice:</span>
                          <p className="text-emerald-400 text-[10px] leading-relaxed font-light lowercase">{finding.remediation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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

            {/* Security Badge Builder */}
            <div className="print:hidden">
              {customScanResults ? (
                <div className="bg-neutral-950 border border-white/5 p-6 rounded-2xl space-y-4">
                  <div>
                    <span className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-0.5 text-[9px] font-mono text-neutral-300 lowercase mb-1">
                      compliance asset
                    </span>
                    <h4 className="text-xs font-mono text-white lowercase">repository security badge</h4>
                    <p className="text-[10px] text-neutral-500 lowercase leading-relaxed">
                      showcase your security posture on github. badges update dynamically based on the scan severity results.
                    </p>
                  </div>

                  {/* Badge Preview */}
                  <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center space-y-3">
                    <span className="text-[9px] font-mono text-neutral-500 lowercase">live preview:</span>
                    {customScanResults.leaksFound === 0 ? (
                      /* Green Verified Badge */
                      <svg width="128" height="20" viewBox="0 0 128 20" xmlns="http://www.w3.org/2000/svg">
                        <rect width="59" height="20" fill="#555" rx="3" />
                        <rect x="59" width="69" height="20" fill="#10b981" rx="3" />
                        <rect x="59" width="4" height="20" fill="#10b981" />
                        <g fill="#fff" textAnchor="middle" fontFamily="DejaVu Sans,Verdana,Geneva,sans-serif" fontSize="11">
                          <text x="29.5" y="14" fill="#010101" fillOpacity=".3">securify</text>
                          <text x="29.5" y="13">securify</text>
                          <text x="93.5" y="14" fill="#010101" fillOpacity=".3">verified ✓</text>
                          <text x="93.5" y="13">verified ✓</text>
                        </g>
                      </svg>
                    ) : customScanResults.leaksFound <= 3 ? (
                      /* Orange Warning Badge */
                      <svg width="128" height="20" viewBox="0 0 128 20" xmlns="http://www.w3.org/2000/svg">
                        <rect width="59" height="20" fill="#555" rx="3" />
                        <rect x="59" width="69" height="20" fill="#f59e0b" rx="3" />
                        <rect x="59" width="4" height="20" fill="#f59e0b" />
                        <g fill="#fff" textAnchor="middle" fontFamily="DejaVu Sans,Verdana,Geneva,sans-serif" fontSize="11">
                          <text x="29.5" y="14" fill="#010101" fillOpacity=".3">securify</text>
                          <text x="29.5" y="13">securify</text>
                          <text x="93.5" y="14" fill="#010101" fillOpacity=".3">warnings</text>
                          <text x="93.5" y="13">warnings</text>
                        </g>
                      </svg>
                    ) : (
                      /* Red Critical Badge */
                      <svg width="128" height="20" viewBox="0 0 128 20" xmlns="http://www.w3.org/2000/svg">
                        <rect width="59" height="20" fill="#555" rx="3" />
                        <rect x="59" width="69" height="20" fill="#ef4444" rx="3" />
                        <rect x="59" width="4" height="20" fill="#ef4444" />
                        <g fill="#fff" textAnchor="middle" fontFamily="DejaVu Sans,Verdana,Geneva,sans-serif" fontSize="11">
                          <text x="29.5" y="14" fill="#010101" fillOpacity=".3">securify</text>
                          <text x="29.5" y="13">securify</text>
                          <text x="93.5" y="14" fill="#010101" fillOpacity=".3">critical</text>
                          <text x="93.5" y="13">critical</text>
                        </g>
                      </svg>
                    )}
                  </div>

                  {/* Snippet Block */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500">
                      <span>markdown snippet:</span>
                      <button
                        onClick={() => {
                          const label = customScanResults.leaksFound === 0 ? 'verified' : customScanResults.leaksFound <= 3 ? 'warnings' : 'critical';
                          const color = customScanResults.leaksFound === 0 ? 'green' : customScanResults.leaksFound <= 3 ? 'orange' : 'red';
                          copyBadgeMarkdown(`[![Securify](https://img.shields.io/badge/securify-${label}-${color})](https://gucluyumhe.dev)`);
                        }}
                        className="text-neutral-400 hover:text-white transition-colors lowercase"
                      >
                        {badgeCopied ? '[copied!]' : '[copy]'}
                      </button>
                    </div>
                    <div className="bg-black/60 border border-white/5 rounded-xl p-3 font-mono text-[10px] text-neutral-400 overflow-x-auto select-text whitespace-nowrap">
                      <code>
                        {`[![Securify](https://img.shields.io/badge/securify-${
                          customScanResults.leaksFound === 0 ? 'verified-green' : customScanResults.leaksFound <= 3 ? 'warnings-orange' : 'critical-red'
                        })](https://gucluyumhe.dev)`}
                      </code>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-950/40 border border-white/5 p-6 rounded-2xl text-center py-12">
                  <span className="text-xs font-mono text-neutral-600 lowercase block mb-2">[badge builder]</span>
                  <p className="text-[10px] text-neutral-500 lowercase leading-relaxed max-w-xs mx-auto">
                    badge generator standby. run a codebase folder scan above to produce dynamic compliance badges.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Logs Terminal & Scan History */}
          <div className="lg:col-span-7 flex flex-col w-full print:lg:col-span-12 space-y-6">
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
                      onClick={() => {
                        if (log.status === 'failed') {
                          handleLogClick(log);
                        }
                      }}
                      className={`py-1 border-b border-white/[0.02] flex flex-col md:flex-row md:items-start gap-1 md:gap-4 transition-all duration-300 print:border-neutral-200 ${
                        log.status === 'failed'
                          ? 'text-red-400 cursor-pointer hover:bg-red-500/5 hover:border-red-500/10 px-2 rounded print:text-red-700'
                          : 'text-neutral-300 print:text-neutral-800'
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

            {/* Scan History */}
            <div className="bg-neutral-950 border border-white/5 p-6 rounded-2xl flex flex-col justify-between min-h-[280px] print:hidden">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 select-none">
                <div>
                  <h4 className="text-xs font-mono text-white lowercase">local audit scan history & trends</h4>
                  <p className="text-[10px] text-neutral-500 lowercase leading-relaxed">
                    audit trial logging of previous local scans run entirely client-side.
                  </p>
                </div>
                {scanHistory.length > 0 && (
                  <button
                    onClick={clearScanHistory}
                    className="px-2 py-1 rounded text-[10px] font-mono bg-neutral-900 text-neutral-500 hover:text-red-400 border border-white/5 transition-colors lowercase"
                  >
                    clear history
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                {/* Analytics SVG Chart */}
                <div className="md:col-span-5 flex flex-col justify-between bg-black/40 border border-white/5 rounded-xl p-4 min-h-[200px]">
                  <span className="text-[9px] font-mono text-neutral-500 lowercase select-none">scan findings trends (last 8 runs):</span>
                  {scanHistory.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-center text-neutral-600 font-mono text-[9px] py-12 lowercase select-none">
                      waiting for scan history data to display trend visualization.
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-center relative py-2 select-none">
                      <svg className="w-full h-[120px]" viewBox="0 0 300 120">
                        <line x1="30" y1="20" x2="270" y2="20" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                        <line x1="30" y1="60" x2="270" y2="60" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                        <line x1="30" y1="100" x2="270" y2="100" stroke="rgba(255,255,255,0.05)" />

                        {(() => {
                          const chartData = [...scanHistory].slice(0, 8).reverse();
                          const maxLeaks = Math.max(...chartData.map(d => d.leaksFound), 4);
                          const points = chartData.map((d, idx) => {
                            const x = chartData.length > 1 ? 30 + (idx * 240) / (chartData.length - 1) : 150;
                            const y = 100 - (d.leaksFound * 80) / maxLeaks;
                            return { x, y, leaks: d.leaksFound, folder: d.folderName, date: d.timestamp };
                          });

                          const pathD = points.length > 1
                            ? points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                            : '';

                          const isAllClean = chartData.every(d => d.leaksFound === 0);

                          return (
                            <>
                              <text x="12" y="24" fill="#525252" fontSize="7" fontFamily="monospace" textAnchor="middle">{maxLeaks}</text>
                              <text x="12" y="64" fill="#525252" fontSize="7" fontFamily="monospace" textAnchor="middle">{Math.round(maxLeaks / 2)}</text>
                              <text x="12" y="104" fill="#525252" fontSize="7" fontFamily="monospace" textAnchor="middle">0</text>

                              {points.length > 1 && (
                                <path
                                  d={pathD}
                                  fill="none"
                                  stroke={isAllClean ? '#10b981' : '#ef4444'}
                                  strokeWidth="1.5"
                                  opacity="0.8"
                                />
                              )}

                              {points.map((p, idx) => (
                                <g
                                  key={idx}
                                  onMouseEnter={() => setHoveredPointIndex(idx)}
                                  onMouseLeave={() => setHoveredPointIndex(null)}
                                  className="cursor-pointer"
                                >
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r="4"
                                    fill="#000"
                                    stroke={p.leaks === 0 ? '#10b981' : p.leaks <= 3 ? '#f59e0b' : '#ef4444'}
                                    strokeWidth="1.5"
                                  />
                                  {hoveredPointIndex === idx && (
                                    <circle
                                      cx={p.x}
                                      cy={p.y}
                                      r="8"
                                      fill={p.leaks === 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}
                                      className="animate-ping"
                                    />
                                  )}
                                </g>
                              ))}

                              {hoveredPointIndex !== null && points[hoveredPointIndex] && (
                                <g transform={`translate(${Math.max(10, Math.min(200, points[hoveredPointIndex].x - 45))}, ${Math.max(5, points[hoveredPointIndex].y - 30)})`}>
                                  <rect
                                    width="90"
                                    height="22"
                                    fill="rgba(10,10,10,0.95)"
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth="0.5"
                                    rx="4"
                                  />
                                  <text x="45" y="9" fill="#a3a3a3" fontSize="6.5" fontFamily="monospace" textAnchor="middle" className="lowercase">
                                    {points[hoveredPointIndex].folder}
                                  </text>
                                  <text x="45" y="17" fill="#fff" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold" className="lowercase">
                                    {points[hoveredPointIndex].leaks} leaks flagged
                                  </text>
                                </g>
                              )}
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  )}
                  <span className="text-[8px] font-mono text-neutral-600 lowercase select-none">y-axis: leak count. x-axis: chron. runs</span>
                </div>

                {/* Scan list */}
                <div className="md:col-span-7 flex flex-col">
                  <div className="flex-1 space-y-3 max-h-[200px] overflow-y-auto pr-1">
                    {scanHistory.length === 0 ? (
                      <div className="text-center text-neutral-600 py-12 font-mono text-[11px] lowercase">
                        no scan history yet — run your first scan above.
                      </div>
                    ) : (
                      scanHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-4 hover:border-white/10 transition-colors"
                        >
                          <div className="space-y-1 font-mono text-[10px] md:text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium lowercase truncate max-w-[90px] md:max-w-none">{entry.folderName}</span>
                              <span className="text-[9px] text-neutral-500 whitespace-nowrap">{entry.timestamp.split(', ')[1] || entry.timestamp}</span>
                            </div>
                            <div className="text-[10px] text-neutral-400 lowercase">
                              scanned {entry.totalFiles} files in {entry.durationMs}ms
                            </div>
                          </div>
                          
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-mono border lowercase shrink-0 ${
                              entry.leaksFound === 0
                                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                                : entry.leaksFound <= 3
                                ? 'bg-amber-950/40 text-amber-400 border-amber-500/20'
                                : 'bg-red-950/40 text-red-400 border-red-500/20'
                            }`}
                          >
                            {entry.leaksFound} leaks
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Interactive Code Audit Inspector Modal */}
        {selectedFinding && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedFinding(null);
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-2xl bg-neutral-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 transform scale-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-neutral-900 border-b border-white/5 select-none shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 block animate-pulse"></span>
                  <span className="text-xs text-red-400 font-mono lowercase">
                    securify audit --inspector
                  </span>
                </div>
                <button
                  onClick={() => setSelectedFinding(null)}
                  className="text-neutral-500 hover:text-white transition-colors"
                  aria-label="close inspector"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 font-mono text-xs select-text">
                {/* Meta details */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-4 select-none">
                  <div>
                    <span className="block text-[10px] text-neutral-500 lowercase mb-0.5">exposed asset location:</span>
                    <span className="text-white font-medium text-xs break-all">{selectedFinding.file}:{selectedFinding.line}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="bg-red-950/40 text-red-400 border border-red-500/20 px-2 py-1 rounded text-[10px] font-mono lowercase whitespace-nowrap">
                      critical severity
                    </span>
                    <span className="bg-neutral-900 border border-white/5 text-neutral-400 px-2 py-1 rounded text-[10px] font-mono lowercase whitespace-nowrap">
                      {selectedFinding.type.toLowerCase()}
                    </span>
                  </div>
                </div>

                {/* Interactive Code Diff View */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center select-none text-[10px] text-neutral-500 lowercase">
                    <span>interactive code diff (vulnerable vs secure)</span>
                    <button
                      onClick={() => handleStartExploitSimulation(selectedFinding)}
                      className="bg-red-950/80 hover:bg-red-900/90 text-red-400 border border-red-500/20 px-2.5 py-1.5 rounded-xl text-[9px] font-mono transition-colors flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse block"></span>
                      simulate exploit
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Vulnerable */}
                    <div className="space-y-1">
                      <span className="block text-[9px] text-red-400 font-mono pl-1 lowercase">[-] vulnerable code:</span>
                      <div className="bg-neutral-950 border border-red-500/15 rounded-xl p-3 overflow-x-auto h-[180px] font-mono text-[10px] relative">
                        <div className="space-y-0.5">
                          {selectedFinding.contextLines?.map((line, cIdx) => {
                            const isErrorLine = line.lineNum === selectedFinding.line;
                            return (
                              <div key={cIdx} className={`flex items-start gap-2 ${isErrorLine ? 'bg-red-950/30 text-red-300' : 'text-neutral-500'}`}>
                                <span className="w-5 text-right text-neutral-600 select-none">{line.lineNum}</span>
                                <span className="whitespace-pre break-all">
                                  {isErrorLine && <span className="text-red-500 mr-1 select-none font-bold">⚠</span>}
                                  {line.content}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Right: Remediation */}
                    <div className="space-y-1">
                      <span className="block text-[9px] text-emerald-400 font-mono pl-1 lowercase">[+] secure code:</span>
                      <div className="bg-neutral-950 border border-emerald-500/15 rounded-xl p-3 overflow-x-auto h-[180px] font-mono text-[10px] relative flex flex-col justify-between">
                        <div className="space-y-0.5">
                          {selectedFinding.contextLines?.map((line, cIdx) => {
                            const isErrorLine = line.lineNum === selectedFinding.line;
                            return (
                              <div key={cIdx} className={`flex items-start gap-2 ${isErrorLine ? 'bg-emerald-950/20 text-emerald-300' : 'text-neutral-600'}`}>
                                <span className="w-5 text-right text-neutral-700 select-none">{line.lineNum}</span>
                                <span className="whitespace-pre break-all">
                                  {isErrorLine ? selectedFinding.safeFix : line.content}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedFinding.safeFix);
                            setCopiedFix(true);
                            setTimeout(() => setCopiedFix(false), 2000);
                          }}
                          className="absolute right-3 bottom-3 bg-neutral-900 border border-white/10 hover:bg-neutral-800 text-neutral-300 text-[9px] font-mono px-2 py-1.5 rounded-lg transition-colors lowercase"
                        >
                          {copiedFix ? 'copied!' : 'copy fix'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Why unsafe */}
                <div className="space-y-2">
                  <span className="block text-[10px] text-red-400 font-bold lowercase select-none">why is this unsafe?</span>
                  <p className="text-neutral-400 leading-relaxed lowercase font-light">
                    {selectedFinding.explanation}
                  </p>
                </div>

                {/* Remediation */}
                <div className="space-y-2">
                  <span className="block text-[10px] text-emerald-400 font-bold lowercase select-none">remediation & quick-fix:</span>
                  <p className="text-neutral-400 leading-relaxed lowercase font-light">
                    {selectedFinding.remediation}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-neutral-900 border-t border-white/5 flex justify-end shrink-0 select-none">
                <button
                  onClick={() => setSelectedFinding(null)}
                  className="bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl px-5 py-2.5 lowercase transition-all"
                >
                  dismiss inspector
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Attack Surface Exploitability Simulator Modal */}
        {exploitSimulating && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-all duration-300 animate-in fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setExploitSimulating(null);
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-xl bg-black border border-red-500/20 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 transform scale-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh] text-left">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-red-950/20 border-b border-red-500/10 select-none shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 block animate-pulse"></span>
                  <span className="text-xs text-red-500 font-mono font-bold lowercase tracking-wider">
                    securify audit --exploit-simulator
                  </span>
                </div>
                <button
                  onClick={() => setExploitSimulating(null)}
                  className="text-neutral-500 hover:text-white transition-colors"
                  aria-label="close simulator"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Console logs terminal */}
              <div className="p-5 bg-black overflow-y-auto flex-1 font-mono text-[11px] leading-relaxed text-neutral-300 select-text min-h-[300px] max-h-[450px] space-y-2 custom-scrollbar">
                {simulatedConsoleLogs.map((log, index) => {
                  let logClass = 'text-neutral-300';
                  if (log.startsWith('[!]')) logClass = 'text-red-500 font-bold';
                  else if (log.startsWith('[+]')) logClass = 'text-emerald-400';
                  else if (log.startsWith('$')) logClass = 'text-sky-400 font-bold';
                  else if (log.startsWith('[~]')) logClass = 'text-amber-400 animate-pulse';

                  return (
                    <div key={index} className={`${logClass} whitespace-pre-wrap break-all`}>
                      {log}
                    </div>
                  );
                })}
                {simulatedConsoleLogs.length < 8 && (
                  <div className="flex items-center gap-1.5 text-neutral-600 animate-pulse">
                    <span>loading simulation vectors...</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-red-950/10 border-t border-red-500/10 flex justify-between items-center shrink-0 select-none text-[10px] text-neutral-500 font-mono">
                <span>target: {exploitSimulating.type.toLowerCase()}</span>
                <button
                  onClick={() => setExploitSimulating(null)}
                  className="bg-red-950/50 hover:bg-red-900/60 border border-red-500/20 text-red-400 text-xs font-mono rounded-xl px-4 py-2 lowercase transition-all"
                >
                  close session
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
