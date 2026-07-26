'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

/**
 * Scenario Compare widget — the What-If money shot.
 * Baseline vs scenario side-by-side: outcome flip, FOIR movement, amount delta.
 * Renders output of `simulate_scenario`.
 */

interface Aff { foir: number; proposed_emi: number; net_income: number; existing_emi: number }
interface Dec { outcome: string; max_amount: number; score: number; reason_codes: string[] }
interface SimOut {
  baseline: { affordability: Aff; decision: Dec };
  scenario: { affordability: Aff; decision: Dec; levers: Record<string, number> };
  delta: { outcome_changed: boolean; outcome: string; max_amount_change: number; foir_change_pct: number; summary: string };
}

const OUT_COLOR: Record<string, string> = { APPROVE: '#10b981', CONDITIONAL: '#f59e0b', DECLINE: '#ef4444' };
const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');
const LEVER_LABEL: Record<string, string> = {
  net_income: 'Monthly income',
  tenure_months: 'Tenure (months)',
  requested_amount: 'Requested amount',
  close_existing_emi: 'Existing EMI closed',
};

export default function ScenarioCompare() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const d = getToolOutput<SimOut>();
  const isDark = theme === 'dark';

  const fg = isDark ? '#f5f5f5' : '#111827';
  const muted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const card = isDark ? '#111827' : '#ffffff';
  const line = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  if (!d) return <div style={{ padding: 24, textAlign: 'center' }}>Simulating…</div>;

  const col = (title: string, dec: Dec, aff: Aff, highlight: boolean) => {
    const c = OUT_COLOR[dec.outcome] ?? '#6b7280';
    const foirPct = Math.round(aff.foir * 100);
    return (
      <div style={{ flex: 1, minWidth: 190, padding: 14, borderRadius: 12, background: card, border: `2px solid ${highlight ? c : line}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: muted, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: c, marginBottom: 6 }}>{dec.outcome}</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{inr(dec.max_amount)}</div>
        {/* FOIR bar with 55% cap line */}
        <div style={{ marginTop: 10, fontSize: 11, color: muted }}>FOIR {foirPct}% <span style={{ opacity: 0.7 }}>(cap 55%)</span></div>
        <div style={{ position: 'relative', height: 8, borderRadius: 999, background: line, marginTop: 4 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: 8, borderRadius: 999, width: `${Math.min(100, foirPct)}%`, background: foirPct > 55 ? '#ef4444' : '#10b981', transition: 'width 0.5s ease' }} />
          <div style={{ position: 'absolute', left: '55%', top: -2, width: 2, height: 12, background: '#ef4444' }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: muted }}>score {dec.score} · EMI {inr(aff.proposed_emi)}</div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 640, fontFamily: 'system-ui, sans-serif', color: fg }}>
      {/* levers */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {Object.entries(d.scenario.levers).map(([k, v]) => (
          <span key={k} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'rgba(59,130,246,0.14)', color: '#3b82f6', fontWeight: 600 }}>
            {LEVER_LABEL[k] ?? k}: {k === 'tenure_months' ? v : inr(v)}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', flexWrap: 'wrap' }}>
        {col('TODAY', d.baseline.decision, d.baseline.affordability, false)}
        <div style={{ alignSelf: 'center', fontSize: 22, color: muted }}>→</div>
        {col('WHAT-IF', d.scenario.decision, d.scenario.affordability, true)}
      </div>

      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: d.delta.outcome_changed ? 'rgba(16,185,129,0.12)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'), fontSize: 13, lineHeight: 1.5 }}>
        {d.delta.outcome_changed ? '✨ ' : ''}{d.delta.summary}
      </div>

      <div style={{ fontSize: 10, color: muted, marginTop: 8 }}>Same rules, one lever moved — decisions are deterministic and fully explainable.</div>
    </div>
  );
}
