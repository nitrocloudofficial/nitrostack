'use client';

import { useState, useEffect } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { tokens, fonts, S, badge } from '../../lib/theme';
import { DonutChart, SeverityBar, HeatmapGrid, MetricCard, StatusDot } from '../../lib/charts';

type DiffResult = {
  scenarioId: string;
  summary: { totalChanges: number; breakingChanges: number; nonBreakingChanges: number; unsupportedChanges: number };
  changes: Array<{ id: string; code: string; breaking: boolean; operation: string; location?: string; jsonPath?: string; rationale: string }>;
  baselineSpecHash: string;
  candidateSpecHash: string;
  diffHash: string;
  validation: { openApiVersion: string; warnings: string[] };
};

const PREVIEW: DiffResult = {
  scenarioId: 'risky',
  summary: { totalChanges: 4, breakingChanges: 3, nonBreakingChanges: 1, unsupportedChanges: 0 },
  changes: [
    { id: 'c1', code: 'PROPERTY_TYPE_CHANGED', breaking: true, operation: 'GET /api/user', location: 'response', jsonPath: '$response.id', rationale: 'Schema type changed from integer to string.' },
    { id: 'c2', code: 'REQUIRED_PROPERTY_REMOVED', breaking: true, operation: 'GET /api/user', location: 'response', jsonPath: '$response.name', rationale: 'Required property name was removed.' },
    { id: 'c3', code: 'ENUM_WIDENED', breaking: true, operation: 'GET /api/user', location: 'response', jsonPath: '$response.status', rationale: 'New enum values may break exhaustive handling.' },
    { id: 'c4', code: 'OPTIONAL_PROPERTY_ADDED', breaking: false, operation: 'GET /api/user', location: 'response', jsonPath: '$response.fullName', rationale: 'Optional property added, backward compatible.' },
  ],
  baselineSpecHash: 'a1b2c3d4e5f6a1b2', candidateSpecHash: 'f6e5d4c3b2a1f6e5', diffHash: 'deadbeef1234',
  validation: { openApiVersion: '3.0.0', warnings: [] },
};

function unwrap(value: unknown): DiffResult | null {
  if (!value) return null;
  const c = value as { structuredContent?: unknown; data?: unknown };
  return (c?.structuredContent ?? c?.data ?? value) as DiffResult;
}

const KF = `@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes barFill{from{width:0}}`;
if (typeof document !== 'undefined' && !document.getElementById('apiguard-diff-kf')) { const s = document.createElement('style'); s.id = 'apiguard-diff-kf'; s.textContent = KF; document.head.appendChild(s); }

