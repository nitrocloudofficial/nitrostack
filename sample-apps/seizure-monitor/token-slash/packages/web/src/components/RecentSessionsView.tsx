import React, { useState } from 'react';
import { 
  Clock, 
  Search, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Terminal, 
  Layers,
  ChevronRight,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SessionLog {
  id: string;
  timestamp: string;
  status: 'OPTIMIZED' | 'CACHED' | 'BYPASSED';
  latencyMs: number;
  originalTokens: number;
  optimizedTokens: number;
  reductionPercent: number;
  model: string;
  promptSnippet: string;
  rawPayload: object;
}

const mockSessions: SessionLog[] = [
  {
    id: 'req-8849',
    timestamp: '2026-07-26 04:30:12',
    status: 'OPTIMIZED',
    latencyMs: 340,
    originalTokens: 245,
    optimizedTokens: 92,
    reductionPercent: 62.5,
    model: 'gemini-3.5-flash',
    promptSnippet: 'Refactor this React component step by step using Next.js Server Actions and Zod validation...',
    rawPayload: {
      route: '/api/optimize',
      mcpTool: 'history-analyzer',
      status: 200,
      astCompressionRatio: 2.66
    }
  },
  {
    id: 'req-8848',
    timestamp: '2026-07-26 04:22:05',
    status: 'CACHED',
    latencyMs: 45,
    originalTokens: 380,
    optimizedTokens: 110,
    reductionPercent: 71.0,
    model: 'claude-3-5-haiku',
    promptSnippet: 'Analyze customer support ticket transcript and extract key action items...',
    rawPayload: {
      route: '/api/optimize',
      mcpTool: 'model-recommender',
      cacheHit: true,
      status: 200
    }
  },
  {
    id: 'req-8847',
    timestamp: '2026-07-26 04:15:30',
    status: 'OPTIMIZED',
    latencyMs: 410,
    originalTokens: 520,
    optimizedTokens: 185,
    reductionPercent: 64.4,
    model: 'gpt-4o-mini',
    promptSnippet: 'Generate SQL DDL migration script for a multi-tenant PostgreSQL database with row-level security...',
    rawPayload: {
      route: '/api/optimize',
      mcpTool: 'token-estimator',
      status: 200
    }
  }
];

export const RecentSessionsView: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState<SessionLog | null>(null);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Recent Sessions & Audit Trail</h1>
              <p className="text-xs text-slate-400">Inspect real-time request payloads, AST compression ratios, and cache hits.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-[#141A24] px-3.5 py-2 rounded-xl border border-white/[0.08]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>MCP Audit Logging ACTIVE</span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#141A24] border border-white/[0.08] space-y-4">
          <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Recent MCP Server Calls</span>
          </h3>

          <div className="space-y-3">
            {mockSessions.map(session => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedSession?.id === session.id
                    ? 'bg-white/[0.04] border-cyan-500/40'
                    : 'bg-[#0E131A] border-white/[0.04] hover:border-white/[0.1]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-cyan-400 font-bold">{session.id}</span>
                    <span className="text-slate-500">•</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      session.status === 'OPTIMIZED' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                      session.status === 'CACHED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {session.status}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">{session.latencyMs} ms</span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono line-clamp-1">{session.promptSnippet}</p>
                </div>

                <div className="text-right space-y-1 flex-shrink-0">
                  <div className="text-emerald-400 font-mono font-bold text-xs">-{session.reductionPercent}%</div>
                  <div className="text-[10px] font-mono text-slate-500">{session.model}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payload Inspector Drawer */}
        <div className="lg:col-span-1">
          {selectedSession ? (
            <div className="p-5 rounded-2xl bg-[#141A24] border border-cyan-500/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>Payload Inspector</span>
                </h4>
                <span className="text-xs font-mono text-cyan-400">{selectedSession.id}</span>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Timestamp</div>
                <div className="text-xs font-mono text-white">{selectedSession.timestamp}</div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Raw MCP Response</div>
                <pre className="p-3 rounded-xl bg-[#0E131A] border border-white/[0.06] text-[11px] font-mono text-cyan-300 overflow-x-auto">
                  {JSON.stringify(selectedSession.rawPayload, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#141A24]/40 border border-white/[0.06] text-center space-y-2">
              <Eye className="w-6 h-6 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500">Click any session row on the left to inspect raw payload JSON.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
