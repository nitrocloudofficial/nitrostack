'use client';

import { useTheme, useWidgetSDK, useWidgetState } from '@nitrostack/widgets';
import {
  Empty,
  Panel,
  Pill,
  ScoreGauge,
  SectionTitle,
  Stat,
  bandColor,
  bandLabel,
  money,
  palette,
} from '../_shared/ui';

interface ReasonCode {
  code: string;
  label: string;
  points: number;
  maxPoints: number;
  impact: 'positive' | 'neutral' | 'negative';
  explanation: string;
}

interface PolicyFlag {
  code: string;
  label: string;
  explanation: string;
}

interface DecisionData {
  applicationId?: string;
  businessName?: string;
  industry?: string;
  status?: string;
  decision?: {
    score: number;
    rawScore: number;
    anomalyPenalty: number;
    band: string;
    bandReason: string;
    summary: string;
    nextAction: string;
    policyVersion: string;
    reasonCodes: ReasonCode[];
    hardBlockers: PolicyFlag[];
    softFlags: PolicyFlag[];
    credit: {
      recommendedLimit: number;
      bindingConstraint: string;
      explanation: string;
      requestedAmount?: number;
      requestCoverage?: number;
    };
  };
  metrics?: {
    avgMonthlyInflow: number;
    netMonthlyCashFlow: number;
    daysCashOnHand: number;
    revenueStability: number;
    nsfCount: number;
    monthsObserved: number;
    anomalies: Array<{ code: string; severity: string; description: string }>;
  };
  stripe?: { onboardingUrl: string; accountId: string; simulated: boolean };
  stripeSkippedReason?: string;
  provenance?: { dataSource?: string; institutionName?: string; transactionsAnalyzed?: number };
  timing?: { elapsedMs: number; comparison: string };
}