export default function ContractDiffSummary() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const sdkOutput = isReady ? unwrap(getToolOutput()) : null;
  const [data] = useState<DiffResult>(sdkOutput ?? PREVIEW);
  const isPreview = !isReady;

  const ops = [...new Set(data.changes.map(c => c.operation))];
  const codeCounts: Record<string, number> = {};
  data.changes.forEach(c => { codeCounts[c.code] = (codeCounts[c.code] || 0) + 1; });

  return (
    <main style={S.widget}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, animation: 'fadeUp 350ms ease-out both' }}>
        <div>
          <div style={S.eyebrow}>Contract Comparison</div>
          <h1 style={S.title}>API diff summary</h1>
          <div style={S.subtitle}>{data.scenarioId}</div>
        </div>
        <span style={badge(data.summary.breakingChanges > 0 ? 'HIGH' : data.summary.nonBreakingChanges > 0 ? 'LOW' : 'MEDIUM')}>
          {data.summary.breakingChanges > 0 ? 'BREAKING' : 'SAFE'}
        </span>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 24, animation: 'fadeUp 400ms ease-out 100ms both' }}>
        <DonutChart
          slices={[
            { value: data.summary.breakingChanges, color: '#d92d20', label: 'Breaking' },
            { value: data.summary.nonBreakingChanges, color: '#12b76a', label: 'Non-breaking' },
            { value: data.summary.unsupportedChanges, color: '#f79009', label: 'Unsupported' },
          ]}
          size={100} thickness={11}
          center={<>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#101828' }}>{data.summary.totalChanges}</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#667085', textTransform: 'uppercase' as const }}>changes</span>
          </>}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SeverityBar high={data.summary.breakingChanges} medium={data.summary.unsupportedChanges} low={data.summary.nonBreakingChanges} animDelay={200} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 }}>
            <div style={{ fontSize: 11, color: '#b42318', fontWeight: 600 }}>{data.summary.breakingChanges} breaking</div>
            <div style={{ fontSize: 11, color: '#b54708', fontWeight: 600 }}>{data.summary.unsupportedChanges} unsupported</div>
            <div style={{ fontSize: 11, color: '#067647', fontWeight: 600 }}>{data.summary.nonBreakingChanges} safe</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 20 }}>
        <MetricCard label="Operations" value={ops.length} animDelay={150} />
        <MetricCard label="OpenAPI" value={data.validation.openApiVersion} animDelay={200} />
        <MetricCard label="Warnings" value={data.validation.warnings.length} trend={data.validation.warnings.length > 0 ? 'up' : 'flat'} animDelay={250} />
      </div>

      {ops.length > 0 && (
        <section style={S.section}>
          <h2 style={S.sectionTitle}>Operation heatmap</h2>
          <HeatmapGrid
            rows={ops}
            columns={['Breaking', 'Safe']}
            cells={ops.map(op => [
              data.changes.filter(c => c.operation === op && c.breaking).length,
              data.changes.filter(c => c.operation === op && !c.breaking).length,
            ])}
            animDelay={300}
          />
        </section>
      )}

      <section style={S.section}>
        <h2 style={S.sectionTitle}>Changes</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#667085', fontWeight: 600, borderBottom: `1px solid ${tokens.border.default}` }}></th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#667085', fontWeight: 600, borderBottom: `1px solid ${tokens.border.default}` }}>Code</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#667085', fontWeight: 600, borderBottom: `1px solid ${tokens.border.default}` }}>Operation</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#667085', fontWeight: 600, borderBottom: `1px solid ${tokens.border.default}` }}>Path</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#667085', fontWeight: 600, borderBottom: `1px solid ${tokens.border.default}` }}>Rationale</th>
              </tr>
            </thead>
            <tbody>
              {data.changes.map((c, i) => (
                <tr key={c.id} style={{ animation: `fadeUp 250ms ease-out ${400 + i * 60}ms both` }}>
                  <td style={{ padding: '8px 10px', borderBottom: `1px solid ${tokens.border.default}` }}><StatusDot status={c.breaking ? 'fail' : 'pass'} /></td>
                  <td style={{ padding: '8px 10px', fontFamily: fonts.mono, fontWeight: 600, borderBottom: `1px solid ${tokens.border.default}` }}>{c.code}</td>
                  <td style={{ padding: '8px 10px', fontFamily: fonts.mono, color: '#475467', borderBottom: `1px solid ${tokens.border.default}` }}>{c.operation}</td>
                  <td style={{ padding: '8px 10px', fontFamily: fonts.mono, color: '#475467', fontSize: 11, borderBottom: `1px solid ${tokens.border.default}` }}>{c.jsonPath ?? '-'}</td>
                  <td style={{ padding: '8px 10px', color: '#475467', borderBottom: `1px solid ${tokens.border.default}` }}>{c.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={S.section}>
        <h2 style={S.sectionTitle}>Spec hashes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[['Baseline', data.baselineSpecHash], ['Candidate', data.candidateSpecHash]].map(([label, hash]) => (
            <div key={label} style={{ padding: 12, borderRadius: 8, background: '#f8f9fb', border: `1px solid ${tokens.border.default}`, animation: 'fadeUp 300ms ease-out 500ms both' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase' as const, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 12, fontFamily: fonts.mono, color: '#475467', wordBreak: 'break-all' }}>{hash}</div>
            </div>
          ))}
        </div>
      </section>

      {data.validation.warnings.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: tokens.color.bannerBg, border: `1px solid ${tokens.color.bannerBorder}`, color: tokens.color.bannerText, fontSize: 13 }}>
          {data.validation.warnings.map((w, i) => <div key={i}>{w}</div>)}
        </div>
      )}
    </main>
  );
}
