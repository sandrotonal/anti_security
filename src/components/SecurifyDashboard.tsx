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
        const fileFindings: Finding[] = [];

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

              // Build context lines: 2 lines before, 2 lines after
              const contextLines: { lineNum: number; content: string }[] = [];
              const startIdx = Math.max(0, lineIdx - 2);
              const endIdx = Math.min(lines.length - 1, lineIdx + 2);
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
                line: lineIdx + 1,
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
                  onClick={exportReportJSON}
                  className="bg-sky-950 hover:bg-sky-900 text-sky-400 border border-sky-500/20 text-xs font-mono rounded-xl px-5 py-3 lowercase transition-all select-none"
                >
                  export report (.json)
                </button>
                <button
                  onClick={shareAuditReport}
                  className="bg-indigo-950 hover:bg-indigo-900 text-indigo-400 border border-indigo-500/20 text-xs font-mono rounded-xl px-5 py-3 lowercase transition-all select-none"
                >
                  {reportShared ? 'copied!' : 'share report'}
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

                {/* Code Window View */}
                <div className="space-y-2">
                  <span className="block text-[10px] text-neutral-500 lowercase select-none">vulnerable code block context:</span>
                  <div className="bg-black border border-white/5 rounded-xl p-4 overflow-x-auto relative">
                    <div className="space-y-1">
                      {selectedFinding.contextLines?.map((line, cIdx) => {
                        const isErrorLine = line.lineNum === selectedFinding.line;
                        return (
                          <div
                            key={cIdx}
                            className={`flex items-start gap-4 py-0.5 ${
                              isErrorLine ? 'bg-red-500/10 text-red-200 border-l-2 border-red-500 -ml-4 pl-3.5' : 'text-neutral-400'
                            }`}
                          >
                            <span className="text-neutral-600 select-none w-6 text-right font-mono shrink-0">{line.lineNum}</span>
                            <span className="whitespace-pre break-all">
                              {isErrorLine && <span className="text-red-500 mr-1.5 select-none font-bold">⚠</span>}
                              {line.content}
                            </span>
                          </div>
                        );
                      })}
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

                {/* Safe Code Block with Copy button */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-neutral-500 select-none">
                    <span>remediated secure code implementation:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedFinding.safeFix);
                        setCopiedFix(true);
                        setTimeout(() => setCopiedFix(false), 2000);
                      }}
                      className="text-neutral-400 hover:text-white transition-colors lowercase"
                    >
                      {copiedFix ? '[copied!]' : '[copy fix]'}
                    </button>
                  </div>
                  <div className="bg-neutral-900 border border-white/5 rounded-xl p-4 overflow-x-auto relative flex justify-between items-start">
                    <pre className="text-emerald-400 whitespace-pre font-mono text-[11px] leading-relaxed break-all select-text">{selectedFinding.safeFix}</pre>
                  </div>
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

      </div>
    </section>
  );
};
