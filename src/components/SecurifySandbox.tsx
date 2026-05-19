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
  const [code, setCode] = useState<string>(
    `// Paste your configuration or environment variables here to test.\n// Securify runs completely client-side in this playground.\n\nconst databaseUrl = "postgresql://db_user:password@localhost:5432/main";\nconst stripeKey = "sk_test_51N34ghJkL90AcdSfErtYuiOp";`
  );

  const [report, setReport] = useState<ScanReport>({ isSafe: true, leaks: [] });
  const [isDragging, setIsDragging] = useState<boolean>(false);

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
          type: 'stripe live secret key',
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

  return (
    <section className="bg-black min-h-screen py-28 px-6 md:px-12 relative overflow-hidden select-none">
      {/* Background grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#080808_1px,transparent_1px),linear-gradient(to_bottom,#080808_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <span className="inline-block bg-neutral-900 border border-white/10 rounded-full px-4 py-1 text-xs text-neutral-400 lowercase mb-4 tracking-wider">
            developer playground
          </span>
          <h2 className="hero-title text-4xl md:text-5xl font-medium tracking-tight text-white lowercase mb-4">
            interactive leak sandbox.
          </h2>
          <p className="text-neutral-400 text-sm font-light lowercase leading-relaxed max-w-xl">
            test our detection scripts directly in your browser. paste credentials or database connection strings below to see the parser flag credentials in real-time.
          </p>
        </div>

        {/* Editor & Scan Report Grid */}
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
                <label className="text-[10px] font-mono text-neutral-400 hover:text-white cursor-pointer transition-colors underline decoration-white/20">
                  upload local file
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
            
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full flex-1 bg-black/60 p-6 font-mono text-xs md:text-sm text-neutral-300 focus:outline-none resize-none leading-relaxed select-text"
              placeholder="// Paste your credentials code block here, or drag & drop/upload a file to scan..."
            />
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

              <div className="border-t border-white/5 pt-4 mt-6 text-[10px] font-mono text-neutral-600 select-none lowercase leading-normal">
                sandbox engine runs entirely offline on browser threads. data is not sent to external servers.
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
