'use client';

import { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { tokens, fonts, S, pill, badge } from '../../lib/theme';
import { DonutChart, StackedBar, ProgressRing, GaugeArc, MetricCard, StatusDot, HeatmapGrid } from '../../lib/charts';

type RiskResult = {
  riskRunId: string;
  scenarioId: string;
  overallSeverity: 'HIGH' | 'MEDIUM' | 'LOW';
  classifierMode: string;
  limitations: string[];
  evidence: Array<{ id: string; classification: string; confidence: string; repository: string; filePath: string; reasoning: string }>;
};

const PREVIEW: RiskResult = {
  riskRunId: 'risk_preview', scenarioId: 'risky', overallSeverity: 'HIGH', classifierMode: 'deterministic-fallback',
  limitations: ['Preview mode \u2014 LLM classifier disabled.'],
  evidence: [
    { id: 'e1', classification: 'CONFIRMED_IMPACT', confidence: 'HIGH', repository: 'react-consumer', filePath: 'src/api/userProfile.ts', reasoning: 'Reads removed name field.' },
    { id: 'e2', classification: 'CONFIRMED_IMPACT', confidence: 'MEDIUM', repository: 'python-consumer', filePath: 'app/models/user.py', reasoning: 'Type mismatch on id field.' },
    { id: 'e3', classification: 'CONFIRMED_IMPACT', confidence: 'LOW', repository: 'go-consumer', filePath: 'client/user.go', reasoning: 'Exhaustive switch may panic.' },
    { id: 'e4', classification: 'FALSE_POSITIVE', confidence: 'MEDIUM', repository: 'java-consumer', filePath: 'src/main/java/UserClient.java', reasoning: 'Only uses optional fields.' },
  ],
};

function unwrap(value: unknown): RiskResult | null {
  if (!value) return null;
  const c = value as { structuredContent?: unknown; data?: unknown };
  return (c?.structuredContent ?? c?.data ?? value) as RiskResult;
}

const KF = `@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(180,35,24,.3)}50%{box-shadow:0 0 0 8px rgba(180,35,24,0)}}@keyframes popIn{0%{transform:scale(0)}60%{transform:scale(1.15)}100%{transform:scale(1)}}`;
if (typeof document !== 'undefined' && !document.getElementById('apiguard-risk-kf')) { const s = document.createElement('style'); s.id = 'apiguard-risk-kf'; s.textContent = KF; document.head.appendChild(s); }

const CLASSIFICATION_COLORS: Record<string, { bg: string; fg: string }> = {
  CONFIRMED_IMPACT: { bg: '#fef3f2', fg: '#b42318' },
  LIKELY_IMPACT: { bg: '#fffaeb', fg: '#b54708' },
  FALSE_POSITIVE: { bg: '#f0fdf4', fg: '#067647' },
  REVIEW_REQUIRED: { bg: '#fffaeb', fg: '#b54708' },
  TEST_ONLY: { bg: '#f8f9fb', fg: '#667085' },
  DOCUMENTATION_ONLY: { bg: '#f8f9fb', fg: '#667085' },
};

const CONFIDENCE_MAP: Record<string, number> = { HIGH: 95, MEDIUM: 65, LOW: 35 };

export default function ConsumerRiskAssessment() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const sdkOutput = isReady ? unwrap(getToolOutput()) : null;
  const [data] = useState<RiskResult>(sdkOutput ?? PREVIEW);
  const isPreview = !isReady;

  const classCounts: Record<string, number> = {};
  data.evidence.forEach(e => { classCounts[e.classification] = (classCounts[e.classification] || 0) + 1; });
  const avgConfidence = data.evidence.length > 0
    ? Math.round(data.evidence.reduce((a, e) => a + (CONFIDENCE_MAP[e.confidence] ?? 50), 0) / data.evidence.length)
    : 0;
  const repos = [...new Set(data.evidence.map(e => e.repository))];
  const impactCount = data.evidence.filter(e => e.classification.includes('IMPACT')).length;
  const safeCount = data.evidence.filter(e => !e.classification.includes('IMPACT')).length;

  return (
    <main style={S.widget}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, animation: 'fadeUp 350ms ease-out both' }}>
        <div>
          <div style={S.eyebrow}>Consumer Risk</div>
          <h1 style={S.title}>Risk assessment</h1>
          <div style={S.subtitle}>{data.riskRunId}</div>
        </div>
        <div style={{ animation: 'popIn 400ms ease-out 200ms both', ...(data.overallSeverity === 'HIGH' ? { animation: 'popIn 400ms ease-out 200ms both, pulse 2s ease-in-out 600ms infinite' } : {}) }}>
          <span style={badge(data.overallSeverity)}>{data.overallSeverity}</span>
        </div>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 24, animation: 'fadeUp 400ms ease-out 100ms both' }}>
        <GaugeArc value={avgConfidence} size={110} thickness={12} label="confidence" color={avgConfidence > 70 ? '#067647' : avgConfidence > 40 ? '#b54708' : '#b42318'} animDelay={200} />
        <div style={{ flex: 1 }}>
          <StackedBar
            segments={[
              { value: impactCount, color: '#d92d20', label: 'Impact' },
              { value: safeCount, color: '#12b76a', label: 'Safe' },
            ]}
            animDelay={300}
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: '#475467' }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#d92d20', marginRight: 4 }} />{impactCount} impacted</span>
            <span style={{ fontSize: 11, color: '#475467' }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#12b76a', marginRight: 4 }} />{safeCount} safe</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 20 }}>
        <MetricCard label="Evidence" value={data.evidence.length} animDelay={150} />
        <MetricCard label="Repositories" value={repos.length} animDelay={200} />
        <MetricCard label="Classifier" value={data.classifierMode.split('-')[0]} animDelay={250} />
      </div>

      {repos.length > 0 && (
        <section style={S.section}>
          <h2 style={S.sectionTitle}>Repository impact</h2>
          <HeatmapGrid
            rows={repos}
            columns={['Impact', 'Safe']}
            cells={repos.map(repo => [
              data.evidence.filter(e => e.repository === repo && e.classification.includes('IMPACT')).length,
              data.evidence.filter(e => e.repository === repo && !e.classification.includes('IMPACT')).length,
            ])}
            animDelay={300}
          />
        </section>
      )}

      <section style={S.section}>
        <h2 style={S.sectionTitle}>Classification breakdown</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {Object.entries(classCounts).map(([cls, count]) => {
            const colors = CLASSIFICATION_COLORS[cls] || { bg: '#f8f9fb', fg: '#667085' };
            return (
              <div key={cls} style={{ ...pill(colors.bg, colors.fg), fontSize: 12, padding: '5px 10px', animation: 'fadeUp 250ms ease-out 400ms both' }}>
                {cls}: {count}
              </div>
            );
          })}
        </div>
      </section>

      <section style={S.section}>
        <h2 style={S.sectionTitle}>Evidence items</h2>
        <div>
          {data.evidence.map((e, i) => {
            const colors = CLASSIFICATION_COLORS[e.classification] || { bg: '#f8f9fb', fg: '#667085' };
            return (
              <div key={e.id} style={{ ...S.card, borderTop: `3px solid ${colors.fg}`, animation: `fadeUp 300ms ease-out ${500 + i * 80}ms both` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#101828' }}>{e.repository}</span>
                    <span style={{ fontSize: 11, fontFamily: fonts.mono, color: '#667085' }}>{e.confidence}</span>
                  </div>
                  <span style={pill(colors.bg, colors.fg)}>{e.classification}</span>
                </div>
                <div style={{ fontSize: 12, fontFamily: fonts.mono, color: '#475467', marginBottom: 4 }}>{e.filePath}</div>
                <p style={{ margin: 0, fontSize: 13, color: '#475467', lineHeight: 1.5 }}>{e.reasoning}</p>
              </div>
            );
          })}
        </div>
      </section>

      {data.limitations.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: tokens.color.bannerBg, border: `1px solid ${tokens.color.bannerBorder}`, color: tokens.color.bannerText, fontSize: 13 }}>
          {data.limitations.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </main>
  );
}
