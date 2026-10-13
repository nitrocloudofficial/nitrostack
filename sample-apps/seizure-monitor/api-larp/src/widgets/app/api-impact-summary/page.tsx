'use client';

import { useState, useEffect } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { tokens, fonts, S, pill, badge, buttonStyle } from '../../lib/theme';
import { DonutChart, StackedBar, SeverityBar, ProgressRing, Timeline, MetricCard, StatusDot } from '../../lib/charts';

type Assessment = {
  id: string;
  version: number;
  analysisStatus: string;
  decisionStatus: string;
  overallSeverity: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceMode: string;
  classifierMode: string;
  durationMs: number;
  createdAt: string;
  changes: Array<{ id: string; code: string; breaking: boolean; operation: string; jsonPath?: string; rationale: string }>;
  evidence: Array<{ id: string; repository: string; filePath: string; lineStart: number; classification: string; confidence: string; reasoning: string; commitSha: string }>;
  limitations: string[];
  decision?: { reason?: string; actorDisplayName: string; decidedAt: string };
};

const PREVIEW_DATA: Assessment = {
  id: 'asm_preview', version: 1, analysisStatus: 'COMPLETE', decisionStatus: 'PENDING', overallSeverity: 'HIGH', sourceMode: 'snapshot', classifierMode: 'deterministic-fallback', durationMs: 2, createdAt: new Date().toISOString(),
  changes: [
    { id: 'chg_preview_1', code: 'PROPERTY_TYPE_CHANGED', breaking: true, operation: 'GET /api/user', jsonPath: '$response.id', rationale: 'The consumer-visible schema type changed from integer to string.' },
    { id: 'chg_preview_2', code: 'REQUIRED_PROPERTY_REMOVED', breaking: true, operation: 'GET /api/user', jsonPath: '$response.name', rationale: 'Required property name was removed.' },
    { id: 'chg_preview_3', code: 'ENUM_WIDENED', breaking: true, operation: 'GET /api/user', jsonPath: '$response.status', rationale: 'New response enum values may break exhaustive consumer handling: suspended.' },
    { id: 'chg_preview_4', code: 'OPTIONAL_PROPERTY_ADDED', breaking: false, operation: 'GET /api/user', jsonPath: '$response.fullName', rationale: 'Optional property fullName was added and is backward compatible.' },
  ],
  evidence: [
    { id: 'ev-react-name', repository: 'react-consumer', filePath: 'src/api/userProfile.ts', lineStart: 4, classification: 'CONFIRMED_IMPACT', confidence: 'MEDIUM', reasoning: 'Production consumer reads the removed response.name field.', commitSha: 'b71d00401b3a' },
    { id: 'ev-python-id', repository: 'python-consumer', filePath: 'app/models/user.py', lineStart: 8, classification: 'CONFIRMED_IMPACT', confidence: 'MEDIUM', reasoning: 'Type annotation int will fail when id becomes a string.', commitSha: '3b1be8e5a705' },
    { id: 'ev-go-status', repository: 'go-consumer', filePath: 'client/user.go', lineStart: 8, classification: 'CONFIRMED_IMPACT', confidence: 'MEDIUM', reasoning: 'Exhaustive switch on status will panic on new enum value "suspended".', commitSha: 'a87772a3a9f0' },
  ],
  limitations: ['Preview mode \u2014 run_impact_assessment via Studio for live data.', 'LLM classification is disabled; deterministic fallback was used.'],
};

function unwrapToolResult(value: unknown): Assessment | null {
  if (!value) return null;
  const candidate = value as { structuredContent?: unknown; data?: unknown };
  return (candidate?.structuredContent ?? candidate?.data ?? value) as Assessment;
}

const KEYFRAMES = `
@keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes popIn { 0%{transform:scale(0)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
@keyframes barFill { from{width:0} }
`;
if (typeof document !== 'undefined' && !document.getElementById('apiguard-impact-kf')) {
  const s = document.createElement('style'); s.id = 'apiguard-impact-kf'; s.textContent = KEYFRAMES; document.head.appendChild(s);
}

