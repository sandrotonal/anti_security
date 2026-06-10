import { useState, useEffect } from 'react';

interface MockFile {
  name: string;
  lang: string;
  path: string;
  code: string;
  leakLine: number;
  secretType: string;
}

const mockFiles: MockFile[] = [
  {
    name: 'supabase.ts',
    lang: 'typescript',
    path: 'src/lib/supabase.ts',
    code: `import { createClient } from '@supabase/supabase-js';\n\nconst supabaseUrl = 'https://xyzcompany.supabase.co';\n\n// CRITICAL: DO NOT COMMIT PRIVILEGED SERVICE KEY\nconst supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service-role-key-xyz-123-abc';\n\nexport const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);`,
    leakLine: 6,
    secretType: 'supabase service_role key'
  },
  {
    name: 'aws_config.py',
    lang: 'python',
    path: 'config/aws_config.py',
    code: `import boto3\n\ndef get_s3_client():\n    # TODO: Migrate credentials to IAM Role instead of hardcoding keys\n    session = boto3.Session(\n        aws_access_key_id="AKIAIOSFODNN7EXAMPLE",\n        aws_secret_access_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"\n    )\n    return session.client('s3')`,
    leakLine: 7,
    secretType: 'aws secret access key'
  },
  {
    name: 'stripe.json',
    lang: 'json',
    path: 'secrets/stripe.json',
    code: `{\n  "environment": "production",\n  "api_version": "2023-10-16",\n  "stripe_publishable_key": "pk_test_51N...",\n  "stripe_secret_key": "sk_test_51N34ghJkL90AcdSfErtYuiOp789QwAsDfGhJkLop1234"\n}`,
    leakLine: 5,
    secretType: 'stripe live API secret key'
  },
  {
    name: '.env',
    lang: 'shell',
    path: '.env',
    code: `# Server Configuration\nPORT=8080\nDATABASE_URL="postgresql://postgres:root_password_99xYz@db.example.com:5432/prod"\nJWT_SECRET="super-secret-salt-key-string-change-me"`,
    leakLine: 3,
    secretType: 'database credentials URL'
  },
  {
    name: 'main.go',
    lang: 'go',
    path: 'cmd/server/main.go',
    code: `package main\n\nimport "net/http"\n\nconst SlackWebhook = "https://hooks.slack.com/services/T00000000/B00000000/DUMMYSHORTKEY"\n\nfunc main() {\n    // Send server health alerts to slack channel\n    http.Post(SlackWebhook, "application/json", nil)\n}`,
    leakLine: 5,
    secretType: 'slack webhook URL'
  },
  {
    name: 'deploy.yml',
    lang: 'yaml',
    path: '.github/workflows/deploy.yml',
    code: `name: Deploy Service\non: push\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Git Dispatch\n        run: | \n          curl -H "Authorization: token ghp_abc123xyzPersonalAccessTokenKeyHere" https://api.github.com/repos/org/repo/dispatches`,
    leakLine: 9,
    secretType: 'github personal access token'
  }
];

const scanRules = [
  { name: 'aws-access-key-id', regex: /AKIA[A-Z0-9]{16}/ },
  { name: 'aws-secret-access-key', regex: /aws(.{0,20})?[0-9a-zA-Z\/+]{40}/i },
  { name: 'supabase-service-key', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/ },
  { name: 'stripe-secret-key', regex: /sk_(live|test)_[0-9a-zA-Z]{24}/ },
  { name: 'github-pat', regex: /ghp_[a-zA-Z0-9]{36}/ },
  { name: 'slack-incoming-webhook', regex: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9\/]+/ },
  { name: 'db-credentials-url', regex: /postgres(ql)?:\/\/([^:]+):([^@]+)@/ }
];