export default function OnboardingDecision() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ showAll: boolean }>(() => ({ showAll: false }));

  const data = getToolOutput<DecisionData>();
  const p = palette(theme === 'dark');

  if (!data?.decision) {
    return (
      <div style={{ padding: 16, background: p.bg }}>
        <Empty p={p} message="Waiting for a scored application…" />
      </div>
    );
  }

  const d = data.decision;
  const m = data.metrics;
  const color = bandColor(d.band, p);
  const showAll = state?.showAll ?? false;

  const sortedReasons = [...d.reasonCodes].sort(
    (a, b) => b.maxPoints - a.maxPoints - (b.points - a.points) * 0.001,
  );
  const visibleReasons = showAll ? sortedReasons : sortedReasons.slice(0, 4);

  return (
    <div
      style={{
        background: p.bg,
        color: p.text,
        padding: 16,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: 780,
      }}
    >
      {/* ---------- Header ---------- */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 680, lineHeight: 1.25 }}>
            {data.businessName ?? 'Application'}
          </div>
          <div style={{ fontSize: 12, color: p.muted, marginTop: 3 }}>
            {data.industry ? `${data.industry} · ` : ''}
            {data.applicationId}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '6px 12px',
              borderRadius: 999,
              background: `${color}1f`,
              border: `1px solid ${color}66`,
            }}
          >
            <span style={{ width: 9, height: 9, borderRadius: 999, background: color }} />
            <span style={{ fontWeight: 700, fontSize: 13, color }}>{d.band}</span>
          </div>
          <div style={{ fontSize: 11, color: p.muted, marginTop: 5 }}>{bandLabel(d.band)}</div>
        </div>
      </div>

      {/* ---------- Score + credit ---------- */}
      <Panel p={p} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <ScoreGauge score={d.score} band={d.band} p={p} />

          <div style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle p={p}>Recommended credit limit</SectionTitle>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: d.credit.recommendedLimit > 0 ? p.text : p.muted,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1,
              }}
            >
              {money(d.credit.recommendedLimit)}
            </div>
            <div style={{ fontSize: 12, color: p.muted, marginTop: 6, lineHeight: 1.5 }}>
              {d.credit.explanation}
            </div>

            {d.credit.requestedAmount !== undefined && (
              <div style={{ marginTop: 10 }}>
                <Pill
                  p={p}
                  color={(d.credit.requestCoverage ?? 0) >= 1 ? p.green : p.yellow}
                >
                  {money(d.credit.requestedAmount)} requested ·{' '}
                  {Math.round((d.credit.requestCoverage ?? 0) * 100)}% covered
                </Pill>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid ${p.border}`,
            fontSize: 12,
            color: p.muted,
            lineHeight: 1.55,
          }}
        >
          {d.bandReason}
        </div>
      </Panel>

      {/* ---------- Key metrics ---------- */}
      {m && (
        <Panel p={p} style={{ marginBottom: 12 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
              gap: 14,
            }}
          >
            <Stat p={p} label="Avg monthly revenue" value={money(m.avgMonthlyInflow, true)} />
            <Stat
              p={p}
              label="Net cash flow"
              value={`${m.netMonthlyCashFlow < 0 ? '−' : '+'}${money(Math.abs(m.netMonthlyCashFlow), true)}`}
              tone={m.netMonthlyCashFlow < 0 ? p.red : p.green}
              sub="per month"
            />
            <Stat
              p={p}
              label="Cash on hand"
              value={`${Math.round(m.daysCashOnHand)}d`}
              tone={m.daysCashOnHand < 21 ? p.yellow : undefined}
            />
            <Stat p={p} label="Revenue stability" value={m.revenueStability.toFixed(2)} sub="0–1 scale" />
            <Stat
              p={p}
              label="NSF events"
              value={String(m.nsfCount)}
              tone={m.nsfCount > 0 ? (m.nsfCount >= 4 ? p.red : p.yellow) : undefined}
            />
            <Stat p={p} label="Months of data" value={String(m.monthsObserved)} />
          </div>
        </Panel>
      )}

      {/* ---------- Blockers and flags ---------- */}
      {(d.hardBlockers.length > 0 || d.softFlags.length > 0) && (
        <Panel p={p} style={{ marginBottom: 12 }}>
          <SectionTitle p={p}>
            {d.hardBlockers.length > 0 ? 'Blocking conditions' : 'Review flags'}
          </SectionTitle>
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              ...d.hardBlockers.map((f) => ({ ...f, hard: true })),
              ...d.softFlags.map((f) => ({ ...f, hard: false })),
            ].map((flag) => (
              <div
                key={flag.code}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  background: p.panelAlt,
                  borderLeft: `3px solid ${flag.hard ? p.red : p.yellow}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 620, fontSize: 13 }}>{flag.label}</span>
                  <Pill p={p} color={flag.hard ? p.red : p.yellow}>
                    {flag.hard ? 'blocks approval' : 'needs a human'}
                  </Pill>
                </div>
                <div style={{ fontSize: 12, color: p.muted, lineHeight: 1.55 }}>{flag.explanation}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ---------- Reason codes: the transparency layer ---------- */}
      <Panel p={p} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <SectionTitle p={p}>How the score was built</SectionTitle>
          <button
            onClick={() => setState({ showAll: !showAll })}
            style={{
              background: 'transparent',
              border: `1px solid ${p.border}`,
              color: p.muted,
              borderRadius: 6,
              padding: '3px 9px',
              fontSize: 11,
              cursor: 'pointer',
              marginBottom: 10,
            }}
          >
            {showAll ? 'Show top factors' : `Show all ${sortedReasons.length}`}
          </button>
        </div>

        <div style={{ display: 'grid', gap: 11 }}>
          {visibleReasons.map((r) => {
            const ratio = r.maxPoints > 0 ? r.points / r.maxPoints : 0;
            const tone = r.impact === 'positive' ? p.green : r.impact === 'negative' ? p.red : p.yellow;

            return (
              <div key={r.code}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 4,
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 560 }}>{r.label}</span>
                  <span
                    style={{
                      fontSize: 12,
                      color: p.muted,
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ color: tone, fontWeight: 650 }}>{r.points}</span>
                    {' / '}
                    {r.maxPoints}
                  </span>
                </div>

                <div
                  style={{
                    height: 5,
                    background: p.panelAlt,
                    borderRadius: 999,
                    overflow: 'hidden',
                    marginBottom: 5,
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(2, ratio * 100)}%`,
                      height: '100%',
                      background: tone,
                      borderRadius: 999,
                    }}
                  />
                </div>

                <div style={{ fontSize: 11.5, color: p.muted, lineHeight: 1.55 }}>{r.explanation}</div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 13,
            paddingTop: 11,
            borderTop: `1px solid ${p.border}`,
            fontSize: 11.5,
            color: p.faint,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {d.rawScore} raw − {d.anomalyPenalty} anomaly penalty = <strong style={{ color: p.text }}>{d.score}</strong>{' '}
          · policy v{d.policyVersion}
        </div>
      </Panel>

      {/* ---------- Anomalies ---------- */}
      {m && m.anomalies.length > 0 && (
        <Panel p={p} style={{ marginBottom: 12 }}>
          <SectionTitle p={p}>Unusual activity ({m.anomalies.length})</SectionTitle>
          <div style={{ display: 'grid', gap: 7 }}>
            {m.anomalies.slice(0, 5).map((a, i) => (
              <div key={`${a.code}-${i}`} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <span
                  style={{
                    marginTop: 5,
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    flexShrink: 0,
                    background: a.severity === 'high' ? p.red : a.severity === 'medium' ? p.yellow : p.muted,
                  }}
                />
                <span style={{ fontSize: 12, color: p.muted, lineHeight: 1.55 }}>{a.description}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ---------- Next action ---------- */}
      <Panel p={p} style={{ borderLeft: `3px solid ${color}` }}>
        <SectionTitle p={p}>Recommended next action</SectionTitle>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>{d.nextAction}</div>

        {data.stripe && (
          <div style={{ marginTop: 11, paddingTop: 11, borderTop: `1px solid ${p.border}` }}>
            <div style={{ fontSize: 12, color: p.muted, marginBottom: 5 }}>
              Stripe account {data.stripe.accountId}
              {data.stripe.simulated ? ' (simulated)' : ''}
            </div>
            <a
              href={data.stripe.onboardingUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12.5, color: p.blue, wordBreak: 'break-all' }}
            >
              {data.stripe.onboardingUrl}
            </a>
          </div>
        )}

        {data.stripeSkippedReason && (
          <div style={{ marginTop: 9, fontSize: 12, color: p.muted, fontStyle: 'italic' }}>
            {data.stripeSkippedReason}
          </div>
        )}
      </Panel>

      {/* ---------- Provenance ---------- */}
      {(data.provenance || data.timing) && (
        <div
          style={{
            marginTop: 11,
            fontSize: 11,
            color: p.faint,
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          {data.provenance?.institutionName && <span>{data.provenance.institutionName}</span>}
          {data.provenance?.transactionsAnalyzed !== undefined && (
            <span>{data.provenance.transactionsAnalyzed} transactions analysed</span>
          )}
          {data.provenance?.dataSource && (
            <span>
              source: {data.provenance.dataSource === 'plaid_sandbox' ? 'Plaid Sandbox' : 'simulated'}
            </span>
          )}
          {data.timing && (
            <span style={{ color: p.green, fontWeight: 600 }}>decided in {data.timing.elapsedMs}ms</span>
          )}
        </div>
      )}
    </div>
  );
}
