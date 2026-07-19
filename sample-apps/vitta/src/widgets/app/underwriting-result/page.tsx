'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

/**
 * Underwriting Result widget — FOIR gauge + explainable reason checklist.
 * Renders the Decision from the `underwrite` tool.
 */

interface Decision {
  outcome: 'APPROVE' | 'CONDITIONAL' | 'DECLINE';
  max_amount: number;
  rate_band: { min: number; max: number };
  tenure_range: { min: number; max: number };
  score: number;
  reason_codes: string[];
  explanations: string[];
}

const OUTCOME_STYLE: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  APPROVE: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '✓', label: 'Approved' },
  CONDITIONAL: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '⏸', label: 'Conditional — human review' },
  DECLINE: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: '✕', label: 'Not approved right now' },
};

const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function UnderwritingResult() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const d = getToolOutput<Decision>();
  const isDark = theme === 'dark';

  if (!d) return <div style={{ padding: 24, textAlign: 'center' }}>Loading decision…</div>;

  const s = OUTCOME_STYLE[d.outcome] ?? OUTCOME_STYLE.CONDITIONAL;
  const fg = isDark ? '#f5f5f5' : '#111827';
  const muted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const card = isDark ? '#111827' : '#ffffff';
  const line = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  // score arc 0..100
  const pct = Math.max(0, Math.min(100, d.score));
  const R = 52, C = Math.PI * R; // half-circle
  const dash = (pct / 100) * C;

  return (
    <div style={{ maxWidth: 460, padding: 20, borderRadius: 16, background: card, color: fg, border: `1px solid ${line}`, boxShadow: '0 8px 28px rgba(0,0,0,0.18)', fontFamily: 'system-ui, sans-serif' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>{s.icon}</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: s.color }}>{s.label}</div>
          <div style={{ fontSize: 12, color: muted }}>Rules + scorecard + reason codes — no black box</div>
        </div>
      </div>

      {/* gauge + numbers */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 14 }}>
        <svg width={128} height={78} viewBox="0 0 128 78">
          <path d="M 12 70 A 52 52 0 0 1 116 70" fill="none" stroke={line} strokeWidth={12} strokeLinecap="round" />
          <path d="M 12 70 A 52 52 0 0 1 116 70" fill="none" stroke={s.color} strokeWidth={12} strokeLinecap="round"
            strokeDasharray={`${dash} ${C}`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
          <text x={64} y={58} textAnchor="middle" fontSize={22} fontWeight={800} fill={fg}>{d.score}</text>
          <text x={64} y={73} textAnchor="middle" fontSize={10} fill={muted}>score / 100 · approve ≥60</text>
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: muted }}>Eligible amount</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{inr(d.max_amount)}</div>
          {d.outcome !== 'DECLINE' && (
            <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>
              {d.rate_band.min}%–{d.rate_band.max}% p.a. · {d.tenure_range.min}–{d.tenure_range.max} months
            </div>
          )}
        </div>
      </div>

      {/* reason checklist */}
      <div style={{ borderTop: `1px solid ${line}`, paddingTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: muted, marginBottom: 8 }}>WHY — EVERY REASON, IN PLAIN WORDS</div>
        {d.explanations.slice(0, 4).map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13, lineHeight: 1.45 }}>
            <span style={{ color: s.color, fontWeight: 700 }}>{d.outcome === 'APPROVE' ? '✓' : '⚠'}</span>
            <span>{e}</span>
          </div>
        ))}
        {d.reason_codes.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {d.reason_codes.map((rc) => (
              <span key={rc} style={{ fontSize: 10, fontFamily: 'monospace', padding: '3px 8px', borderRadius: 999, background: s.bg, color: s.color }}>{rc}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 10, color: muted, display: 'flex', justifyContent: 'space-between' }}>
        <span>Vitta · explainable underwriting</span>
        <span>policy v1.7 · scorecard-2026-07</span>
      </div>
    </div>
  );
}
