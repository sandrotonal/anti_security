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

const DOCKERFILE_PRESET = `FROM node:latest

# Running as root is a high security vulnerability
USER root

RUN apt-get update && apt-get install -y sudo

EXPOSE 80

CMD ["node", "server.js"]`;

const DOCKER_COMPOSE_PRESET = `version: '3.8'

services:
  database:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      # CRITICAL: Exposed database credentials
      POSTGRES_PASSWORD: "db_password_sec_991"
  
  backend:
    image: api-service:latest
    ports:
      - "80:80"
    # Privileged container mode allows host escape
    privileged: true
    user: "root"`;

const KUBERNETES_PRESET = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: web-app
        image: nginx:latest
        securityContext:
          # CRITICAL: Child privilege escalation active
          allowPrivilegeEscalation: true
          runAsNonRoot: false`;

interface MisconfigRule {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'warning';
  pattern: RegExp;
  description: string;
  remediation: string;
}

const misconfigRules: MisconfigRule[] = [
  {
    id: 'privileged-container',
    name: 'privileged container flag active',
    severity: 'critical',
    pattern: /privileged:\s*true/i,
    description: 'container runs with host-level privileges. a compromised container can compromise the entire host operating system.',
    remediation: 'set privileged: false or remove the privileged attribute entirely.'
  },
  {
    id: 'run-as-root',
    name: 'container running as root user',
    severity: 'high',
    pattern: /(USER\s+root|user:\s*["']?root["']?)/i,
    description: 'running as root inside container gives full control. container breakout vulnerabilities could lead to host access.',
    remediation: 'create a non-root user in Dockerfile (e.g. USER node) or configure securityContext.runAsUser.'
  },
  {
    id: 'host-network-port-exposure',
    name: 'excessive host port exposure',
    severity: 'high',
    pattern: /(hostNetwork:\s*true|hostPort:)/i,
    description: 'binding directly to host network ports bypassed container network isolation.',
    remediation: 'remove hostPort or hostNetwork: true. rely on standard ingress controllers or service objects.'
  },
  {
    id: 'allow-privilege-escalation',
    name: 'privilege escalation permission active',
    severity: 'critical',
    pattern: /allowPrivilegeEscalation:\s*true/i,
    description: 'child processes can gain more privileges than their parent process (e.g. via setuid binaries).',
    remediation: 'set allowPrivilegeEscalation: false in securityContext.'
  },
  {
    id: 'writable-root-filesystem',
    name: 'writable root filesystem allowed',
    severity: 'warning',
    pattern: /readOnlyRootFilesystem:\s*false/i,
    description: 'a writable root filesystem allows malicious files to be written and executed in case of container compromise.',
    remediation: 'set readOnlyRootFilesystem: true and mount temporary volumes for writable paths.'
  },
  {
    id: 'run-as-non-root-disabled',
    name: 'non-root user enforcement disabled',
    severity: 'critical',
    pattern: /runAsNonRoot:\s*false/i,
    description: 'the container engine is allowed to start the container as root user without validation.',
    remediation: 'set runAsNonRoot: true in the pod/container securityContext.'
  },
  {
    id: 'hardcoded-secrets',
    name: 'hardcoded credentials in config',
    severity: 'high',
    pattern: /(password|secret|api_key|token):\s*["']?[a-zA-Z0-9_\-]{8,}["']?/i,
    description: 'hardcoded secrets in configuration files can easily leak to version control histories.',
    remediation: 'use environment variables, docker secrets, or kubernetes secret resources instead.'
  },
  {
    id: 'mutable-latest-tag',
    name: 'mutable image version tag used',
    severity: 'warning',
    pattern: /image:\s*["']?[a-zA-Z0-9_.\-\/]+:latest["']?|FROM\s+[a-zA-Z0-9_.\-\/]+:latest/i,
    description: 'using :latest tags creates non-deterministic builds as the underlying base image changes over time.',
    remediation: 'pin your base/application images to a specific semantic version tag or SHA-256 hash digest.'
  },
  {
    id: 'missing-resource-limits',
    name: 'no resource constraints configured',
    severity: 'warning',
    pattern: /(limits:\s*|cpu:\s*|memory:\s*)/i,
    description: 'without resource limits, a single compromised or misbehaving container can consume host CPU/Memory resources leading to denial of service.',
    remediation: 'add resources.limits.cpu and resources.limits.memory configs to your deployment manifest.'
  },
  {
    id: 'admin-capabilities-active',
    name: 'excessive system capabilities allowed',
    severity: 'critical',
    pattern: /capabilities:\s*add:\s*\[?.*(SYS_ADMIN|NET_ADMIN).*\]?/i,
    description: 'granting SYS_ADMIN or NET_ADMIN allows the container to configure network interfaces or load kernel modules.',
    remediation: 'remove administrative capabilities. follow the principle of least privilege.'
  }
];

interface MisconfigFinding {
  ruleName: string;
  severity: 'critical' | 'high' | 'warning';
  line: number;
  match: string;
  description: string;
  remediation: string;
}

const getSecretFix = (type: string): string => {
  const cleanType = type.toLowerCase();
  if (cleanType.includes('aws') && cleanType.includes('id')) {
    return 'process.env.AWS_ACCESS_KEY_ID';
  }
  if (cleanType.includes('aws') && cleanType.includes('secret')) {
    return 'process.env.AWS_SECRET_ACCESS_KEY';
  }
  if (cleanType.includes('supabase')) {
    return 'process.env.SUPABASE_SERVICE_ROLE_KEY';
  }
  if (cleanType.includes('stripe')) {
    return 'process.env.STRIPE_SECRET_KEY';
  }
  if (cleanType.includes('github')) {
    return 'process.env.GITHUB_PAT';
  }
  if (cleanType.includes('google') || cleanType.includes('gcp')) {
    return 'process.env.GCP_API_KEY';
  }
  if (cleanType.includes('slack')) {
    return 'process.env.SLACK_WEBHOOK_URL';
  }
  if (cleanType.includes('database') || cleanType.includes('postgres')) {
    return 'process.env.DATABASE_URL';
  }
  if (cleanType.includes('ssh') || cleanType.includes('private')) {
    return 'process.env.SSH_PRIVATE_KEY';
  }
  return 'process.env.SECURE_CREDENTIAL_KEY';
};

const getIaCFix = (ruleName: string, match: string): string => {
  const name = ruleName.toLowerCase();
  if (name.includes('privileged') && name.includes('flag')) {
    return 'privileged: false';
  }
  if (name.includes('user') && name.includes('root')) {
    return match.replace(/root/i, 'node');
  }
  if (name.includes('network') || name.includes('port')) {
    return 'hostNetwork: false';
  }
  if (name.includes('escalation')) {
    return 'allowPrivilegeEscalation: false';
  }
  if (name.includes('filesystem') || name.includes('readonly')) {
    return 'readOnlyRootFilesystem: true';
  }
  if (name.includes('non-root')) {
    return 'runAsNonRoot: true';
  }
  if (name.includes('credentials') || name.includes('hardcoded')) {
    return match.replace(/:\s*["']?[a-zA-Z0-9_\-]{8,}["']?/, ': "${SECRET_VALUE}"');
  }
  if (name.includes('tag') || name.includes('latest')) {
    return match.replace(/:latest/g, ':18-alpine').replace(/@latest/g, '@18-alpine');
  }
  if (name.includes('resource') || name.includes('limits')) {
    return `resources:\n            limits:\n              cpu: "500m"\n              memory: "512Mi"\n            requests:\n              cpu: "250m"\n              memory: "256Mi"`;
  }
  if (name.includes('capabilities') || name.includes('admin')) {
    return 'capabilities:\n            drop:\n              - ALL';
  }
  return '# configuration secured';
};

const NODE_DEP_PRESET = `{
  "name": "securify-demo-app",
  "version": "1.0.0",
  "dependencies": {
    "axios": "^0.21.0",
    "lodash": "4.17.15",
    "express": "4.16.0",
    "jsonwebtoken": "^8.5.1",
    "minimist": "1.2.0"
  }
}`;

const PYTHON_DEP_PRESET = `requests==2.24.0
urllib3==1.25.9
cryptography==3.2
jinja2==2.11.2
django==2.2
numpy==1.19.1
`;

const RUST_DEP_PRESET = `[package]
name = "securify-rust"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = "1.14.0"
serde = { version = "1.0.130", features = ["derive"] }
rand = "0.8.4"
openssl = "0.10.38"
hyper = "0.14.10"
`;

interface SCAVulnerability {
  cve: string;
  pkgName: string;
  affectedRange: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  remediation: string;
  fixedIn: string;
}

const scaDb: Record<string, SCAVulnerability[]> = {
  axios: [
    {
      cve: 'CVE-2021-3749',
      pkgName: 'axios',
      affectedRange: '< 0.21.1',
      severity: 'high',
      title: 'Server-Side Request Forgery (SSRF)',
      description: 'Axios contains a server-side request forgery vulnerability in the dynamic HTTP request parsing layer.',
      remediation: 'Update axios package dependency to version 0.21.1 or higher.',
      fixedIn: '0.21.1'
    }
  ],
  lodash: [
    {
      cve: 'CVE-2020-8203',
      pkgName: 'lodash',
      affectedRange: '< 4.17.21',
      severity: 'critical',
      title: 'Prototype Pollution in defaultsDeep',
      description: 'Lodash before 4.17.21 is vulnerable to Prototype Pollution via the defaultsDeep, merge, and zipObjectDeep methods.',
      remediation: 'Update lodash package dependency to version 4.17.21 or higher.',
      fixedIn: '4.17.21'
    }
  ],
  express: [
    {
      cve: 'CVE-2022-24999',
      pkgName: 'express',
      affectedRange: '< 4.17.3',
      severity: 'medium',
      title: 'Open Redirect via malicious query inputs',
      description: 'Express web framework is vulnerable to open redirect because it uses raw request variables for redirects.',
      remediation: 'Upgrade express package dependency to 4.17.3 or higher.',
      fixedIn: '4.17.3'
    }
  ],
  jsonwebtoken: [
    {
      cve: 'CVE-2022-23529',
      pkgName: 'jsonwebtoken',
      affectedRange: '< 9.0.0',
      severity: 'critical',
      title: 'Secret Verification / Key Confusion',
      description: 'Insecure validation of cryptographic signature schemes in jwt.verify permits bypass of access validation.',
      remediation: 'Upgrade jsonwebtoken package dependency to 9.0.0 or higher.',
      fixedIn: '9.0.0'
    }
  ],
  minimist: [
    {
      cve: 'CVE-2021-35458',
      pkgName: 'minimist',
      affectedRange: '< 1.2.6',
      severity: 'high',
      title: 'Prototype Pollution via argument keys',
      description: 'Minimist before version 1.2.6 allows Prototype Pollution when processing parameter index overrides.',
      remediation: 'Upgrade minimist package dependency to 1.2.6 or higher.',
      fixedIn: '1.2.6'
    }
  ],
  requests: [
    {
      cve: 'CVE-2020-26137',
      pkgName: 'requests',
      affectedRange: '< 2.25.0',
      severity: 'medium',
      title: 'HTTP Request Smuggling / CRLF Injection',
      description: 'urllib3 / requests packages allow CRLF injection if control characters are included in HTTP path variables.',
      remediation: 'Upgrade requests package dependency to 2.25.0 or higher in requirements.txt.',
      fixedIn: '2.25.0'
    }
  ],
  urllib3: [
    {
      cve: 'CVE-2020-26137',
      pkgName: 'urllib3',
      affectedRange: '< 1.25.10',
      severity: 'medium',
      title: 'CRLF Injection in ConnectionPool',
      description: 'urllib3 allows CRLF injection because it doesn\'t sanitize the HTTP request headers properly.',
      remediation: 'Upgrade urllib3 package dependency to 1.25.10 or higher.',
      fixedIn: '1.25.10'
    }
  ],
  cryptography: [
    {
      cve: 'CVE-2021-23980',
      pkgName: 'cryptography',
      affectedRange: '< 3.3.2',
      severity: 'high',
      title: 'RSA Bleichenbacher Attack Vulnerability',
      description: 'cryptography package fails to perform RSA decryption signature checks in constant time.',
      remediation: 'Upgrade cryptography package dependency to 3.3.2 or higher.',
      fixedIn: '3.3.2'
    }
  ],
  jinja2: [
    {
      cve: 'CVE-2020-28493',
      pkgName: 'jinja2',
      affectedRange: '< 2.11.3',
      severity: 'medium',
      title: 'Regular Expression Denial of Service (ReDoS)',
      description: 'ReDoS vulnerability in Jinja2 when parsing specific string input formats.',
      remediation: 'Upgrade jinja2 package dependency to 2.11.3 or higher.',
      fixedIn: '2.11.3'
    }
  ],
  django: [
    {
      cve: 'CVE-2021-32052',
      pkgName: 'django',
      affectedRange: '< 3.2.1',
      severity: 'high',
      title: 'Directory Traversal & Header Injection',
      description: 'Django web framework allows Directory Traversal via specific static file URLs.',
      remediation: 'Upgrade django package dependency to 3.2.1 or higher.',
      fixedIn: '3.2.1'
    }
  ],
  tokio: [
    {
      cve: 'RUSTSEC-2021-0124',
      pkgName: 'tokio',
      affectedRange: '< 1.18.4',
      severity: 'high',
      title: 'Data Race in JoinHandle abort API',
      description: 'Data race occurs when aborting tasks concurrently on multi-threaded runtimes.',
      remediation: 'Update Cargo.toml to use tokio crate version 1.18.4 or higher.',
      fixedIn: '1.18.4'
    }
  ],
  serde: [
    {
      cve: 'RUSTSEC-2023-0005',
      pkgName: 'serde',
      affectedRange: '< 1.0.150',
      severity: 'medium',
      title: 'Deserializer Resource Exhaustion',
      description: 'Deserializing recursive structures can lead to stack overflow on deep payloads.',
      remediation: 'Update Cargo.toml to use serde crate version 1.0.150 or higher.',
      fixedIn: '1.0.150'
    }
  ],
  openssl: [
    {
      cve: 'CVE-2021-3711',
      pkgName: 'openssl',
      affectedRange: '< 0.10.48',
      severity: 'critical',
      title: 'SM2 Decryption Buffer Overflow',
      description: 'Decryption buffer overflow exists in openssl when parsing SM2 envelope payloads.',
      remediation: 'Update Cargo.toml to use openssl crate version 0.10.48 or higher.',
      fixedIn: '0.10.48'
    }
  ],
  hyper: [
    {
      cve: 'CVE-2021-32714',
      pkgName: 'hyper',
      affectedRange: '< 0.14.18',
      severity: 'high',
      title: 'HTTP Request Smuggling',
      description: 'hyper allows HTTP Request Smuggling because it accepts invalid Transfer-Encoding headers.',
      remediation: 'Update Cargo.toml to use hyper crate version 0.14.18 or higher.',
      fixedIn: '0.14.18'
    }
  ]
};

const cleanVersion = (v: string): string => v.replace(/[\^~>=<]/g, '').trim();

const compareVersions = (v1: string, v2: string): number => {
  const parts1 = cleanVersion(v1).split('.').map(Number);
  const parts2 = cleanVersion(v2).split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  return 0;
};

export const SecurifySandbox = () => {
  const [activeTab, setActiveTab] = useState<'scan' | 'config' | 'entropy' | 'secrets' | 'custom-rule' | 'misconfig' | 'dependency'>('scan');
  const [activeDiffFix, setActiveDiffFix] = useState<{ original: string; fixed: string; line: number; type: string } | null>(null);
  const [activeIaCDiffFix, setActiveIaCDiffFix] = useState<{ original: string; fixed: string; line: number; type: string } | null>(null);

  // Tab 6: Misconfig Scanner States
  const [misconfigCode, setMisconfigCode] = useState<string>(
    `# Paste Dockerfile, docker-compose.yml, or Kubernetes YAML here.\n# Securify will check it against IaC hardening best practices.\n\n` + DOCKERFILE_PRESET
  );
  const [misconfigResults, setMisconfigResults] = useState<{
    scannedLines: number;
    findings: MisconfigFinding[];
  } | null>(null);
  const [misconfigScanning, setMisconfigScanning] = useState<boolean>(false);

  // Tab 7: Dependency SCA Scanner States
  const [dependencyCode, setDependencyCode] = useState<string>(NODE_DEP_PRESET);
  const [dependencyResults, setDependencyResults] = useState<{
    scannedDeps: number;
    findings: {
      pkgName: string;
      version: string;
      cve: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      title: string;
      description: string;
      remediation: string;
      fixedIn: string;
    }[];
  } | null>(null);
  const [dependencyScanning, setDependencyScanning] = useState<boolean>(false);

  const runDependencyScan = () => {
    setDependencyScanning(true);
    setTimeout(() => {
      let detectedDeps: { name: string; version: string }[] = [];
      
      const isJson = dependencyCode.trim().startsWith('{');
      const isCargo = dependencyCode.includes('[dependencies]') || dependencyCode.includes('[package]');
      
      if (isJson) {
        try {
          const parsed = JSON.parse(dependencyCode);
          const deps = {
            ...(parsed.dependencies || {}),
            ...(parsed.devDependencies || {})
          };
          Object.keys(deps).forEach((name) => {
            detectedDeps.push({
              name,
              version: deps[name].toString()
            });
          });
        } catch (e) {
          // ignore parsing error
        }
      } else if (isCargo) {
        const lines = dependencyCode.split('\n');
        let inDeps = false;
        lines.forEach((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('[dependencies]') || trimmed.startsWith('[dev-dependencies]')) {
            inDeps = true;
          } else if (trimmed.startsWith('[')) {
            inDeps = false;
          } else if (inDeps && trimmed && !trimmed.startsWith('#')) {
            const match = trimmed.match(/^([\w\-]+)\s*=\s*(?:(?:"([^"]+)")|(?:\{[^}]*version\s*=\s*"([^"]+)"[^}]*\}))/);
            if (match) {
              const name = match[1];
              const version = match[2] || match[3] || '';
              if (name && version) {
                detectedDeps.push({ name, version });
              }
            }
          }
        });
      } else {
        const lines = dependencyCode.split('\n');
        lines.forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const match = trimmed.match(/^([\w\-]+)\s*(?:==|>=|@)\s*([\d\.]+)/);
            if (match) {
              detectedDeps.push({
                name: match[1],
                version: match[2]
              });
            }
          }
        });
      }

      const findings: any[] = [];
      detectedDeps.forEach((dep) => {
        const dbEntry = scaDb[dep.name.toLowerCase()];
        if (dbEntry) {
          dbEntry.forEach((vuln) => {
            if (compareVersions(dep.version, vuln.fixedIn) < 0) {
              findings.push({
                pkgName: dep.name,
                version: dep.version,
                cve: vuln.cve,
                severity: vuln.severity,
                title: vuln.title,
                description: vuln.description,
                remediation: vuln.remediation,
                fixedIn: vuln.fixedIn
              });
            }
          });
        }
      });

      setDependencyResults({
        scannedDeps: detectedDeps.length,
        findings
      });
      setDependencyScanning(false);
    }, 1200);
  };

  const runMisconfigScan = () => {
    setMisconfigScanning(true);
    
    setTimeout(() => {
      const lines = misconfigCode.split('\n');
      const findings: MisconfigFinding[] = [];

      // Check for missing resource limits in K8s YAML files
      const isK8s = /apiVersion:|kind:\s*(Deployment|Pod|StatefulSet|DaemonSet)/i.test(misconfigCode);
      if (isK8s && !/(limits:|cpu:|memory:)/i.test(misconfigCode)) {
        findings.push({
          ruleName: 'missing resource limits configuration',
          severity: 'warning',
          line: 1,
          match: 'kind: Deployment/Pod',
          description: 'no resources limits defined. pod can consume all host memory/cpu leading to node exhaustion and dos.',
          remediation: 'define resources.limits.cpu and resources.limits.memory for all containers.'
        });
      }

      // Check line by line rules
      lines.forEach((lineText, lineIdx) => {
        misconfigRules.forEach((rule) => {
          // Special exception for resources limits check which is handled globally
          if (rule.id === 'missing-resource-limits') return;
          
          rule.pattern.lastIndex = 0;
          const match = rule.pattern.exec(lineText);
          if (match) {
            findings.push({
              ruleName: rule.name,
              severity: rule.severity,
              line: lineIdx + 1,
              match: match[0].trim(),
              description: rule.description,
              remediation: rule.remediation
            });
          }
        });
      });

      setMisconfigResults({
        scannedLines: lines.length,
        findings
      });
      setMisconfigScanning(false);
    }, 500);
  };
  
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
    <section className="bg-black min-h-screen py-16 md:py-28 px-4 md:px-12 relative overflow-hidden select-none">
      {/* Background grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="max-w-3xl mb-10 text-left">
          <span className="inline-block bg-neutral-900 border border-white/10 rounded-full px-4 py-1 text-xs text-neutral-400 lowercase mb-4 tracking-wider">
            developer playground
          </span>
          <h2 className="hero-title text-3xl md:text-5xl font-medium tracking-tight text-white lowercase mb-4">
            interactive leak sandbox.
          </h2>
          <p className="text-neutral-400 text-sm font-light lowercase leading-relaxed max-w-xl">
            test our client-side scanner on files, or visually generate configurations for your pre-commit repository setups.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 mb-8 border-b border-white/5 pb-4 overflow-x-auto scrollbar-none select-none">
          <button
            onClick={() => { setActiveTab('scan'); setActiveDiffFix(null); setActiveIaCDiffFix(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all lowercase shrink-0 ${
              activeTab === 'scan'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
            }`}
          >
            leak scanner
          </button>
          <button
            onClick={() => { setActiveTab('config'); setActiveDiffFix(null); setActiveIaCDiffFix(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all lowercase shrink-0 ${
              activeTab === 'config'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
            }`}
          >
            config generator (.toml)
          </button>
          <button
            onClick={() => { setActiveTab('entropy'); setActiveDiffFix(null); setActiveIaCDiffFix(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all lowercase shrink-0 ${
              activeTab === 'entropy'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
            }`}
          >
            entropy meter
          </button>
          <button
            onClick={() => { setActiveTab('secrets'); setActiveDiffFix(null); setActiveIaCDiffFix(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all lowercase shrink-0 ${
              activeTab === 'secrets'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
            }`}
          >
            secret generator
          </button>
          <button
            onClick={() => { setActiveTab('custom-rule'); setActiveDiffFix(null); setActiveIaCDiffFix(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all lowercase shrink-0 ${
              activeTab === 'custom-rule'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
            }`}
          >
            custom rule tester
          </button>
          <button
            onClick={() => { setActiveTab('misconfig'); setActiveDiffFix(null); setActiveIaCDiffFix(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all lowercase shrink-0 ${
              activeTab === 'misconfig'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
            }`}
          >
            IaC scanner
          </button>
          <button
            onClick={() => { setActiveTab('dependency'); setActiveDiffFix(null); setActiveIaCDiffFix(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all lowercase shrink-0 ${
              activeTab === 'dependency'
                ? 'bg-white text-black border-white'
                : 'bg-neutral-950 text-neutral-500 border-white/5 hover:text-white'
            }`}
          >
            dependency SCA scanner
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
                      <div className="text-white font-mono text-sm lowercase">
                        ✔ status: safe code structure
                      </div>
                      <p className="text-neutral-400 text-xs font-light leading-relaxed lowercase">
                        no common cloud api credentials, database tokens, or payment secret signatures were detected in your input space.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-neutral-200 font-mono text-sm lowercase">
                        ⚠️ status: leaks discovered ({report.leaks.length})
                      </div>

                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 select-text">
                        {report.leaks.map((leak, idx) => (
                          <div
                            key={idx}
                            className="bg-neutral-900/40 border border-white/10 rounded-xl p-3 space-y-1"
                          >
                            <div className="flex justify-between items-center text-[10px] font-mono text-neutral-300">
                              <span className="lowercase font-bold">{leak.type}</span>
                              <span>line {leak.line}</span>
                            </div>
                            <code className="block text-[10px] text-neutral-300 break-all select-all font-mono">
                              {leak.match}
                            </code>
                            <p className="text-[9px] text-neutral-500 lowercase leading-relaxed font-light">
                              {leak.description}
                            </p>
                             <button
                               onClick={() => {
                                 const fixedPart = getSecretFix(leak.type);
                                 const originalLine = leak.match;
                                 const fixedLine = leak.match.replace(leak.match, fixedPart);
                                 setActiveDiffFix({
                                   original: originalLine,
                                   fixed: fixedLine,
                                   line: leak.line,
                                   type: leak.type
                                 });
                                }}
                               className="mt-2 w-full text-[9px] font-mono text-white hover:text-neutral-200 border border-white/25 bg-white/5 px-2 py-1 rounded-md lowercase transition-colors select-none"
                             >
                               quick fix & show diff
                             </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diff View Panel for secrets scanner */}
                  {activeDiffFix && (
                    <div className="mt-4 p-4 bg-black/60 border border-white/10 rounded-xl space-y-3 animate-page-entrance select-none">
                      <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400">
                        <span>remediation diff viewer (line {activeDiffFix.line}):</span>
                        <button onClick={() => setActiveDiffFix(null)} className="text-neutral-500 hover:text-white transition-colors">
                          [close]
                        </button>
                      </div>
                      <div className="font-mono text-[10px] space-y-1 bg-black p-3 rounded-lg overflow-x-auto border border-white/5">
                        <div className="text-neutral-400 bg-neutral-950 border border-white/5 px-1.5 py-0.5 rounded break-all">
                          - {activeDiffFix.original}
                        </div>
                        <div className="text-white bg-white/10 px-1.5 py-0.5 rounded break-all">
                          + {activeDiffFix.fixed}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(activeDiffFix.fixed);
                            alert('remediated code copied to clipboard!');
                          }}
                          className="w-full bg-neutral-900 hover:bg-neutral-800 text-white border border-white/10 text-[10px] font-mono rounded-lg py-2.5 lowercase transition-all"
                        >
                          copy secure code
                        </button>
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
                      className="flex-1 bg-white hover:bg-neutral-200 text-black border border-white/10 text-[10px] font-mono rounded-lg py-2.5 lowercase transition-all select-none"
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
                          calculateEntropy(entropyInput) > 4.5 ? 'bg-white' : 'bg-white/40'
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
                        <span className={/[A-Z]/.test(entropyInput) ? 'text-white' : 'text-neutral-700'}>
                          {/[A-Z]/.test(entropyInput) ? '✔' : '✖'}
                        </span>
                        <span>uppercase letters</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={/[a-z]/.test(entropyInput) ? 'text-white' : 'text-neutral-700'}>
                          {/[a-z]/.test(entropyInput) ? '✔' : '✖'}
                        </span>
                        <span>lowercase letters</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={/\d/.test(entropyInput) ? 'text-white' : 'text-neutral-700'}>
                          {/[0-9]/.test(entropyInput) ? '✔' : '✖'}
                        </span>
                        <span>numeric digits</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={/[^A-Za-z0-9]/.test(entropyInput) ? 'text-white' : 'text-neutral-700'}>
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
        ) : activeTab === 'custom-rule' ? (
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
                            <code key={idx} className="bg-neutral-900 border border-white/10 text-neutral-300 text-[10px] font-mono px-2 py-0.5 rounded break-all font-mono">
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
                      ? 'bg-white text-black border border-white' 
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
        ) : activeTab === 'misconfig' ? (
          /* Tab 6: IAC MISCONFIGURATION SCANNER */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch select-text animate-page-entrance">
            {/* Left Side: YAML/Dockerfile Input */}
            <div className="lg:col-span-6 bg-neutral-950 border border-white/5 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[10px] font-mono text-neutral-500 block select-none lowercase">
                    infrastructure as code (iac) analyzer
                  </span>
                  {/* Preset examples switchers */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMisconfigCode(DOCKERFILE_PRESET)}
                      className="text-[9px] font-mono text-neutral-400 hover:text-white border border-white/5 px-2 py-0.5 rounded lowercase transition-colors"
                    >
                      dockerfile
                    </button>
                    <button
                      onClick={() => setMisconfigCode(DOCKER_COMPOSE_PRESET)}
                      className="text-[9px] font-mono text-neutral-400 hover:text-white border border-white/5 px-2 py-0.5 rounded lowercase transition-colors"
                    >
                      docker-compose
                    </button>
                    <button
                      onClick={() => setMisconfigCode(KUBERNETES_PRESET)}
                      className="text-[9px] font-mono text-neutral-400 hover:text-white border border-white/5 px-2 py-0.5 rounded lowercase transition-colors"
                    >
                      kubernetes
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-400 block lowercase font-mono">paste configuration payload:</label>
                  <textarea
                    value={misconfigCode}
                    onChange={(e) => setMisconfigCode(e.target.value)}
                    rows={12}
                    className="w-full bg-black border border-white/5 rounded-xl p-4 font-mono text-xs text-white focus:outline-none focus:border-white/20 select-text resize-none"
                    placeholder="paste dockerfile or yaml contents here..."
                  />
                </div>
              </div>

              <button
                onClick={runMisconfigScan}
                disabled={misconfigScanning}
                className="w-full bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl py-3 lowercase transition-all select-none disabled:opacity-50 mt-4"
              >
                {misconfigScanning ? 'analyzing configurations...' : 'scan configuration'}
              </button>
            </div>

            {/* Right Side: Scan Findings Output */}
            <div className="lg:col-span-6 bg-neutral-950 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-neutral-500 block mb-4 select-none lowercase border-b border-white/5 pb-2">
                  iac vulnerability report
                </span>

                {misconfigResults === null ? (
                  <div className="text-center text-neutral-600 py-24 lowercase select-none">
                    [iac engine] idle. paste container manifests on the left and trigger scanning analyzer.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header summary */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-xs text-white font-mono lowercase">scan overview</span>
                        <p className="text-[10px] text-neutral-400 lowercase">
                          analyzed {misconfigResults.scannedLines} lines. found {misconfigResults.findings.length} issues.
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <span className="bg-neutral-900 border border-white/20 text-white px-2 py-0.5 rounded text-[9px] font-mono lowercase">
                          {misconfigResults.findings.filter(f => f.severity === 'critical').length} crit
                        </span>
                        <span className="bg-neutral-900 border border-white/15 text-neutral-300 px-2 py-0.5 rounded text-[9px] font-mono lowercase">
                          {misconfigResults.findings.filter(f => f.severity === 'high').length} high
                        </span>
                        <span className="bg-neutral-900 border border-white/5 text-neutral-400 px-2 py-0.5 rounded text-[9px] font-mono lowercase">
                          {misconfigResults.findings.filter(f => f.severity === 'warning').length} warn
                        </span>
                      </div>
                    </div>

                    {/* Results list */}
                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {misconfigResults.findings.length === 0 ? (
                        <div className="p-4 bg-neutral-900/40 border border-white/10 rounded-xl text-center">
                          <span className="text-white font-mono text-xs lowercase">✓ zero vulnerabilities flagged. manifest complies with security guidelines.</span>
                        </div>
                      ) : (
                        misconfigResults.findings.map((finding, idx) => (
                          <div key={idx} className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-2 hover:border-white/10 transition-colors">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <span className="bg-neutral-900 border border-white/10 text-neutral-400 font-mono text-[9px] px-1.5 py-0.5 rounded">
                                  line {finding.line}
                                </span>
                                <span className="text-white text-xs font-mono font-medium lowercase truncate max-w-[200px]">
                                  {finding.ruleName}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-mono border lowercase shrink-0 ${
                                  finding.severity === 'critical'
                                    ? 'bg-neutral-900 border border-white/20 text-white'
                                    : finding.severity === 'high'
                                    ? 'bg-neutral-900 border border-white/15 text-neutral-300'
                                    : 'bg-neutral-900 border border-white/5 text-neutral-400'
                                }`}
                              >
                                {finding.severity}
                              </span>
                            </div>
                            <p className="text-neutral-400 text-[10px] lowercase font-light leading-relaxed">
                              {finding.description}
                            </p>
                            <div className="text-[10px] font-mono text-neutral-300 bg-neutral-900/40 border border-white/10 rounded p-2 lowercase">
                              remedy: {finding.remediation}
                            </div>
                            <button
                              onClick={() => {
                                const fixedPart = getIaCFix(finding.ruleName, finding.match);
                                const originalLine = finding.match;
                                const fixedLine = finding.match.replace(finding.match, fixedPart);
                                setActiveIaCDiffFix({
                                  original: originalLine,
                                  fixed: fixedLine,
                                  line: finding.line,
                                  type: finding.ruleName
                                });
                              }}
                              className="w-full text-[9px] font-mono text-white hover:text-neutral-200 border border-white/25 bg-white/5 px-2 py-1 rounded-md lowercase transition-colors select-none"
                            >
                              quick fix & show diff
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Diff View Panel for IaC scanner */}
                    {activeIaCDiffFix && (
                      <div className="mt-4 p-4 bg-black/60 border border-white/10 rounded-xl space-y-3 animate-page-entrance select-none">
                        <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400">
                          <span>remediation diff viewer (line {activeIaCDiffFix.line}):</span>
                          <button onClick={() => setActiveIaCDiffFix(null)} className="text-neutral-500 hover:text-white transition-colors">
                            [close]
                          </button>
                        </div>
                        <div className="font-mono text-[10px] space-y-1 bg-black p-3 rounded-lg overflow-x-auto border border-white/5">
                          <div className="text-neutral-400 bg-neutral-950 border border-white/5 px-1.5 py-0.5 rounded break-all">
                            - {activeIaCDiffFix.original}
                          </div>
                          <div className="text-white bg-white/10 px-1.5 py-0.5 rounded break-all whitespace-pre-wrap">
                            + {activeIaCDiffFix.fixed}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(activeIaCDiffFix.fixed);
                              alert('remediated configuration copied to clipboard!');
                            }}
                            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white border border-white/10 text-[10px] font-mono rounded-lg py-2.5 lowercase transition-all"
                          >
                            copy secure configuration
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-[9px] text-neutral-500 font-mono mt-6 leading-relaxed lowercase">
                static manifest scanning is performed client-side. base images, capability flags, and mount definitions are cross-referenced with docker/kubernetes security benchmarks.
              </div>
            </div>
          </div>
        ) : (
          /* Tab 7: DEPENDENCY VULNERABILITY SCA SCANNER */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch select-text animate-page-entrance">
            
            {/* Left Side: Dependency Input */}
            <div className="lg:col-span-6 bg-neutral-950 border border-white/5 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[10px] font-mono text-neutral-500 block select-none lowercase">
                    dependency vulnerability analyzer
                  </span>
                  
                  {/* Preset examples switchers */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDependencyCode(NODE_DEP_PRESET)}
                      className="text-[9px] font-mono text-neutral-400 hover:text-white border border-white/5 px-2 py-0.5 rounded lowercase transition-colors"
                    >
                      package.json (node)
                    </button>
                    <button
                      onClick={() => setDependencyCode(PYTHON_DEP_PRESET)}
                      className="text-[9px] font-mono text-neutral-400 hover:text-white border border-white/5 px-2 py-0.5 rounded lowercase transition-colors"
                    >
                      requirements.txt (pip)
                    </button>
                    <button
                      onClick={() => setDependencyCode(RUST_DEP_PRESET)}
                      className="text-[9px] font-mono text-neutral-400 hover:text-white border border-white/5 px-2 py-0.5 rounded lowercase transition-colors"
                    >
                      Cargo.toml (rust)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-400 block lowercase">paste manifest content:</label>
                  <textarea
                    value={dependencyCode}
                    onChange={(e) => setDependencyCode(e.target.value)}
                    rows={12}
                    className="w-full bg-black border border-white/5 rounded-xl p-4 font-mono text-xs text-white focus:outline-none focus:border-white/20 select-text resize-none"
                    placeholder="paste package.json, requirements.txt, or Cargo.toml contents here..."
                  />
                </div>
              </div>

              <button
                onClick={runDependencyScan}
                disabled={dependencyScanning}
                className="w-full bg-white hover:bg-neutral-200 text-black text-xs font-mono font-medium rounded-xl py-3 lowercase transition-all select-none disabled:opacity-50 mt-4"
              >
                {dependencyScanning ? 'analyzing dependency trees...' : 'scan dependencies'}
              </button>
            </div>

            {/* Right Side: Scan Findings Output */}
            <div className="lg:col-span-6 bg-neutral-950 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-neutral-500 block mb-4 select-none lowercase border-b border-white/5 pb-2">
                  dependency sca vulnerability report
                </span>

                {dependencyResults === null ? (
                  <div className="text-center text-neutral-600 py-24 lowercase select-none">
                    [sca engine] idle. paste manifest file on the left and trigger scanning analyzer.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header summary */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-xs text-white font-mono lowercase">scan overview</span>
                        <p className="text-[10px] text-neutral-400 lowercase">
                          identified {dependencyResults.scannedDeps} packages. found {dependencyResults.findings.length} issues.
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <span className="bg-neutral-900 border border-white/20 text-white px-2 py-0.5 rounded text-[9px] font-mono lowercase">
                          {dependencyResults.findings.filter(f => f.severity === 'critical').length} crit
                        </span>
                        <span className="bg-neutral-900 border border-white/15 text-neutral-300 px-2 py-0.5 rounded text-[9px] font-mono lowercase">
                          {dependencyResults.findings.filter(f => f.severity === 'high').length} high
                        </span>
                        <span className="bg-neutral-900 border border-white/5 text-neutral-400 px-2 py-0.5 rounded text-[9px] font-mono lowercase">
                          {dependencyResults.findings.filter(f => f.severity === 'medium').length} med
                        </span>
                      </div>
                    </div>

                    {/* Results list */}
                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {dependencyResults.findings.length === 0 ? (
                        <div className="p-4 bg-neutral-900/40 border border-white/10 rounded-xl text-center">
                          <span className="text-white font-mono text-xs lowercase">✓ zero vulnerabilities flagged. all dependencies comply with security baselines.</span>
                        </div>
                      ) : (
                        dependencyResults.findings.map((finding, idx) => (
                          <div key={idx} className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-2 hover:border-white/10 transition-colors">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <span className="bg-neutral-900 border border-white/10 text-neutral-400 font-mono text-[9px] px-1.5 py-0.5 rounded">
                                  {finding.cve}
                                </span>
                                <span className="text-white text-xs font-mono font-medium lowercase truncate max-w-[200px]">
                                  {finding.pkgName} ({finding.version})
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-mono border lowercase shrink-0 ${
                                  finding.severity === 'critical'
                                    ? 'bg-neutral-900 border border-white/20 text-white'
                                    : finding.severity === 'high'
                                    ? 'bg-neutral-900 border border-white/15 text-neutral-300'
                                    : 'bg-neutral-900 border border-white/5 text-neutral-400'
                                }`}
                              >
                                {finding.severity}
                              </span>
                            </div>
                            <h5 className="text-neutral-200 text-[11px] font-medium lowercase">{finding.title}</h5>
                            <p className="text-neutral-400 text-[10px] lowercase font-light leading-relaxed">
                              {finding.description}
                            </p>
                            <div className="text-[10px] font-mono text-neutral-300 bg-neutral-900/40 border border-white/10 rounded p-2 lowercase">
                              remedy: {finding.remediation}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                )}
              </div>

              <div className="text-[9px] text-neutral-500 font-mono mt-6 leading-relaxed lowercase">
                software composition analysis (sca) is performed client-side. package names and versions are parsed and matched against static local CVE catalogs.
              </div>
            </div>

          </div>
        )}
        {/* Monochromatic Subscription Marketing Hook */}
        <div className="mt-12 p-6 bg-neutral-900/30 border border-white/5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 text-left relative overflow-hidden select-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none opacity-20" />
          <div className="relative z-10 space-y-2 max-w-xl">
            <span className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-0.5 text-[9px] text-neutral-400 uppercase font-mono">
              securify professional
            </span>
            <h4 className="text-base font-medium text-white lowercase">unlock custom security rulesets.</h4>
            <p className="text-neutral-500 text-xs font-light lowercase leading-relaxed">
              playground tiers limit scan configurations. upgrade to pro to scan unlimited lines, set custom webhook rules, get Slack alerts, and bypass git commit hooks securely with team access policies.
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
  if (totalBits < 40) return { label: 'very weak', color: 'text-neutral-400' };
  if (totalBits < 60) return { label: 'weak', color: 'text-neutral-300' };
  if (totalBits < 80) return { label: 'medium strength', color: 'text-neutral-200' };
  return { label: 'cryptographically strong', color: 'text-white' };
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

