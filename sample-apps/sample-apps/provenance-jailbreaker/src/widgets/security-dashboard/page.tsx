import React from 'react';
import type { WidgetState } from '../../modules/orchestrator/attacker-orchestrator.service.js';

export interface SecurityDashboardWidgetProps {
  state: WidgetState;
}

/**
 * Security Dashboard Live Verdict Widget Component
 * Primary File for Person D: security-dashboard/page.tsx
 * Renders real-time attempt state, scope guard badge, dual judge verdicts,
 * disagreement flags, and hash chain audit footer.
 */
export default function SecurityDashboardWidget({ state }: SecurityDashboardWidgetProps) {
  if (!state) {
    return (
      <div style={{ padding: '1.5rem', fontFamily: 'sans-serif', color: '#94a3b8', backgroundColor: '#0f172a', borderRadius: '8px' }}>
        No attempt data available.
      </div>
    );
  }

  const isBlocked = !state.scopeAuthorized;

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      borderRadius: '12px',
      border: '1px solid #1e293b',
      padding: '1.5rem',
      maxWidth: '650px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#38bdf8' }}>
            Provenance Guarded Red-Team Harness
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Sequence #{state.sequence} • {new Date(state.timestamp).toLocaleTimeString()}
          </span>
        </div>

        {/* Scope Check Badge */}
        <div style={{
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.8rem',
          fontWeight: 700,
          backgroundColor: isBlocked ? '#451a03' : '#064e3b',
          color: isBlocked ? '#f97316' : '#34d399',
          border: `1px solid ${isBlocked ? '#ea580c' : '#10b981'}`
        }}>
          {isBlocked ? '❌ SCOPE BLOCKED' : '✅ SCOPE AUTHORIZED'}
        </div>
      </div>

      {/* Scope Evidence Banner if Blocked */}
      {isBlocked && (
        <div style={{ backgroundColor: '#2a1215', borderLeft: '4px solid #ef4444', padding: '0.75rem', marginBottom: '1rem', borderRadius: '4px', fontSize: '0.85rem', color: '#fca5a5' }}>
          <strong>Scope Guard Intercept:</strong> {state.scopeEvidence}
        </div>
      )}

      {/* Mutation Strategy Badge */}
      {state.mutationStrategy && (
        <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
          <span style={{ color: '#94a3b8' }}>Attack Strategy: </span>
          <code style={{ backgroundColor: '#1e293b', padding: '0.2rem 0.4rem', borderRadius: '4px', color: '#f43f5e' }}>
            {state.mutationStrategy}
          </code>
        </div>
      )}

      {/* Target Model Output Card */}
      <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
          TARGET MODEL RESPONSE [{state.targetModel}]
        </div>
        <div style={{ fontSize: '0.9rem', color: isBlocked ? '#64748b' : '#e2e8f0', fontStyle: isBlocked ? 'italic' : 'normal' }}>
          {state.targetOutput}
        </div>
      </div>

      {/* Dual Judge Verdict Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {/* LLM Judge */}
        <div style={{ backgroundColor: '#1e293b', padding: '0.85rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>⚖️ LLM JUDGE</div>
          {state.llmJudge ? (
            <div>
              <span style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: state.llmJudge.verdict === 'jailbreak' ? '#ef4444' : '#10b981',
                textTransform: 'uppercase'
              }}>
                {state.llmJudge.verdict}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
                ({(state.llmJudge.confidence * 100).toFixed(0)}%)
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>N/A (Skipped)</span>
          )}
        </div>

        {/* Pattern Judge */}
        <div style={{ backgroundColor: '#1e293b', padding: '0.85rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>🔍 PATTERN JUDGE</div>
          {state.patternJudge ? (
            <div>
              <span style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: state.patternJudge.verdict === 'jailbreak' ? '#ef4444' : '#10b981',
                textTransform: 'uppercase'
              }}>
                {state.patternJudge.verdict}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
                ({(state.patternJudge.confidence * 100).toFixed(0)}%)
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>N/A (Skipped)</span>
          )}
        </div>
      </div>

      {/* Disagreement Warning Banner */}
      {state.flaggedForHumanReview && (
        <div style={{ backgroundColor: '#422006', border: '1px solid #ca8a04', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', color: '#fde047', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⚠️</span>
          <div>
            <strong>Judge Disagreement Flagged:</strong> Verdicts conflict. Entry escalated for human review (not auto-resolved).
          </div>
        </div>
      )}

      {/* Audit Chain Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
        <div>
          Hash: <code style={{ color: '#cbd5e1' }}>{state.hashPreview}</code>
        </div>
        <div style={{ color: state.hashChainValid ? '#10b981' : '#ef4444', fontWeight: 600 }}>
          {state.hashChainValid ? '🔒 Audit Chain: VALID' : '🚨 Audit Chain: TAMPERED'}
        </div>
      </div>
    </div>
  );
}
