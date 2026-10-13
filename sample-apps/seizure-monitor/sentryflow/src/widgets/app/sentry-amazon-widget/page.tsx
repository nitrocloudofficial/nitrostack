'use client';

import { useTheme, useWidgetSDK, useMaxHeight } from '@nitrostack/widgets';
import { useState, useEffect, useRef } from 'react';

export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FraudSignal {
  name: string;
  weight: number;
  triggered: boolean;
  detail: string;
}

interface WidgetData {
  orderId?: string;
  claimValueINR?: number;
  score?: number;
  fraudScore?: number;
  investigationResult?: {
    orderId: string;
    claimValueINR: number;
    fraudScore: number;
    recipientEmail?: string;
  };
  signals?: FraudSignal[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SIGNAL_META: Record<string, { label: string; icon: string }> = {
  weight_mismatch: { label: 'Weight Mismatch', icon: '⚖️' },
  return_velocity: { label: 'High Return Velocity', icon: '📈' },
  courier_seal_flag: { label: 'Courier Seal Flag', icon: '📦' },
  legitimate_return_indicator: { label: 'Fairness Check', icon: '🔍' },
};

function getScoreColor(score: number): { ring: string; text: string; bg: string; badge: string } {
  if (score >= 80) return {
    ring: '#ef4444',
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    badge: 'HIGH RISK',
  };
  if (score >= 50) return {
    ring: '#f59e0b',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    badge: 'MEDIUM RISK',
  };
  return {
    ring: '#10b981',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    badge: 'LOW RISK',
  };
}

function getRecommendation(score: number, signals: FraudSignal[]) {
  const triggered = signals.filter(s => s.triggered && s.weight > 0);
  const reasons = triggered.map(s => s.detail);

  if (score >= 80) return { title: 'Manual Review Required', reasons, level: 'critical' as const };
  if (score >= 50) return { title: 'Hold for Human Review', reasons, level: 'warning' as const };
  return { title: 'Auto-Clear Eligible', reasons: ['Score below fraud threshold', 'No critical signals triggered'], level: 'safe' as const };
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="min-h-[400px] flex items-center justify-center bg-[#0a0c10]">
      <div className="text-center space-y-4 animate-fade-in">
        <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm font-medium">Connecting to SentryFlow...</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="min-h-[400px] flex items-center justify-center bg-[#0a0c10]">
      <div className="text-center space-y-3 animate-fade-in px-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto">
          <span className="text-2xl">🛡️</span>
        </div>
        <h3 className="text-slate-200 font-semibold">No Incident Data</h3>
        <p className="text-slate-500 text-sm max-w-xs">Run <code className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded text-xs font-mono">audit_amazon_incident</code> to load an incident here.</p>
      </div>
    </div>
  );
}

// Circular progress ring
function ScoreRing({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const colors = getScoreColor(score);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, [score]);

  const offset = animated ? circ * (1 - score / 100) : circ;

  return (
    <div className="relative w-[100px] h-[100px] flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="absolute inset-0">
        {/* Track */}
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke="#1e2534"
          strokeWidth="8"
        />
        {/* Progress */}
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={colors.ring}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="progress-ring-circle"
          style={{ filter: `drop-shadow(0 0 6px ${colors.ring}80)` }}
        />
      </svg>
      <div className="relative z-10 text-center">
        <div className={`text-2xl font-bold ${colors.text}`}>{score}%</div>
        <div className="text-[10px] text-slate-500 font-medium mt-0.5 tracking-wide">FRAUD</div>
      </div>
    </div>
  );
}

// Signal row
function SignalRow({ signal, index }: { signal: FraudSignal; index: number }) {
  const meta = SIGNAL_META[signal.name] || { label: signal.name.replace(/_/g, ' '), icon: '•' };
  const isFairness = signal.weight < 0;

  let statusIcon: string;
  let rowStyle: string;
  let badgeStyle: string;
  let badgeText: string;

  if (isFairness) {
    if (signal.triggered) {
      statusIcon = '🟢';
      rowStyle = 'border-emerald-500/20 bg-emerald-500/5';
      badgeStyle = 'text-emerald-400 bg-emerald-500/10';
      badgeText = 'CLEARED';
    } else {
      statusIcon = '⚪';
      rowStyle = 'border-slate-700/50 bg-slate-800/30';
      badgeStyle = 'text-slate-400 bg-slate-700/40';
      badgeText = 'N/A';
    }
  } else if (signal.triggered) {
    statusIcon = '🔴';
    rowStyle = 'border-red-500/20 bg-red-500/5';
    badgeStyle = 'text-red-400 bg-red-500/10';
    badgeText = 'TRIGGERED';
  } else {
    statusIcon = '🟢';
    rowStyle = 'border-emerald-500/20 bg-emerald-500/5';
    badgeStyle = 'text-emerald-400 bg-emerald-500/10';
    badgeText = 'CLEAR';
  }

  return (
    <div
      className={`border rounded-lg p-3 flex items-start gap-3 transition-all animate-fade-in ${rowStyle}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className="text-base mt-0.5 shrink-0">{statusIcon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
            <span>{meta.icon}</span>
            <span>{meta.label}</span>
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badgeStyle}`}>
            {badgeText}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{signal.detail}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="h-1 flex-1 rounded-full bg-slate-700/50 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                isFairness ? 'bg-emerald-500' : signal.triggered ? 'bg-red-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.abs(signal.weight) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 shrink-0 font-mono">
            {isFairness ? '-' : '+'}{Math.round(Math.abs(signal.weight) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// Timeline
const TIMELINE_STEPS = [
  { label: 'Order Shipped', icon: '📤' },
  { label: 'Return Requested', icon: '↩️' },
  { label: 'Courier Inspection', icon: '🔎' },
  { label: 'AI Investigation', icon: '🤖' },
  { label: 'Human Review', icon: '👤' },
];

function Timeline({ score }: { score: number }) {
  const activeStep = score >= 80 ? 4 : score >= 50 ? 3 : 3;

  return (
    <div className="relative">
      <div className="absolute left-[19px] top-6 bottom-6 w-px bg-slate-700/60" />
      <div className="space-y-3">
        {TIMELINE_STEPS.map((step, i) => {
          const isDone = i < activeStep;
          const isActive = i === activeStep;

          return (
            <div
              key={i}
              className="flex items-center gap-3 animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm z-10 border transition-all ${
                  isDone
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : isActive
                    ? 'bg-blue-500/20 border-blue-500/60 text-blue-400 ring-2 ring-blue-500/20 animate-pulse-ring'
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}
              >
                {isDone ? '✓' : step.icon}
              </div>
              <div>
                <p className={`text-sm font-medium ${isDone ? 'text-emerald-400' : isActive ? 'text-blue-300' : 'text-slate-500'}`}>
                  {step.label}
                </p>
                {isActive && (
                  <p className="text-[11px] text-blue-400/70 mt-0.5">In progress…</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Audit log row
function AuditLogTable({ entries }: { entries: Array<{ timestamp: string; action: string; result: string }> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-700/50">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-800/60 border-b border-slate-700/50">
            <th className="px-3 py-2 text-left text-slate-400 font-medium">Timestamp</th>
            <th className="px-3 py-2 text-left text-slate-400 font-medium">Action</th>
            <th className="px-3 py-2 text-left text-slate-400 font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i} className="border-b border-slate-700/30 last:border-0 hover:bg-slate-800/40 transition-colors">
              <td className="px-3 py-2 text-slate-400 font-mono">{formatTimestamp(e.timestamp)}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  e.action === 'audit' ? 'bg-blue-500/10 text-blue-400' :
                  e.action === 'dispatch' ? 'bg-emerald-500/10 text-emerald-400' :
                  'bg-red-500/10 text-red-400'
                }`}>{e.action}</span>
              </td>
              <td className="px-3 py-2 text-slate-300">{e.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export default function SentryAmazonWidget() {
  const theme = useTheme();
  const maxHeight = useMaxHeight();
  const { isReady, getToolOutput, callTool } = useWidgetSDK();

  const data = getToolOutput<WidgetData>();

  const [actionState, setActionState] = useState<'idle' | 'loading' | 'approved' | 'escalated' | 'rejected' | 'error'>('idle');
  const [auditOpen, setAuditOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const safeData = {
    orderId: data?.orderId ?? data?.investigationResult?.orderId ?? '',
    claimValueINR: data?.claimValueINR ?? data?.investigationResult?.claimValueINR ?? 0,
    score: data?.score ?? data?.fraudScore ?? data?.investigationResult?.fraudScore ?? 0,
    signals: data?.signals ?? [],
    recipientEmail: data?.investigationResult?.recipientEmail ?? 'judge@example.com',
  };

  // Derived audit log from signals (simulated from data)
  const auditEntries = [
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      action: 'audit',
      result: `Fraud score: ${safeData.score}%, ${safeData.signals.filter(s => s.triggered).length} signals triggered`,
    },
    {
      timestamp: new Date(Date.now() - 60000).toISOString(),
      action: 'guard_block',
      result: `Auto-dispatch blocked — claim ₹${safeData.claimValueINR.toLocaleString('en-IN')} requires human review`,
    },
  ];

  const handleAction = async (type: 'approve' | 'escalate' | 'reject') => {
    if (!data || actionState === 'loading') return;
    setActionState('loading');
    setActiveAction(type);

    try {
      if (type === 'approve') {
        await callTool('dispatch_safet_claim', {
          investigationResult: {
            orderId: safeData.orderId,
            claimValueINR: safeData.claimValueINR,
            fraudScore: safeData.score,
            recipientEmail: safeData.recipientEmail,
          },
        });
        setActionState('approved');
      } else if (type === 'escalate') {
        await new Promise(r => setTimeout(r, 800));
        setActionState('escalated');
      } else {
        await new Promise(r => setTimeout(r, 800));
        setActionState('rejected');
      }
    } catch {
      setActionState('error');
    }
  };

  if (!isReady) return <LoadingState />;
  if (!safeData.orderId) return <EmptyState />;

  const colors = getScoreColor(safeData.score);
  const rec = getRecommendation(safeData.score, safeData.signals);

  const containerStyle: React.CSSProperties = {
    maxHeight: maxHeight ? `${maxHeight}px` : '900px',
    overflowY: 'auto',
  };

  return (
    <div className="bg-[#0a0c10] text-slate-200 scrollbar-hide" style={containerStyle}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-[#0a0c10]/95 backdrop-blur-sm border-b border-slate-800 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-glow shrink-0">
              <span className="text-lg">🛡️</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100 tracking-tight">SentryFlow</h1>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase">Incident Review</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider ${colors.bg} ${colors.text} border ${
            safeData.score >= 80 ? 'border-red-500/20' : safeData.score >= 50 ? 'border-amber-500/20' : 'border-emerald-500/20'
          }`}>
            {colors.badge}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* ── Order Metadata ────────────────────────────────────────── */}
        <div className="bg-[#10131a] border border-slate-800 rounded-xl p-4 animate-fade-in shadow-card">
          <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Incident Details</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Order ID', value: safeData.orderId, mono: true },
              { label: 'Claim Amount', value: formatINR(safeData.claimValueINR), highlight: true },
              { label: 'Marketplace', value: 'Amazon India', icon: '🇮🇳' },
              { label: 'Signals', value: `${safeData.signals.filter(s => s.triggered && s.weight > 0).length} / ${safeData.signals.filter(s => s.weight > 0).length} triggered` },
            ].map((row, i) => (
              <div key={i} className="space-y-0.5">
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{row.label}</p>
                <p className={`text-sm font-semibold ${
                  row.highlight ? colors.text : 'text-slate-200'
                } ${row.mono ? 'font-mono text-xs' : ''}`}>
                  {row.icon && <span className="mr-1">{row.icon}</span>}
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Score + Recommendation ────────────────────────────────── */}
        <div className="bg-[#10131a] border border-slate-800 rounded-xl p-4 animate-fade-in animate-delay-100 shadow-card">
          <div className="flex items-center gap-5">
            <ScoreRing score={safeData.score} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold mb-1">AI Recommendation</p>
              <h3 className={`text-base font-bold ${colors.text} leading-tight`}>{rec.title}</h3>
              <div className="mt-2 space-y-1">
                {rec.reasons.slice(0, 2).map((r, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-slate-600 mt-0.5 shrink-0">›</span>
                    <p className="text-xs text-slate-400 leading-relaxed">{r}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Fraud Signals ─────────────────────────────────────────── */}
        <div className="bg-[#10131a] border border-slate-800 rounded-xl p-4 animate-fade-in animate-delay-200 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fraud Signals</h2>
            <span className="text-[10px] text-slate-600 font-mono">
              {safeData.signals.filter(s => s.triggered && s.weight > 0).length}/{safeData.signals.filter(s => s.weight > 0).length} active
            </span>
          </div>
          <div className="space-y-2">
            {safeData.signals.map((sig, i) => (
              <SignalRow key={sig.name} signal={sig} index={i} />
            ))}
          </div>
        </div>

        {/* ── Timeline ──────────────────────────────────────────────── */}
        <div className="bg-[#10131a] border border-slate-800 rounded-xl p-4 animate-fade-in animate-delay-300 shadow-card">
          <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">Investigation Timeline</h2>
          <Timeline score={safeData.score} />
        </div>

        {/* ── Action Buttons ────────────────────────────────────────── */}
        {actionState === 'idle' || actionState === 'loading' ? (
          <div className="bg-[#10131a] border border-slate-800 rounded-xl p-4 animate-fade-in animate-delay-400 shadow-card">
            <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Reviewer Decision</h2>
            <div className="grid grid-cols-3 gap-2">
              {/* Approve */}
              <button
                onClick={() => handleAction('approve')}
                disabled={actionState === 'loading'}
                className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold text-xs hover:bg-emerald-500/20 hover:border-emerald-500/50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                {actionState === 'loading' && activeAction === 'approve'
                  ? <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                  : <span className="text-lg group-hover:scale-110 transition-transform">✅</span>
                }
                <span>Approve</span>
              </button>

              {/* Escalate */}
              <button
                onClick={() => handleAction('escalate')}
                disabled={actionState === 'loading'}
                className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 font-semibold text-xs hover:bg-amber-500/20 hover:border-amber-500/50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                {actionState === 'loading' && activeAction === 'escalate'
                  ? <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
                  : <span className="text-lg group-hover:scale-110 transition-transform">⚠️</span>
                }
                <span>Escalate</span>
              </button>

              {/* Reject */}
              <button
                onClick={() => handleAction('reject')}
                disabled={actionState === 'loading'}
                className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 font-semibold text-xs hover:bg-red-500/20 hover:border-red-500/50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                {actionState === 'loading' && activeAction === 'reject'
                  ? <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-400 rounded-full animate-spin" />
                  : <span className="text-lg group-hover:scale-110 transition-transform">❌</span>
                }
                <span>Reject</span>
              </button>
            </div>
          </div>
        ) : (
          /* ── Decision Result ──────────────────────────────────── */
          <div className={`rounded-xl p-4 border animate-scale-in shadow-card ${
            actionState === 'approved' ? 'bg-emerald-500/10 border-emerald-500/30' :
            actionState === 'escalated' ? 'bg-amber-500/10 border-amber-500/30' :
            actionState === 'rejected' ? 'bg-red-500/10 border-red-500/30' :
            'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {actionState === 'approved' ? '✅' : actionState === 'escalated' ? '⚠️' : actionState === 'rejected' ? '❌' : '⚠️'}
              </span>
              <div>
                <p className={`font-bold text-sm ${
                  actionState === 'approved' ? 'text-emerald-400' :
                  actionState === 'escalated' ? 'text-amber-400' :
                  actionState === 'rejected' ? 'text-red-400' : 'text-red-400'
                }`}>
                  {actionState === 'approved' ? 'Claim Approved & Email Dispatched' :
                   actionState === 'escalated' ? 'Case Escalated to Senior Review' :
                   actionState === 'rejected' ? 'Claim Rejected' : 'Action Failed — Try Again'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {actionState === 'approved' ? `Safe-T Claim email sent for order ${safeData.orderId}` :
                   actionState === 'escalated' ? 'Forwarded to fraud investigation team' :
                   actionState === 'rejected' ? 'Return claim has been denied' : 'An error occurred during dispatch'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Audit Log ─────────────────────────────────────────────── */}
        <div className="bg-[#10131a] border border-slate-800 rounded-xl overflow-hidden animate-fade-in animate-delay-500 shadow-card">
          <button
            onClick={() => setAuditOpen(o => !o)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Audit Log</span>
              <span className="text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full font-mono">{auditEntries.length} entries</span>
            </div>
            <span className={`text-slate-500 text-xs transition-transform duration-200 ${auditOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {auditOpen && (
            <div className="border-t border-slate-800 p-3 animate-fade-in">
              {auditEntries.length > 0
                ? <AuditLogTable entries={auditEntries} />
                : <p className="text-xs text-slate-500 text-center py-4">No audit entries yet.</p>
              }
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div className="text-center pb-2">
          <p className="text-[10px] text-slate-700 font-medium">
            Powered by <span className="text-slate-600">SentryFlow</span> · AI-Assisted Fraud Detection
          </p>
        </div>

      </div>
    </div>
  );
}
