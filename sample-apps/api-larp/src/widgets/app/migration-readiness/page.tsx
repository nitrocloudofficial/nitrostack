'use client';

import { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { tokens, fonts, S, badge } from '../../lib/theme';
import { GaugeArc, CheckItem, Timeline, MetricCard, StatusDot } from '../../lib/charts';

type ReadinessResult = {
  bundleId: string;
  readyForMigration: boolean;
  reason: string;
  recommendedNextSteps: string[];
};

const PREVIEW: ReadinessResult = {
  bundleId: 'pkg_preview', readyForMigration: false, reason: 'Policy blocks or missing owners',
  recommendedNextSteps: ['Review blocking policies', 'Resolve unowned code in go-consumer', 'Re-run policy evaluation'],
};

function unwrap(value: unknown): ReadinessResult | null {
  if (!value) return null;
  const c = value as { structuredContent?: unknown; data?: unknown };
  return (c?.structuredContent ?? c?.data ?? value) as ReadinessResult;
}

const KF = `@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes scaleIn{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}@keyframes popIn{0%{transform:scale(0)}60%{transform:scale(1.15)}100%{transform:scale(1)}}@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(6,118,71,.35)}50%{box-shadow:0 0 0 8px rgba(6,118,71,0)}}@keyframes pulseRed{0%,100%{box-shadow:0 0 0 0 rgba(180,35,24,.3)}50%{box-shadow:0 0 0 8px rgba(180,35,24,0)}}`;
if (typeof document !== 'undefined' && !document.getElementById('apiguard-ready-kf')) { const s = document.createElement('style'); s.id = 'apiguard-ready-kf'; s.textContent = KF; document.head.appendChild(s); }

export default function MigrationReadiness() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const sdkOutput = isReady ? unwrap(getToolOutput()) : null;
  const [data] = useState<ReadinessResult>(sdkOutput ?? PREVIEW);
  const isPreview = !isReady;

  const gaugeColor = data.readyForMigration ? '#067647' : '#b42318';
  const gaugeValue = data.readyForMigration ? 100 : 25;

  return (
    <main style={S.widget}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, animation: 'fadeUp 350ms ease-out both' }}>
        <div>
          <div style={S.eyebrow}>Migration Readiness</div>
          <h1 style={S.title}>Go / No-Go</h1>
          <div style={S.subtitle}>{data.bundleId}</div>
        </div>
        <span style={{ ...badge(data.readyForMigration ? 'LOW' : 'HIGH'), animation: data.readyForMigration ? 'pulse 2s ease-in-out 600ms infinite' : 'pulseRed 2s ease-in-out 600ms infinite' }}>
          {data.readyForMigration ? 'READY' : 'NOT READY'}
        </span>
      </header>

      <div style={{ marginTop: 28, padding: 24, borderRadius: 12, background: data.readyForMigration ? '#f0fdf4' : '#fef3f2', border: `2px solid ${data.readyForMigration ? '#a6f4c5' : '#fecdca'}`, animation: 'scaleIn 500ms ease-out 100ms both', display: 'flex', alignItems: 'center', gap: 28 }}>
        <GaugeArc value={gaugeValue} size={130} thickness={14} color={gaugeColor} label="readiness" animDelay={300} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: gaugeColor, marginBottom: 6 }}>
            {data.readyForMigration ? '\u2713 Ready for migration' : '\u2717 Blocked'}
          </div>
          <p style={{ margin: 0, fontSize: 14, color: '#475467', lineHeight: 1.5 }}>{data.reason}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 20 }}>
        <CheckItem label="Policy evaluation passes" checked={data.readyForMigration} animDelay={200} />
        <CheckItem label="All owners resolved" checked={data.readyForMigration} animDelay={280} />
      </div>

      <section style={S.section}>
        <h2 style={S.sectionTitle}>Readiness timeline</h2>
        <Timeline steps={[
          { label: 'Diff', status: 'done' },
          { label: 'Evidence', status: 'done' },
          { label: 'Risk', status: 'done' },
          { label: 'Policy', status: data.readyForMigration ? 'done' : 'active' },
          { label: 'Migration', status: data.readyForMigration ? 'active' : 'pending' },
        ]} animDelay={350} />
      </section>

      <section style={S.section}>
        <h2 style={S.sectionTitle}>Next steps</h2>
        <div>
          {data.recommendedNextSteps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: '#f8f9fb', border: `1px solid ${tokens.border.default}`, marginBottom: 8, animation: `fadeUp 300ms ease-out ${500 + i * 100}ms both` }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: '#067647', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: 13, color: '#344054' }}>{step}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
