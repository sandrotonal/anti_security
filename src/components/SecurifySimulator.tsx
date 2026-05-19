import { useState, useEffect } from 'react';

interface MockFile {
  name: string;
  lang: string;
  path: string;
  code: string;
  leakLine: number;
  secretType: string;
  scanResult: string;
}

export const SecurifySimulator = () => {
  const [selectedFile, setSelectedFile] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'blocked' | 'bypassed'>('idle');
  const [progress, setProgress] = useState<number>(0);

  const mockFiles: MockFile[] = [
    {
      name: 'supabase.ts',
      lang: 'typescript',
      path: 'src/lib/supabase.ts',
      code: `import { createClient } from '@supabase/supabase-js';\n\nconst supabaseUrl = 'https://xyzcompany.supabase.co';\n\n// CRITICAL: DO NOT COMMIT PRIVILEGED SERVICE KEY\nconst supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service-role-key-xyz-123-abc';\n\nexport const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);`,
      leakLine: 6,
      secretType: 'supabase service_role key',
      scanResult: '[error] high-entropy string matched rule: "supabase-service-key"\n[file] src/lib/supabase.ts:L6\n[entropy] 4.82 bits\n\n[action] git commit aborted. remove secrets or use a secure environment file.'
    },
    {
      name: 'aws_config.py',
      lang: 'python',
      path: 'config/aws_config.py',
      code: `import boto3\n\ndef get_s3_client():\n    # TODO: Migrate credentials to IAM Role instead of hardcoding keys\n    session = boto3.Session(\n        aws_access_key_id="AKIAIOSFODNN7EXAMPLE",\n        aws_secret_access_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"\n    )\n    return session.client('s3')`,
      leakLine: 7,
      secretType: 'aws secret access key',
      scanResult: '[error] token matched rule: "aws-secret-access-key"\n[file] config/aws_config.py:L7\n[entropy] 5.12 bits\n\n[action] git commit aborted. remove secrets or use aws credentials manager.'
    },
    {
      name: 'stripe.json',
      lang: 'json',
      path: 'secrets/stripe.json',
      code: `{\n  "environment": "production",\n  "api_version": "2023-10-16",\n  "stripe_publishable_key": "pk_test_51N...",\n  "stripe_secret_key": "sk_test_51N34ghJkL90AcdSfErtYuiOp789QwAsDfGhJkLop1234"\n}`,
      leakLine: 5,
      secretType: 'stripe live API secret key',
      scanResult: '[error] high-entropy token matched rule: "stripe-secret-key"\n[file] secrets/stripe.json:L5\n[entropy] 4.98 bits\n\n[action] git commit aborted. strip keys out of version control.'
    },
    {
      name: '.env',
      lang: 'shell',
      path: '.env',
      code: `# Server Configuration\nPORT=8080\nDATABASE_URL="postgresql://postgres:root_password_99xYz@db.example.com:5432/prod"\nJWT_SECRET="super-secret-salt-key-string-change-me"`,
      leakLine: 3,
      secretType: 'database credentials URL',
      scanResult: '[error] connection string contains password matched rule: "db-password"\n[file] .env:L3\n[entropy] 4.54 bits\n\n[action] git commit aborted. environment configurations must not be tracked.'
    },
    {
      name: 'main.go',
      lang: 'go',
      path: 'cmd/server/main.go',
      code: `package main\n\nimport "net/http"\n\nconst SlackWebhook = "https://hooks.slack.com/services/PLACEHOLDER/PLACEHOLDER/PLACEHOLDER"\n\nfunc main() {\n    // Send server health alerts to slack channel\n    http.Post(SlackWebhook, "application/json", nil)\n}`,
      leakLine: 5,
      secretType: 'slack webhook URL',
      scanResult: '[error] web hook match rule: "slack-incoming-webhook"\n[file] cmd/server/main.go:L5\n[entropy] 4.21 bits\n\n[action] git commit aborted. migrate slack webhooks to secure secrets store.'
    },
    {
      name: 'deploy.yml',
      lang: 'yaml',
      path: '.github/workflows/deploy.yml',
      code: `name: Deploy Service\non: push\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Git Dispatch\n        run: | \n          curl -H "Authorization: token ghp_abc123xyzPersonalAccessTokenKeyHere" https://api.github.com/repos/org/repo/dispatches`,
      leakLine: 9,
      secretType: 'github personal access token',
      scanResult: '[error] personal access token matched rule: "github-pat"\n[file] .github/workflows/deploy.yml:L9\n[entropy] 4.76 bits\n\n[action] git commit aborted. use GitHub Action Repository Secrets instead.'
    }
  ];

  const handleStartScan = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isScanning) return;
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
            setScanState('blocked');
            return 100;
          }
          return prev + 25; // 4 steps
        });
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  const activeFile = mockFiles[selectedFile];

  return (
    <section id="platform" className="bg-black py-28 px-6 md:px-12 border-t border-white/5 relative overflow-hidden">
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
            <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-white/5 font-mono text-[12px] md:text-xs leading-relaxed overflow-x-auto bg-black/40 min-w-0">
              <div className="text-neutral-500 text-[10px] lowercase mb-4 select-none pb-2 border-b border-white/5 flex justify-between items-center">
                <span>{activeFile.path}</span>
                <span className="text-yellow-500/80 font-mono">⚠️ contains api credentials</span>
              </div>
              <pre className="select-text">
                {activeFile.code.split('\n').map((line, idx) => {
                  const isLeakLine = idx + 1 === activeFile.leakLine;
                  return (
                    <div
                      key={idx}
                      className={`flex gap-4 px-2 -mx-2 min-w-0 ${
                        isLeakLine && scanState === 'blocked'
                          ? 'bg-red-950/20 text-red-400 border-l-2 border-red-500 font-medium'
                          : 'text-neutral-300'
                      }`}
                    >
                      <span className="text-neutral-600 w-5 text-right select-none shrink-0">{idx + 1}</span>
                      <span className="whitespace-pre-wrap break-all min-w-0 flex-1">{line}</span>
                    </div>
                  );
                })}
              </pre>
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
                    <div className="w-full bg-neutral-900 h-1.5 rounded overflow-hidden mt-3">
                      <div 
                        className="bg-white h-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {scanState === 'blocked' && (
                  <div className="space-y-2 leading-relaxed animate-in fade-in duration-300">
                    <span className="block text-neutral-500">$ git commit -m "add database keys"</span>
                    <span className="block text-neutral-400">⠏ running pre-commit hook (securify)... done [14ms]</span>
                    <span className="block text-red-500 font-medium font-sans text-sm mt-3 select-text">
                      [securify] ❌ commit blocked
                    </span>
                    <pre className="block bg-neutral-950 border border-white/5 p-3 rounded text-[11px] text-red-400/90 whitespace-pre-wrap select-text">
                      {activeFile.scanResult}
                    </pre>
                  </div>
                )}
              </div>

              {/* Terminal Controls */}
              <div className="p-4 bg-neutral-900/30 border-t border-white/5 flex gap-3 select-none">
                <button
                  onClick={handleStartScan}
                  disabled={isScanning}
                  className="flex-1 bg-white text-black hover:bg-neutral-200 py-3 rounded-xl text-xs font-mono font-medium transition-colors disabled:opacity-50 lowercase"
                >
                  {isScanning ? 'scanning repos...' : 'git commit'}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setScanState('idle');
                    setProgress(0);
                  }}
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
