'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

/**
 * MissionTrace — the glass-box widget for the COMMAND platform.
 * Renders any commander's run: status, the explainable confidence gate, the
 * live mission trace (every reasoning step, tool call, test/verify, deploy),
 * and the resulting diff. Reads the tool output via the Widget SDK, so it works
 * for self_heal, optimize_spend, and any commander returning the same shape.
 */

interface Component { score: number; weight: number; reason: string }
interface Verdict { score: number; threshold: number; autonomous: boolean; components: Record<string, Component> }
interface MissionData {
  status?: string;
  fix_summary?: string;
  summary?: string;
  root_cause?: string;
  verdict?: Verdict | null;
  diff?: string;
  redline?: string;
  application?: string;
  trace?: Array<{ type: string; title: string }>;
}

const ICON: Record<string, string> = {
  'incident.opened': '🚨', 'incident.status': '→', 'agent.thinking': '🧠', 'agent.message': '💬',
  'tool.call': '🔧', 'patch.applied': '📝', 'tests.result': '🧪', 'agent.resolution': '📤',
  'confidence.verdict': '⚖️', 'trust.checked': '🛡️', 'approval.requested': '🙋',
  'referral.requested': '🤝', 'referral.resolved': '✅', 'deploy.promoted': '🚀',
  'deploy.verified': '✅', 'deploy.failed': '❌', 'action.github': '🔗', 'action.wekan': '📋',
  'action.slack': '💬', 'incident.resolved': '🎉', 'incident.escalated': '🆘',
};

export default function MissionTrace() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<MissionData>();

  const isDark = theme === 'dark';
  const bg = isDark ? '#0f1420' : '#ffffff';
  const fg = isDark ? '#e6edf3' : '#0b1220';
  const muted = isDark ? 'rgba(230,237,243,0.6)' : 'rgba(11,18,32,0.6)';
  const card = isDark ? '#161d2b' : '#f5f7fb';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  if (!data) {
    return <div style={{ padding: 24, color: fg, background: bg }}>Waiting for a mission…</div>;
  }

  const resolved = (data.status ?? '').toUpperCase() === 'RESOLVED';
  const statusColor = resolved ? '#10b981' : (data.status === 'ESCALATED' ? '#ef4444' : '#f59e0b');
  const summary = data.fix_summary || data.summary || '';
  const diff = data.diff || data.redline || data.application || '';
  const v = data.verdict;

  return (
    <div style={{ padding: 20, background: bg, color: fg, borderRadius: 16, maxWidth: 560, fontFamily: 'system-ui, sans-serif', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>◉</span>
          <div>
            <div style={{ fontWeight: 700, letterSpacing: 1 }}>SENTINEL · Mission Trace</div>
            <div style={{ fontSize: 12, color: muted }}>{summary || 'Autonomous incident'}</div>
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: statusColor, padding: '4px 10px', borderRadius: 999 }}>
          {data.status ?? '—'}
        </span>
      </div>

      {/* confidence gate */}
      {v && (
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: v.autonomous ? '#10b981' : '#f59e0b' }}>{v.score.toFixed(2)}</span>
            <span style={{ fontSize: 12, color: muted }}>threshold {v.threshold.toFixed(2)} → {v.autonomous ? 'autonomous' : 'needs human'}</span>
          </div>
          {Object.entries(v.components).map(([name, c]) => (
            <div key={name} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted }}>
                <span>{name}</span><span>{Math.round(c.score * 100)}% × {c.weight}</span>
              </div>
              <div style={{ height: 5, background: border, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.round(c.score * 100)}%`, height: '100%', background: '#3b82f6' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* trace */}
      {data.trace && data.trace.length > 0 && (
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 12, marginBottom: 12, maxHeight: 220, overflowY: 'auto' }}>
          {data.trace.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: 12.5 }}>
              <span style={{ width: 18 }}>{ICON[e.type] ?? '•'}</span>
              <span style={{ color: muted, minWidth: 120, fontFamily: 'monospace', fontSize: 11 }}>{e.type}</span>
              <span>{e.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* diff */}
      {diff && (
        <pre style={{ background: isDark ? '#0b0f17' : '#0b1220', color: '#e6edf3', borderRadius: 10, padding: 12, fontSize: 11.5, overflowX: 'auto', margin: 0 }}>
          {diff.split('\n').map((line, i) => {
            const c = line.startsWith('+') && !line.startsWith('+++') ? '#3fb950'
              : line.startsWith('-') && !line.startsWith('---') ? '#f85149'
              : line.startsWith('@@') ? '#a371f7' : '#8b949e';
            return <div key={i} style={{ color: c, whiteSpace: 'pre' }}>{line || ' '}</div>;
          })}
        </pre>
      )}
    </div>
  );
}
