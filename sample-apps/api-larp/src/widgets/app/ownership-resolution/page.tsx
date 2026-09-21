'use client';

import { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { tokens, fonts, S, pill, badge } from '../../lib/theme';
import { DonutChart, StackedBar, MetricCard, HeatmapGrid, StatusDot } from '../../lib/charts';

type OwnershipResult = {
  resolutionId: string;
  assessmentId: string;
  resolvedAt: string;
  assignments: Array<{ evidenceId: string; consumerImpactKey: string; repository: string; filePath: string; owners: string[]; status: 'RESOLVED' | 'UNRESOLVED'; source: string; matchedPattern?: string }>;
  unresolvedCount: number;
  warnings: string[];
};

const PREVIEW: OwnershipResult = {
  resolutionId: 'own_preview', assessmentId: 'asm_preview', resolvedAt: new Date().toISOString(),
  assignments: [
    { evidenceId: 'e1', consumerImpactKey: 'k1', repository: 'react-consumer', filePath: 'src/api/userProfile.ts', owners: ['@team-frontend'], status: 'RESOLVED', source: 'CODEOWNERS', matchedPattern: 'src/api/' },
    { evidenceId: 'e2', consumerImpactKey: 'k2', repository: 'python-consumer', filePath: 'app/models/user.py', owners: ['@team-backend'], status: 'RESOLVED', source: 'CODEOWNERS', matchedPattern: 'app/' },
    { evidenceId: 'e3', consumerImpactKey: 'k3', repository: 'go-consumer', filePath: 'client/user.go', owners: [], status: 'UNRESOLVED', source: 'NONE' },
  ],
  unresolvedCount: 1,
  warnings: ['No CODEOWNERS found in go-consumer repository.'],
};

function unwrap(value: unknown): OwnershipResult | null {
  if (!value) return null;
  const c = value as { structuredContent?: unknown; data?: unknown };
  return (c?.structuredContent ?? c?.data ?? value) as OwnershipResult;
}

const SOURCE_COLORS: Record<string, { bg: string; fg: string }> = {
  CODEOWNERS: { bg: '#f0fdf4', fg: '#067647' },
  REPOSITORY_FALLBACK: { bg: '#fffaeb', fg: '#b54708' },
  NONE: { bg: '#fef3f2', fg: '#b42318' },
};

const KF = `@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes popIn{0%{transform:scale(0)}60%{transform:scale(1.15)}100%{transform:scale(1)}}`;
if (typeof document !== 'undefined' && !document.getElementById('apiguard-own-kf')) { const s = document.createElement('style'); s.id = 'apiguard-own-kf'; s.textContent = KF; document.head.appendChild(s); }

export default function OwnershipResolution() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const sdkOutput = isReady ? unwrap(getToolOutput()) : null;
  const [data] = useState<OwnershipResult>(sdkOutput ?? PREVIEW);
  const isPreview = !isReady;

  const resolvedCount = data.assignments.filter(a => a.status === 'RESOLVED').length;
  const unresolvedCount = data.assignments.filter(a => a.status === 'UNRESOLVED').length;
  const repos = [...new Set(data.assignments.map(a => a.repository))];
  const sourceCounts: Record<string, number> = {};
  data.assignments.forEach(a => { sourceCounts[a.source] = (sourceCounts[a.source] || 0) + 1; });

  return (
    <main style={S.widget}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, animation: 'fadeUp 350ms ease-out both' }}>
        <div>
          <div style={S.eyebrow}>Ownership</div>
          <h1 style={S.title}>Owner resolution</h1>
          <div style={S.subtitle}>{data.resolutionId}</div>
        </div>
        <span style={badge(unresolvedCount === 0 ? 'LOW' : 'HIGH')}>{unresolvedCount === 0 ? 'RESOLVED' : 'GAPS'}</span>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 24, animation: 'fadeUp 400ms ease-out 100ms both' }}>
        <DonutChart
          slices={[
            { value: resolvedCount, color: '#12b76a', label: 'Resolved' },
            { value: unresolvedCount, color: '#d92d20', label: 'Unresolved' },
          ]}
          size={90} thickness={10}
          center={<>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#101828' }}>{resolvedCount}</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#667085', textTransform: 'uppercase' as const }}>resolved</span>
          </>}
        />
        <div style={{ flex: 1 }}>
          <StackedBar
            segments={Object.entries(sourceCounts).map(([src, count]) => {
              const c = SOURCE_COLORS[src] || { bg: '#f8f9fb', fg: '#667085' };
              return { value: count, color: c.fg, label: src.replace(/_/g, ' ') };
            })}
            animDelay={200}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 20 }}>
        <MetricCard label="Total" value={data.assignments.length} animDelay={150} />
        <MetricCard label="Repositories" value={repos.length} animDelay={200} />
        <MetricCard label="Unresolved" value={unresolvedCount} trend={unresolvedCount > 0 ? 'up' : 'flat'} trendLabel={unresolvedCount > 0 ? 'needs attention' : 'clear'} animDelay={250} />
      </div>

      {repos.length > 0 && (
        <section style={S.section}>
          <h2 style={S.sectionTitle}>Repository ownership</h2>
          <HeatmapGrid
            rows={repos}
            columns={['Resolved', 'Unresolved']}
            cells={repos.map(repo => [
              data.assignments.filter(a => a.repository === repo && a.status === 'RESOLVED').length,
              data.assignments.filter(a => a.repository === repo && a.status === 'UNRESOLVED').length,
            ])}
            animDelay={300}
          />
        </section>
      )}

      <section style={S.section}>
        <h2 style={S.sectionTitle}>Assignments</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#667085', fontWeight: 600, borderBottom: `1px solid ${tokens.border.default}` }}></th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#667085', fontWeight: 600, borderBottom: `1px solid ${tokens.border.default}` }}>Repository</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#667085', fontWeight: 600, borderBottom: `1px solid ${tokens.border.default}` }}>File</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#667085', fontWeight: 600, borderBottom: `1px solid ${tokens.border.default}` }}>Owners</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#667085', fontWeight: 600, borderBottom: `1px solid ${tokens.border.default}` }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {data.assignments.map((a, i) => {
                const sc = SOURCE_COLORS[a.source] || { bg: '#f8f9fb', fg: '#667085' };
                return (
                  <tr key={a.evidenceId} style={{ background: a.status === 'UNRESOLVED' ? '#fef3f2' : undefined, animation: `fadeUp 250ms ease-out ${400 + i * 60}ms both` }}>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${tokens.border.default}` }}><StatusDot status={a.status === 'RESOLVED' ? 'pass' : 'fail'} /></td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, borderBottom: `1px solid ${tokens.border.default}` }}>{a.repository}</td>
                    <td style={{ padding: '8px 10px', fontFamily: fonts.mono, fontSize: 11, color: '#475467', borderBottom: `1px solid ${tokens.border.default}` }}>{a.filePath}</td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${tokens.border.default}` }}>
                      {a.owners.length > 0 ? a.owners.map((o, j) => (
                        <span key={j} style={{ display: 'inline-block', fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#f0fdf4', color: '#067647', fontWeight: 600, marginRight: 4 }}>{o}</span>
                      )) : <span style={{ fontSize: 11, color: '#98a2b3' }}>none</span>}
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${tokens.border.default}` }}><span style={pill(sc.bg, sc.fg)}>{a.source}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {data.warnings.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: tokens.color.bannerBg, border: `1px solid ${tokens.color.bannerBorder}`, color: tokens.color.bannerText, fontSize: 13 }}>
          {data.warnings.map((w, i) => <div key={i}>{w}</div>)}
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: '#667085', animation: 'fadeUp 300ms ease-out 600ms both' }}>
        Resolved at {new Date(data.resolvedAt).toLocaleString()}
      </div>
    </main>
  );
}
