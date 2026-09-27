'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { Empty, Panel, SectionTitle, Stat, money, palette } from '../_shared/ui';

interface MonthlyBucket {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
  isComplete: boolean;
}

interface CashFlowData {
  applicationId?: string;
  businessName?: string;
  institutionName?: string;
  dataSource?: string;
  metrics?: {
    monthsObserved: number;
    monthly: MonthlyBucket[];
    avgMonthlyInflow: number;
    avgMonthlyOutflow: number;
    netMonthlyCashFlow: number;
    inflowOutflowRatio: number;
    revenueStability: number;
    revenueCoefficientOfVariation: number;
    revenueTrend: number;
    revenueTrendConfidence: number;
    currentBalance: number;
    minBalance: number;
    daysCashOnHand: number;
    negativeBalanceDays: number;
    estimatedDailyBurn: number;
    nsfCount: number;
    monthlyDebtService: number;
    debtServiceRatio: number;
    accountTenureDays: number;
    distinctInflowSources: number;
    anomalies: Array<{ code: string; severity: string; description: string; date?: string }>;
  };
}

export default function CashFlowAnalysis() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<CashFlowData>();
  const p = palette(theme === 'dark');

  if (!data?.metrics) {
    return (
      <div style={{ padding: 16, background: p.bg }}>
        <Empty p={p} message="Waiting for cash-flow analysis…" />
      </div>
    );
  }

  const m = data.metrics;
  const peak = Math.max(1, ...m.monthly.flatMap((b) => [b.inflow, b.outflow]));

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
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 660 }}>{data.businessName ?? 'Cash flow analysis'}</div>
        <div style={{ fontSize: 12, color: p.muted, marginTop: 3 }}>
          {data.institutionName}
          {data.dataSource === 'simulated' ? ' · simulated data' : ''} · {m.accountTenureDays} days observed
        </div>
      </div>

      {/* ---------- Monthly inflow vs outflow ---------- */}
      <Panel p={p} style={{ marginBottom: 12 }}>
        <SectionTitle p={p}>Monthly revenue vs spending</SectionTitle>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150, marginBottom: 8 }}>
          {m.monthly.map((b) => (
            <div
              key={b.month}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: b.net < 0 ? p.red : p.green,
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {b.net < 0 ? '−' : '+'}
                {money(Math.abs(b.net), true).replace('$', '')}
              </div>

              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 108 }}>
                <div
                  title={`Revenue ${money(b.inflow)}`}
                  style={{
                    width: 13,
                    height: `${Math.max(2, (b.inflow / peak) * 100)}%`,
                    background: p.green,
                    borderRadius: '3px 3px 0 0',
                    // Partial months are shown but visibly de-emphasised — they
                    // are excluded from every average on this page.
                    opacity: b.isComplete ? 1 : 0.4,
                  }}
                />
                <div
                  title={`Spending ${money(b.outflow)}`}
                  style={{
                    width: 13,
                    height: `${Math.max(2, (b.outflow / peak) * 100)}%`,
                    background: p.red,
                    borderRadius: '3px 3px 0 0',
                    opacity: b.isComplete ? 0.85 : 0.32,
                  }}
                />
              </div>

              <div style={{ fontSize: 10, color: b.isComplete ? p.muted : p.faint }}>
                {b.month.slice(5)}
                {!b.isComplete && '*'}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: p.muted, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 9, height: 9, background: p.green, borderRadius: 2 }} /> Revenue
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 9, height: 9, background: p.red, opacity: 0.85, borderRadius: 2 }} /> Spending
          </span>
          {m.monthly.some((b) => !b.isComplete) && (
            <span style={{ color: p.faint }}>* partial month — excluded from averages</span>
          )}
        </div>
      </Panel>

      {/* ---------- Headline metrics ---------- */}
      <Panel p={p} style={{ marginBottom: 12 }}>
        <SectionTitle p={p}>Position</SectionTitle>
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 14 }}
        >
          <Stat p={p} label="Avg revenue" value={money(m.avgMonthlyInflow, true)} sub="per month" />
          <Stat p={p} label="Avg spending" value={money(m.avgMonthlyOutflow, true)} sub="per month" />
          <Stat
            p={p}
            label="Net cash flow"
            value={`${m.netMonthlyCashFlow < 0 ? '−' : '+'}${money(Math.abs(m.netMonthlyCashFlow), true)}`}
            tone={m.netMonthlyCashFlow < 0 ? p.red : p.green}
          />
          <Stat p={p} label="Current balance" value={money(m.currentBalance, true)} />
          <Stat
            p={p}
            label="Lowest balance"
            value={money(m.minBalance, true)}
            tone={m.minBalance < 0 ? p.red : undefined}
            sub="reconstructed"
          />
          <Stat
            p={p}
            label="Cash on hand"
            value={`${Math.round(m.daysCashOnHand)}d`}
            tone={m.daysCashOnHand < 21 ? p.yellow : undefined}
            sub={`${money(m.estimatedDailyBurn)}/day burn`}
          />
        </div>
      </Panel>

      {/* ---------- Stability, trend, obligations ---------- */}
      <Panel p={p} style={{ marginBottom: 12 }}>
        <SectionTitle p={p}>Stability and obligations</SectionTitle>
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 14 }}
        >
          <Stat
            p={p}
            label="Revenue stability"
            value={m.revenueStability.toFixed(2)}
            sub={`±${Math.round(m.revenueCoefficientOfVariation * 100)}% variance`}
            tone={m.revenueStability < 0.4 ? p.yellow : undefined}
          />
          <Stat
            p={p}
            label="Revenue trend"
            value={`${m.revenueTrend >= 0 ? '+' : '−'}${Math.abs(Math.round(m.revenueTrend * 100))}%`}
            sub={
              m.revenueTrendConfidence < 0.3
                ? `R²=${m.revenueTrendConfidence.toFixed(2)} — too noisy to trust`
                : `per month · R²=${m.revenueTrendConfidence.toFixed(2)}`
            }
            tone={m.revenueTrendConfidence < 0.3 ? p.muted : m.revenueTrend < 0 ? p.red : p.green}
          />
          <Stat
            p={p}
            label="Debt service"
            value={money(m.monthlyDebtService, true)}
            sub={`${Math.round(m.debtServiceRatio * 100)}% of revenue`}
            tone={m.debtServiceRatio > 0.4 ? p.yellow : undefined}
          />
          <Stat
            p={p}
            label="NSF events"
            value={String(m.nsfCount)}
            tone={m.nsfCount >= 4 ? p.red : m.nsfCount > 0 ? p.yellow : undefined}
          />
          <Stat
            p={p}
            label="Negative days"
            value={String(m.negativeBalanceDays)}
            tone={m.negativeBalanceDays > 3 ? p.red : undefined}
          />
          <Stat
            p={p}
            label="Revenue sources"
            value={String(m.distinctInflowSources)}
            tone={m.distinctInflowSources === 1 ? p.yellow : undefined}
            sub="distinct payers"
          />
        </div>
      </Panel>

      {/* ---------- Anomalies ---------- */}
      {m.anomalies.length > 0 && (
        <Panel p={p}>
          <SectionTitle p={p}>Unusual activity ({m.anomalies.length})</SectionTitle>
          <div style={{ display: 'grid', gap: 9 }}>
            {m.anomalies.map((a, i) => {
              const tone = a.severity === 'high' ? p.red : a.severity === 'medium' ? p.yellow : p.muted;
              return (
                <div
                  key={`${a.code}-${i}`}
                  style={{
                    padding: 9,
                    borderRadius: 8,
                    background: p.panelAlt,
                    borderLeft: `3px solid ${tone}`,
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 650, color: tone }}>{a.code}</span>
                    {a.date && <span style={{ fontSize: 11, color: p.faint }}>{a.date}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: p.muted, lineHeight: 1.55 }}>{a.description}</div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}
