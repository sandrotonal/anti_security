import { useState, useEffect } from 'react';

interface ScanLog {
  timestamp: string;
  repo: string;
  status: 'passed' | 'failed';
  details: string;
}

export const SecurifyDashboard = () => {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [stats, setStats] = useState({
    totalScanned: 1542091280,
    blockedLeaks: 43012,
    activeHooks: 65120
  });

  const mockRepos = [
    'web-gateway-service',
    'auth-provider-api',
    'payment-engine-v2',
    'analytics-collector',
    'supabase-adapter',
    'admin-portal-dashboard',
    'database-migrator'
  ];

  const mockFailures = [
    { type: 'aws access key', rule: 'sec-001', code: 'AKIAIOSFODNN7EXAMPLE' },
    { type: 'supabase service role key', rule: 'sec-003', code: 'eyJhbGciOiJIUzI1Ni...' },
    { type: 'stripe API key', rule: 'sec-004', code: 'sk_live_51N34ghJk...' },
    { type: 'github token', rule: 'sec-005', code: 'ghp_abc123XYZ...' }
  ];

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const timestamp = new Date().toLocaleTimeString();
      const repo = mockRepos[Math.floor(Math.random() * mockRepos.length)];
      const isFailed = Math.random() < 0.15; // 15% fail rate

      let newLog: ScanLog;
      if (isFailed) {
        const failInfo = mockFailures[Math.floor(Math.random() * mockFailures.length)];
        newLog = {
          timestamp,
          repo,
          status: 'failed',
          details: `❌ scan aborted: found hardcoded ${failInfo.type} [rule ${failInfo.rule}]`
        };
        // Update stats
        setStats(prev => ({
          ...prev,
          totalScanned: prev.totalScanned + 1,
          blockedLeaks: prev.blockedLeaks + 1
        }));
      } else {
        newLog = {
          timestamp,
          repo,
          status: 'passed',
          details: `✔ pre-commit audit passed: zero security signatures matched`
        };
        setStats(prev => ({
          ...prev,
          totalScanned: prev.totalScanned + 1
        }));
      }

      setLogs((prevLogs) => [newLog, ...prevLogs.slice(0, 49)]); // Keep last 50
    }, 1500);

    return () => clearInterval(interval);
  }, [isLive]);

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

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 select-text">
          <div className="bg-neutral-950 border border-white/5 p-6 rounded-2xl">
            <span className="block text-[10px] font-mono text-neutral-500 mb-1 lowercase">
              total files scanned
            </span>
            <span className="block text-2xl md:text-3xl font-semibold tracking-tight text-white font-mono">
              {stats.totalScanned.toLocaleString()}
            </span>
          </div>

          <div className="bg-neutral-950 border border-white/5 p-6 rounded-2xl">
            <span className="block text-[10px] font-mono text-neutral-500 mb-1 lowercase">
              blocked credential leaks
            </span>
            <span className="block text-2xl md:text-3xl font-semibold tracking-tight text-red-500 font-mono">
              {stats.blockedLeaks.toLocaleString()}
            </span>
          </div>

          <div className="bg-neutral-950 border border-white/5 p-6 rounded-2xl">
            <span className="block text-[10px] font-mono text-neutral-500 mb-1 lowercase">
              active local git hooks
            </span>
            <span className="block text-2xl md:text-3xl font-semibold tracking-tight text-neutral-300 font-mono">
              {stats.activeHooks.toLocaleString()}
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
                securify-audit-stream
              </span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setIsLive(!isLive)}
                className={`px-3 py-1 rounded text-[10px] font-mono border transition-all lowercase ${
                  isLive
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                    : 'bg-neutral-900 text-neutral-500 border-white/5 hover:text-white'
                }`}
              >
                {isLive ? '● live streaming' : 'paused'}
              </button>
              <button
                onClick={() => setLogs([])}
                className="px-2 py-1 rounded text-[10px] font-mono bg-neutral-900 text-neutral-400 border border-white/5 hover:text-white transition-colors lowercase"
              >
                clear logs
              </button>
            </div>
          </div>

          {/* Console Output area */}
          <div className="p-6 flex-1 font-mono text-[11px] md:text-xs text-neutral-400 overflow-y-auto space-y-2 select-text">
            {logs.length === 0 ? (
              <div className="text-center text-neutral-600 py-20 select-none lowercase">
                [console] waiting for commit scanner payloads...
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
                  <span className="text-neutral-500 font-medium shrink-0">repo:{log.repo}</span>
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
