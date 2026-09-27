'use client';

import { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { tokens, fonts, S, pill } from '../../lib/theme';
import { ProgressRing, StatusDot, MetricCard } from '../../lib/charts';

type PolicyResult = {
  evaluationId: string;
  assessmentId: string;
  policyProfile: 'STRICT' | 'BALANCED';
  policyVersion: string;
  verdict: 'ALLOW' | 'BLOCK' | 'MANUAL_REVIEW';
  rules: Array<{ ruleId: string; result: 'PASS' | 'FAIL' | 'UNKNOWN' | 'SKIPPED'; effect: string; explanation: string; evidenceRefs: string[] }>;
  evaluatedAt: string;
};

const PREVIEW: PolicyResult = {
  evaluationId: 'pol_preview', assessmentId: 'asm_preview', policyProfile: 'STRICT', policyVersion: '1.0.0', verdict: 'BLOCK',
  evaluatedAt: new Date().toISOString(),
  rules: [
    { ruleId: 'no-breaking-high', result: 'FAIL', effect: 'BLOCK', explanation: 'Assessment contains HIGH severity breaking changes.', evidenceRefs: ['chg_preview_1'] },
    { ruleId: 'evidence-threshold', result: 'PASS', effect: 'NONE', explanation: 'At least one evidence item found per breaking change.', evidenceRefs: ['ev_preview'] },
    { ruleId: 'ownership-resolved', result: 'FAIL', effect: 'MANUAL_REVIEW', explanation: 'Not all impacted files have resolved owners.', evidenceRefs: [] },
    { ruleId: 'no-unreviewed-changes', result: 'PASS', effect: 'NONE', explanation: 'All changes have been through diff analysis.', evidenceRefs: [] },
  ],
};

function unwrap(value: unknown): PolicyResult | null {
  if (!value) return null;
  const c = value as { structuredContent?: unknown; data?: unknown };
  return (c?.structuredContent ?? c?.data ?? value) as PolicyResult;
}

const VERDICT_STYLES: Record<string, { bg: string; border: string; fg: string; icon: string }> = {
  ALLOW: { bg: '#f0fdf4', border: '#a6f4c5', fg: '#067647', icon: '\u2713' },
  BLOCK: { bg: '#fef3f2', border: '#fecdca', fg: '#b42318', icon: '\u2717' },
  MANUAL_REVIEW: { bg: '#fffaeb', border: '#f79009', fg: '#b54708', icon: '\u25cf' },
};

const KF = `@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes popIn{0%{transform:scale(0)}60%{transform:scale(1.15)}100%{transform:scale(1)}}@keyframes scaleIn{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}`;
if (typeof document !== 'undefined' && !document.getElementById('apiguard-policy-kf')) { const s = document.createElement('style'); s.id = 'apiguard-policy-kf'; s.textContent = KF; document.head.appendChild(s); }

export default function PolicyEvaluation() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const sdkOutput = isReady ? unwrap(getToolOutput()) : null;
  const [data] = useState<PolicyResult>(sdkOutput ?? PREVIEW);
  const isPreview = !isReady;
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const passCount = data.rules.filter(r => r.result === 'PASS').length;
  const failCount = data.rules.filter(r => r.result === 'FAIL').length;
  const skipCount = data.rules.filter(r => r.result === 'SKIPPED' || r.result === 'UNKNOWN').length;
  const vs = VERDICT_STYLES[data.verdict] || VERDICT_STYLES.MANUAL_REVIEW;

  const RULE_RESULT_MAP: Record<string, { status: 'pass' | 'fail' | 'warn' | 'skip' }> = {
    PASS: { status: 'pass' }, FAIL: { status: 'fail' }, UNKNOWN: { status: 'warn' }, SKIPPED: { status: 'skip' },
  };

  return (
    <main style={S.widget}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, animation: 'fadeUp 350ms ease-out both' }}>
        <div>
          <div style={S.eyebrow}>Policy Evaluation</div>
          <h1 style={S.title}>Release policy</h1>
          <div style={S.subtitle}>{data.evaluationId}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={pill(data.policyProfile === 'STRICT' ? '#fef3f2' : '#f0fdf4', data.policyProfile === 'STRICT' ? '#b42318' : '#067647')}>{data.policyProfile}</span>
        </div>
      </header>

      <div style={{ marginTop: 24, padding: 20, borderRadius: 10, background: vs.bg, border: `2px solid ${vs.border}`, animation: 'scaleIn 400ms ease-out 100ms both', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: vs.fg, lineHeight: 1 }}>{vs.icon}</div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: vs.fg }}>{data.verdict.replace(/_/g, ' ')}</div>
          <div style={{ fontSize: 13, color: '#475467', marginTop: 2 }}>{passCount} passed, {failCount} failed, {skipCount} skipped</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <ProgressRing value={passCount} max={data.rules.length} size={72} thickness={7} color={vs.fg} label="score" animDelay={300} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 20 }}>
        <MetricCard label="Passed" value={passCount} animDelay={150} />
        <MetricCard label="Failed" value={failCount} trend={failCount > 0 ? 'up' : 'flat'} animDelay={200} />
        <MetricCard label="Policy" value={data.policyVersion} animDelay={250} />
      </div>

      <section style={S.section}>
        <h2 style={S.sectionTitle}>Rule results</h2>
        <div>
          {data.rules.map((rule, i) => {
            const rm = RULE_RESULT_MAP[rule.result] || { status: 'warn' as const };
            const isExpanded = expandedRule === rule.ruleId;
            const borderColor = rm.status === 'pass' ? '#a6f4c5' : rm.status === 'fail' ? '#fecdca' : '#eaecf0';
            return (
              <div key={rule.ruleId} onClick={() => setExpandedRule(isExpanded ? null : rule.ruleId)} style={{ ...S.card, cursor: 'pointer', borderColor, transition: 'border-color 200ms', animation: `fadeUp 300ms ease-out ${350 + i * 80}ms both` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StatusDot status={rm.status} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#101828', flex: 1 }}>{rule.ruleId}</span>
                  <span style={{ fontSize: 11, fontFamily: fonts.mono, color: '#667085' }}>{rule.effect}</span>
                  <span style={{ fontSize: 11, color: '#98a2b3', transition: 'transform 200ms', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>{'\u25bc'}</span>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${tokens.border.default}`, animation: 'fadeUp 200ms ease-out both' }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#475467', lineHeight: 1.5 }}>{rule.explanation}</p>
                    {rule.evidenceRefs.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                        {rule.evidenceRefs.map((ref, j) => (
                          <span key={j} style={{ fontSize: 11, fontFamily: fonts.mono, padding: '2px 6px', borderRadius: 4, background: '#f8f9fb', border: `1px solid ${tokens.border.default}`, color: '#667085' }}>{ref}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div style={{ marginTop: 16, fontSize: 12, color: '#667085', animation: 'fadeUp 300ms ease-out 600ms both' }}>
        Evaluated at {new Date(data.evaluatedAt).toLocaleString()}
      </div>
    </main>
  );
}