const autoFixCode = (fileName: string, currentCode: string): string => {
  switch (fileName) {
    case 'supabase.ts':
      return currentCode.replace(
        "const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service-role-key-xyz-123-abc';",
        "// load from environment variables safely\nconst supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';"
      );
    case 'aws_config.py':
      let fixedAws = currentCode.replace(
        'aws_access_key_id="AKIAIOSFODNN7EXAMPLE",',
        'aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),'
      ).replace(
        'aws_secret_access_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"',
        'aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY")'
      );
      if (!fixedAws.includes('import os')) {
        fixedAws = 'import os\n' + fixedAws;
      }
      return fixedAws;
    case 'stripe.json':
      return currentCode.replace(
        '"stripe_secret_key": "sk_test_51N34ghJkL90AcdSfErtYuiOp789QwAsDfGhJkLop1234"',
        '"stripe_secret_key": "process.env.STRIPE_SECRET_KEY"'
      );
    case '.env':
      return currentCode.replace(
        'DATABASE_URL="postgresql://postgres:root_password_99xYz@db.example.com:5432/prod"',
        '# use environment placeholders in committed files\nDATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"'
      );
    case 'main.go':
      let fixedGo = currentCode.replace(
        'const SlackWebhook = "https://hooks.slack.com/services/T00000000/B00000000/DUMMYSHORTKEY"',
        'var SlackWebhook = os.Getenv("SLACK_WEBHOOK_URL")'
      ).replace(
        'http.Post(SlackWebhook',
        'if SlackWebhook != "" {\n        http.Post(SlackWebhook, "application/json", nil)\n    }'
      );
      if (!fixedGo.includes('"os"')) {
        fixedGo = fixedGo.replace('import "net/http"', 'import (\n\t"net/http"\n\t"os"\n)');
      }
      return fixedGo;
    case 'deploy.yml':
      return currentCode.replace(
        'curl -H "Authorization: token ghp_abc123xyzPersonalAccessTokenKeyHere"',
        'curl -H "Authorization: token ${{ secrets.GITHUB_TOKEN }}"'
      );
    default:
      return currentCode;
  }
};

