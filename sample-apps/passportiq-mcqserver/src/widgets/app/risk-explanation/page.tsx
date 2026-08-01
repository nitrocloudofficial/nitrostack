'use client';

/** MCP widget for `explain_risk` / `score_risk` / `evaluate_rules`. */
import React from 'react';
import { COLORS, useTheme } from '../../lib/theme.js';
import { asArray } from '../../lib/format.js';
import { hasHostData, pick, withFallback } from '../../lib/sdk.js';
import { OFFICER, SAMPLE_RISK } from '../../lib/sample-data.js';
import { AppShell, Card, Content, DemoBanner, Empty, MainColumn, TopBar } from '../../components/chrome.jsx';
import { RiskDonut, RiskSummary } from '../../components/panels.jsx';
import { RiskPanel } from '../../components/teamwork.jsx';
import { IconAlert, IconAudit } from '../../components/icons.jsx';

export default function RiskExplanation({ data }: { data?: unknown }) {
  useTheme();

  const live = hasHostData(data);
  const payload = withFallback(data, SAMPLE_RISK as unknown as Record<string, unknown>);

  const score = pick<number | null>(payload, 'score', pick<number | null>(payload, 'riskScore', null));
  const confidence = pick<number>(payload, 'confidence', 0.9);
  const evidence = asArray<string>(payload.evidence);
  const findings = asArray<Record<string, unknown>>(payload.findings ?? payload.rules);
  const categories = pick<Record<string, number>>(payload, 'categoryTotals', {});
  const narrative = pick<string | null>(payload, 'explanation', null);
  const applicationId = pick<string>(payload, 'applicationId', '');

  const categoryRows = Object.keys(categories).map((key) => ({
    label: key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: Math.max(0, Math.min(100, Math.round(Number(categories[key] ?? 0)))),
    severity: (Number(categories[key] ?? 0) >= 25 ? 'high' : Number(categories[key] ?? 0) >= 12 ? 'medium' : 'low') as
      | 'low'
      | 'medium'
      | 'high',
  }));

  return (
    <AppShell>
      <MainColumn>
        <TopBar
          crumbs={['PassportIQ', 'Risk explanation', applicationId || '—']}
          live={{ label: `score ${score ?? '—'}`, tone: 'machine' }}
          officer={{ name: OFFICER.name, role: OFFICER.role }}
        />
        <Content>
          {!live ? <DemoBanner>Sample explanation — open from an `explain_risk` call for live data.</DemoBanner> : null}

          <div className="piq-split" style={{ marginBottom: 16 }}>
            <div className="piq-split-main" style={{ display: 'grid', gap: 16 }}>
              <Card
                title="How this score was produced"
                subtitle="Every contributing rule, with its citation. A score with no traceable rule behind it is not usable evidence."
                eyebrow="Cited rules"
                icon={<IconAudit size={16} color={COLORS.machine} />}
              >
                <RiskSummary score={score} recommendation={pick<string | null>(payload, 'recommendation', null)} narrative={narrative} flags={findings} />
              </Card>

              <Card title="Evidence cited" eyebrow="Findings" icon={<IconAlert size={16} color={COLORS.high} />}>
                {evidence.length === 0 ? (
                  <Empty>No evidence lines returned.</Empty>
                ) : (
                  <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 10 }}>
                    {evidence.map((line, i) => (
                      <li key={i} style={{ fontSize: 13, lineHeight: 1.65, color: COLORS.textPrimary }}>
                        {line}
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </div>

            <div className="piq-split-side" style={{ display: 'grid', gap: 16 }}>
              <Card title="Score" eyebrow="Advisory only">
                <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 10px' }}>
                  <RiskDonut score={score} size={150} caption={`${Math.round(confidence * 100)}% confidence`} />
                </div>
              </Card>

              <RiskPanel score={score ?? 0} confidence={Math.round(confidence * 100)} factors={categoryRows} />
            </div>
          </div>
        </Content>
      </MainColumn>
    </AppShell>
  );
}
