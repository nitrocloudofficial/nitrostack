import fs from 'fs';
import path from 'path';

// Define the shape of our audit log
interface AuditLogEntry {
  timestamp: string;
  type: string;
  agent?: string;
  tool?: string;
  input?: any;
  output?: any;
  latencyMs?: number;
  message?: string;
}

// Ensure the page opts out of static generation so it always reads the latest file on refresh
export const dynamic = 'force-dynamic';

export default function Dashboard() {
  let logs: AuditLogEntry[] = [];
  let errorMsg = '';

  try {
    const dataPath = path.join(process.cwd(), '..', '.data', 'audit.json');
    if (fs.existsSync(dataPath)) {
      const fileContent = fs.readFileSync(dataPath, 'utf-8');
      logs = JSON.parse(fileContent);
    }
  } catch (err: any) {
    errorMsg = err.message;
  }

  // Calculate metrics
  const toolCalls = logs.filter(l => l.type === 'tool_result');
  const successes = toolCalls.filter(l => !l.output?.error);
  const errors = toolCalls.filter(l => l.output?.error);
  
  let totalLatency = 0;
  let latencyCount = 0;
  toolCalls.forEach(l => {
    if (typeof l.latencyMs === 'number') {
      totalLatency += l.latencyMs;
      latencyCount++;
    }
  });

  const totalTasks = toolCalls.length;
  const successRate = totalTasks > 0 ? (successes.length / totalTasks) * 100 : 0;
  const avgLatency = latencyCount > 0 ? totalLatency / latencyCount : 0;

  return (
    <main className="min-h-screen bg-neutral-900 text-neutral-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="border-b border-neutral-800 pb-4">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
            NitroStack Agent Dashboard
          </h1>
          <p className="text-neutral-400 mt-2">Live Evaluation & Audit Replay</p>
        </header>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg">
            Failed to read audit log: {errorMsg}
          </div>
        )}

        {/* Live Evaluation Panel */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-neutral-800/50 p-6 rounded-xl border border-neutral-700/50 hover:border-neutral-600 transition-colors">
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">Total Tasks</h3>
            <p className="text-4xl font-semibold text-white">{totalTasks}</p>
          </div>
          <div className="bg-neutral-800/50 p-6 rounded-xl border border-neutral-700/50 hover:border-neutral-600 transition-colors">
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">Success Rate</h3>
            <p className="text-4xl font-semibold text-emerald-400">{successRate.toFixed(1)}%</p>
          </div>
          <div className="bg-neutral-800/50 p-6 rounded-xl border border-neutral-700/50 hover:border-neutral-600 transition-colors">
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">Avg Latency</h3>
            <p className="text-4xl font-semibold text-blue-400">{Math.round(avgLatency)}<span className="text-2xl ml-1 text-neutral-500">ms</span></p>
          </div>
          <div className="bg-neutral-800/50 p-6 rounded-xl border border-neutral-700/50 hover:border-neutral-600 transition-colors">
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">Errors</h3>
            <p className="text-4xl font-semibold text-rose-400">{errors.length}</p>
          </div>
        </section>

        {/* Audit Replay View */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-neutral-200">Execution Audit Log</h2>
          <div className="bg-neutral-800/30 rounded-xl border border-neutral-700 overflow-hidden">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">No logs recorded yet.</div>
            ) : (
              <ul className="divide-y divide-neutral-800">
                {[...logs].reverse().map((log, i) => (
                  <li key={i} className="p-6 hover:bg-neutral-800/50 transition-colors flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-md ${
                          log.type === 'tool_result' ? 'bg-indigo-500/20 text-indigo-300' : 
                          log.type === 'system_error' ? 'bg-rose-500/20 text-rose-300' :
                          'bg-neutral-700 text-neutral-300'
                        }`}>
                          {log.type}
                        </span>
                        {log.tool && (
                          <span className="font-mono text-sm text-neutral-300">
                            Tool: {log.tool}
                          </span>
                        )}
                      </div>
                      <time className="text-xs text-neutral-500 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </time>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      {log.input && (
                        <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800">
                          <p className="text-xs font-medium text-neutral-500 mb-2 uppercase">Input</p>
                          <pre className="text-xs font-mono text-emerald-200/80 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(log.input, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.output && (
                        <div className="bg-neutral-900/50 p-3 rounded border border-neutral-800">
                          <p className="text-xs font-medium text-neutral-500 mb-2 uppercase">Output</p>
                          <pre className={`text-xs font-mono overflow-x-auto whitespace-pre-wrap ${log.output?.error ? 'text-rose-300/80' : 'text-blue-200/80'}`}>
                            {JSON.stringify(log.output, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {log.latencyMs && (
                      <div className="text-xs text-neutral-500 font-mono text-right">
                        Took {log.latencyMs}ms
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