export const SecurifySimulator = () => {
  const [selectedFile, setSelectedFile] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'blocked' | 'bypassed' | 'clean'>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [editableCodes, setEditableCodes] = useState<string[]>(mockFiles.map(f => f.code));

  const [pendingScanResult, setPendingScanResult] = useState<{
    state: 'blocked' | 'bypassed' | 'clean';
    output: string;
    leakLine: number;
  }>({ state: 'clean', output: '', leakLine: -1 });

  const activeFile = mockFiles[selectedFile];

  const handleStartScan = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isScanning) return;

    const currentCode = editableCodes[selectedFile];
    const lines = currentCode.split('\n');
    let foundLeak = false;
    let bypassed = false;
    let matchedRuleName = '';
    let matchedLineIdx = -1;
    let matchedToken = '';

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const hasIgnore = /securify:ignore/i.test(lineText);

      for (const rule of scanRules) {
        const match = rule.regex.exec(lineText);
        if (match) {
          if (hasIgnore) {
            bypassed = true;
          } else {
            foundLeak = true;
            matchedLineIdx = i + 1;
            matchedRuleName = rule.name;
            matchedToken = match[0];
            break;
          }
        }
      }
      if (foundLeak) break;
    }

    let finalState: 'blocked' | 'bypassed' | 'clean' = 'clean';
    let output = '';

    if (foundLeak) {
      finalState = 'blocked';
      output = `[error] high-entropy string matched rule: "${matchedRuleName}"
[file] ${activeFile.path}:L${matchedLineIdx}
[token] "${matchedToken.substring(0, 16)}..."

[action] git commit aborted. remove secrets or bypass with '// securify:ignore'.`;
    } else if (bypassed) {
      finalState = 'bypassed';
      output = `[securify] ✔ bypass active
[file] ${activeFile.path}
[reason] inline comment 'securify:ignore' detected.

[action] git commit passed with warnings.`;
    } else {
      finalState = 'clean';
      output = `[securify] ✔ git commit passed
[status] scanned 1 files, 0 leaks identified.
[engine] local hooks signature match finished.`;
    }

    setPendingScanResult({
      state: finalState,
      output,
      leakLine: matchedLineIdx
    });

    setIsScanning(true);
    setScanState('scanning');
    setProgress(0);
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isScanning) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsScanning(false);
            setScanState(pendingScanResult.state);
            return 100;
          }
          return prev + 25;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isScanning, pendingScanResult]);

  const handleReset = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setScanState('idle');
    setProgress(0);
    setPendingScanResult({ state: 'clean', output: '', leakLine: -1 });
    setEditableCodes(mockFiles.map(f => f.code));
  };

  const handleAutoFix = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isScanning) return;

    const currentCode = editableCodes[selectedFile];
    const fixed = autoFixCode(activeFile.name, currentCode);

    const updated = [...editableCodes];
    updated[selectedFile] = fixed;
    setEditableCodes(updated);

    // Dynamic .env.example generation and download
    let envContent = '';
    switch (activeFile.name) {
      case 'supabase.ts':
        envContent = '# Supabase API Configuration\nSUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here\n';
        break;
      case 'aws_config.py':
        envContent = '# AWS Credentials\nAWS_ACCESS_KEY_ID=your_aws_access_key_id_here\nAWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here\n';
        break;
      case 'stripe.json':
        envContent = '# Stripe Secrets\nSTRIPE_SECRET_KEY=your_stripe_secret_key_here\n';
        break;
      case '.env':
        envContent = '# Database Settings\nDB_USER=postgres\nDB_PASSWORD=your_database_password_here\nDB_HOST=db.example.com\nDB_PORT=5432\nDB_NAME=prod\n\n# JWT Auth\nJWT_SECRET=your_jwt_secret_here\n';
        break;
      case 'main.go':
        envContent = '# Slack Integration\nSLACK_WEBHOOK_URL=your_slack_webhook_url_here\n';
        break;
      case 'deploy.yml':
        envContent = '# GitHub Token\nGITHUB_TOKEN=your_github_token_here\n';
        break;
      default:
        envContent = '# Environment Configurations\nAPI_KEY=your_api_key_here\n';
    }

    try {
      const blob = new Blob([envContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '.env.example';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download .env.example', err);
    }

    const output = `[securify] ✔ git commit passed
[status] scanned 1 files, 0 leaks identified.
[auto-fix] replaced hardcoded credentials with safe environment bindings.
[auto-fix] generated and downloaded .env.example.
[engine] local hooks signature match finished.`;

    setPendingScanResult({
      state: 'clean',
      output,
      leakLine: -1
    });

    setIsScanning(true);
    setScanState('scanning');
    setProgress(0);
  };

  return (
    <section id="platform" className="bg-black py-28 px-6 md:px-12 border-t border-white/5 relative overflow-hidden select-none">
      {/* Visual background lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Title */}
        <div className="max-w-3xl mb-16">
          <span className="inline-block bg-neutral-900 border border-white/10 rounded-full px-4 py-1 text-xs text-neutral-400 lowercase mb-4 tracking-wider">
            how it works
          </span>
          <h2 className="hero-title text-4xl md:text-6xl font-medium tracking-tight text-white lowercase mb-6">
            intercept leaks instantly.
          </h2>
          <p className="text-neutral-400 text-sm md:text-base font-light lowercase max-w-xl leading-relaxed">
            securify runs locally to scan files in milliseconds. try our interactive simulator below to see how it acts as a git pre-commit firewall.
          </p>
        </div>

        {/* Mock IDE Container */}
        <div className="w-full bg-neutral-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-4 px-4 py-3 bg-neutral-900/50 border-b border-white/5">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-3 h-3 rounded-full bg-neutral-800 block"></span>
              <span className="w-3 h-3 rounded-full bg-neutral-800 block"></span>
              <span className="w-3 h-3 rounded-full bg-neutral-800 block"></span>
              <span className="hidden sm:inline text-xs text-neutral-500 font-mono ml-3 lowercase">
                securify-local-sandbox
              </span>
            </div>
            <div className="flex bg-neutral-900 rounded-lg p-0.5 border border-white/5 overflow-x-auto max-w-full scrollbar-none shrink-0">
              {mockFiles.map((file, idx) => (
                <button
                  key={file.name}
                  onClick={() => {
                    setSelectedFile(idx);
                    setScanState('idle');
                    setProgress(0);
                  }}
                  className={`px-3 py-1 text-xs font-mono rounded transition-colors lowercase shrink-0 ${
                    selectedFile === idx
                      ? 'bg-neutral-950 text-white'
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  {file.name}
                </button>
              ))}
            </div>
          </div>

          {/* IDE Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px] lg:min-h-[420px]">
            
            {/* Code Panel (lg:col-span-7) */}
            <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-white/5 font-mono text-[12px] md:text-xs leading-relaxed bg-black/40 flex flex-col min-w-0">
              <div className="text-neutral-500 text-[10px] lowercase mb-4 select-none pb-2 border-b border-white/5 flex justify-between items-center shrink-0">
                 <span>{activeFile.path}</span>
                <span className="text-neutral-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-ping"></span>
                  edit code below to test
                </span>
              </div>
              
              <div className="flex-1 flex gap-4 min-h-[250px] relative">
                {/* Line Numbers Column */}
                <div className="text-neutral-600 w-6 text-right select-none pr-2 border-r border-white/5 font-mono text-[12px] md:text-xs leading-relaxed shrink-0">
                  {editableCodes[selectedFile].split('\n').map((_, idx) => (
                    <div
                      key={idx}
                      className={
                        idx + 1 === pendingScanResult.leakLine && scanState === 'blocked'
                          ? 'text-white font-bold underline decoration-white/30'
                          : ''
                      }
                    >
                      {idx + 1}
                    </div>
                  ))}
                </div>

                {/* Textarea Code Editor */}
                <textarea
                  value={editableCodes[selectedFile]}
                  onChange={(e) => {
                    const updated = [...editableCodes];
                    updated[selectedFile] = e.target.value;
                    setEditableCodes(updated);
                    if (scanState !== 'idle') {
                      setScanState('idle');
                      setProgress(0);
                    }
                  }}
                  spellCheck={false}
                  className="flex-1 bg-transparent text-neutral-300 font-mono text-[12px] md:text-xs leading-relaxed focus:outline-none resize-none overflow-y-auto whitespace-pre break-all select-text"
                  style={{ minHeight: '250px' }}
                />
              </div>

              {/* Live Hint */}
              <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-neutral-500 font-mono lowercase select-none shrink-0">
                💡 <span className="text-neutral-400">tip:</span> add <span className="text-white bg-neutral-900 px-1.5 py-0.5 rounded border border-white/10 font-bold">// securify:ignore</span> to the line with the key, then try committing.
              </div>
            </div>

            {/* Terminal Actions & Output (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col justify-between bg-black/80 font-mono text-xs">
              
              {/* Terminal Viewport */}
              <div className="p-6 flex-1 flex flex-col justify-end text-neutral-400 select-none">
                {scanState === 'idle' && (
                  <div className="space-y-1">
                    <span className="block text-neutral-500">$ git commit -m "add database keys"</span>
                    <span className="block text-neutral-500">_ (click button below to simulate hook execution)</span>
                  </div>
                )}

                {scanState === 'scanning' && (
                  <div className="space-y-1 text-white">
                    <span className="block text-neutral-500">$ git commit -m "add database keys"</span>
                    <span className="block select-none animate-pulse">⠏ running pre-commit hook (securify)...</span>
                    <div className="w-full bg-neutral-950 h-1.5 rounded overflow-hidden mt-3">
                      <div 
                        className="bg-white h-full transition-all duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {scanState === 'blocked' && (
                  <div className="space-y-2 leading-relaxed animate-in fade-in duration-300">
                    <span className="block text-neutral-500">$ git commit -m "add database keys"</span>
                    <span className="block text-neutral-400">⠏ running pre-commit hook (securify)... done [14ms]</span>
                    <span className="block text-white font-medium font-sans text-sm mt-3 select-text">
                      [securify] ❌ commit blocked
                    </span>
                    <pre className="block bg-neutral-950 border border-white/10 p-3 rounded text-[11px] text-neutral-300 whitespace-pre-wrap select-text mb-3">
                      {pendingScanResult.output}
                    </pre>
                    <button
                      onClick={handleAutoFix}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-black hover:bg-neutral-200 border border-white/10 rounded-xl text-xs font-mono font-medium transition-colors lowercase"
                    >
                      ✨ auto-fix credentials
                    </button>
                  </div>
                )}

                {scanState === 'bypassed' && (
                  <div className="space-y-2 leading-relaxed animate-in fade-in duration-300">
                    <span className="block text-neutral-500">$ git commit -m "add database keys"</span>
                    <span className="block text-neutral-400">⠏ running pre-commit hook (securify)... done [18ms]</span>
                    <span className="block text-neutral-300 font-medium font-sans text-sm mt-3 select-text">
                      [securify] ⚠️ bypass active (passed with warnings)
                    </span>
                    <pre className="block bg-neutral-950 border border-white/5 p-3 rounded text-[11px] text-neutral-400 whitespace-pre-wrap select-text">
                      {pendingScanResult.output}
                    </pre>
                  </div>
                )}

                {scanState === 'clean' && (
                  <div className="space-y-2 leading-relaxed animate-in fade-in duration-300">
                    <span className="block text-neutral-500">$ git commit -m "add database keys"</span>
                    <span className="block text-neutral-400">⠏ running pre-commit hook (securify)... done [12ms]</span>
                    <span className="block text-white font-medium font-sans text-sm mt-3 select-text">
                      [securify] ✔ git commit passed
                    </span>
                    <pre className="block bg-neutral-950 border border-white/5 p-3 rounded text-[11px] text-neutral-300 whitespace-pre-wrap select-text">
                      {pendingScanResult.output}
                    </pre>
                  </div>
                )}
              </div>

              {/* Terminal Controls */}
              <div className="p-4 bg-neutral-900/30 border-t border-white/5 flex gap-3 select-none">
                {scanState === 'blocked' ? (
                  <button
                    onClick={handleAutoFix}
                    className="flex-1 bg-white text-black hover:bg-neutral-200 py-3 rounded-xl text-xs font-mono font-medium transition-colors lowercase"
                  >
                    ✨ auto-fix secret
                  </button>
                ) : (
                  <button
                    onClick={handleStartScan}
                    disabled={isScanning}
                    className="flex-1 bg-white text-black hover:bg-neutral-200 py-3 rounded-xl text-xs font-mono font-medium transition-colors disabled:opacity-50 lowercase"
                  >
                    {isScanning ? 'scanning repos...' : 'git commit'}
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="px-4 bg-neutral-900 text-neutral-400 border border-white/5 hover:text-white py-3 rounded-xl text-xs font-mono transition-colors lowercase"
                >
                  reset
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