export default function ApiImpactSummary() {
  const { isReady, getToolOutput, callTool, sendFollowUpMessage } = useWidgetSDK();
  const sdkOutput = isReady ? unwrapToolResult(getToolOutput()) : null;
  const [data, setData] = useState<Assessment | null>(sdkOutput ?? PREVIEW_DATA);
  const [reason, setReason] = useState('The React and Python consumers still rely on the old contract.');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isPreviewMode = !isReady;

  useEffect(() => { if (isReady) { const live = unwrapToolResult(getToolOutput()); if (live) setData(live); } }, [isReady]);

  async function callDecision(decision: 'APPROVE' | 'BLOCK') {
    if (!data || isPreviewMode) return;
    setBusy(true); setError('');
    try {
      const result = await callTool('record_release_decision', { assessmentId: data.id, expectedVersion: data.version, decision, reason: decision === 'BLOCK' ? reason : undefined, idempotencyKey: `${data.id}:${decision.toLowerCase()}:v${data.version}` });
      const updated = unwrapToolResult(result); if (updated) setData(updated);
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); } finally { setBusy(false); }
  }

  async function sendFallback() {
    if (!data) return;
    try { await sendFollowUpMessage(`Block assessment ${data.id} because ${reason}`); } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
  }

  if (!data) return <div style={{ padding: 20, fontSize: 13, color: '#667085' }}>Loading assessment...</div>;

  const breakingCount = data.changes.filter(c => c.breaking).length;
  const nonBreakingCount = data.changes.filter(c => !c.breaking).length;
  const impactedRepos = new Set(data.evidence.map(e => e.repository)).size;

  return (
    <main style={S.widget}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, animation: 'fadeUp 350ms ease-out both' }}>
        <div>
          <div style={S.eyebrow}>APIGuard Release Evidence</div>
          <h1 style={S.title}>Consumer impact assessment</h1>
          <div style={S.subtitle}>{data.id}</div>
        </div>
        <span style={badge(data.overallSeverity)}>{data.overallSeverity}</span>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 24, animation: 'fadeUp 400ms ease-out 100ms both' }}>
        <DonutChart
          slices={[
            { value: breakingCount, color: '#d92d20', label: 'Breaking' },
            { value: nonBreakingCount, color: '#12b76a', label: 'Non-breaking' },
          ]}
          size={90} thickness={10}
          center={<span style={{ fontSize: 20, fontWeight: 800, color: '#101828' }}>{data.changes.length}</span>}
        />
        <div style={{ flex: 1 }}>
          <SeverityBar high={breakingCount} medium={0} low={nonBreakingCount} animDelay={200} />
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: '#475467' }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#d92d20', marginRight: 4 }} />{breakingCount} breaking</span>
            <span style={{ fontSize: 11, color: '#475467' }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#12b76a', marginRight: 4 }} />{nonBreakingCount} safe</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 20 }}>
        <MetricCard label="Changes" value={data.changes.length} trend="up" trendLabel="+1 this run" animDelay={150} />
        <MetricCard label="Evidence" value={data.evidence.length} sparkValues={[2, 3, 3, data.evidence.length]} animDelay={200} />
        <MetricCard label="Repos" value={impactedRepos} animDelay={250} />
      </div>

      <div style={{ marginTop: 20, animation: 'fadeUp 400ms ease-out 300ms both' }}>
        <Timeline steps={[
          { label: 'Diff', status: 'done' },
          { label: 'Evidence', status: 'done' },
          { label: 'Risk', status: 'done' },
          { label: 'Decision', status: data.decisionStatus === 'PENDING' ? 'active' : 'done' },
        ]} animDelay={350} />
      </div>

      <section style={S.section}>
        <h2 style={S.sectionTitle}>Contract changes</h2>
        <div>
          {data.changes.map((change, i) => (
            <div key={change.id} style={{ padding: 14, paddingLeft: 16, background: '#f8f9fb', borderRadius: 6, marginBottom: 8, borderTop: `3px solid ${change.breaking ? '#d92d20' : '#12b76a'}`, animation: `fadeUp 300ms ease-out ${400 + i * 80}ms both` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <StatusDot status={change.breaking ? 'fail' : 'pass'} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#101828', fontFamily: fonts.mono }}>{change.code}</span>
              </div>
              <div style={{ fontSize: 12, color: '#475467', fontFamily: fonts.mono, marginBottom: 6 }}>
                {change.operation}{change.jsonPath ? ` \u00b7 ${change.jsonPath}` : ''}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#475467', lineHeight: 1.5 }}>{change.rationale}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={S.section}>
        <h2 style={S.sectionTitle}>Consumer evidence</h2>
        <div>
          {data.evidence.map((e, i) => {
            const isImpact = e.classification.includes('IMPACT');
            return (
              <div key={e.id} style={{ ...S.card, animation: `fadeUp 300ms ease-out ${500 + i * 80}ms both` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#101828' }}>{e.repository}</span>
                  <span style={pill(isImpact ? tokens.color.impactBg : tokens.color.safeBg, isImpact ? tokens.color.impactText : tokens.color.safeText)}>{e.classification}</span>
                </div>
                <div style={{ fontSize: 12, color: '#475467', fontFamily: fonts.mono, marginBottom: 6 }}>
                  {e.filePath}:{e.lineStart} &middot; {e.commitSha.slice(0, 8)}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#475467', lineHeight: 1.5 }}>{e.reasoning}</p>
              </div>
            );
          })}
        </div>
      </section>

      {data.limitations.length > 0 && (
        <section style={S.section}>
          <h2 style={S.sectionTitle}>Limitations</h2>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#475467', lineHeight: 1.6 }}>
            {data.limitations.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </section>
      )}

      {data.decisionStatus === 'PENDING' ? (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${tokens.border.default}`, animation: 'fadeUp 350ms ease-out 600ms both' }}>
          <label style={S.label}>Block reason</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} style={S.textarea} />
          <div style={S.buttonRow}>
            <button disabled={busy || isPreviewMode} onClick={() => callDecision('APPROVE')} style={buttonStyle('primary', busy || isPreviewMode)}>Approve release</button>
            <button disabled={busy || isPreviewMode} onClick={() => callDecision('BLOCK')} style={buttonStyle('danger', busy || isPreviewMode)}>Block pending migration</button>
          </div>
          {isPreviewMode && <div style={{ marginTop: 8, fontSize: 12, color: '#667085' }}>Actions disabled in preview. Open via Studio to interact.</div>}
          {error && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: tokens.color.errorBg, border: `1px solid ${tokens.color.errorBorder}`, color: tokens.color.errorText, fontSize: 13 }}>
              {error}<br />
              <button onClick={sendFallback} style={{ marginTop: 8, padding: '6px 10px', border: `1px solid ${tokens.border.input}`, borderRadius: 6, background: '#fff', color: '#344054', fontSize: 12, cursor: 'pointer' }}>Send typed-chat fallback</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 28, padding: 16, borderRadius: 8, background: tokens.color.decisionBg, border: `1px solid ${tokens.color.decisionBorder}`, animation: 'fadeUp 350ms ease-out 600ms both' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: tokens.color.decisionText, marginBottom: 4 }}>{data.decisionStatus}</div>
          {data.decision?.reason && <p style={{ margin: 0, fontSize: 13, color: '#475467', lineHeight: 1.5 }}>{data.decision.reason}</p>}
        </div>
      )}
    </main>
  );
}
