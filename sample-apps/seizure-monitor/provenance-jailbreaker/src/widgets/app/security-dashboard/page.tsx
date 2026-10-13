'use client';

export interface WidgetState {
  sequence:             number;
  timestamp:            string;
  scopeAuthorized:      boolean;
  scopeEvidence:        string;
  targetModel:          string;
  targetOutput:         string;
  llmJudge:             { verdict: string; confidence: number } | null;
  patternJudge:         { verdict: string; confidence: number } | null;
  flaggedForHumanReview: boolean;
  hashChainValid:        boolean;
  hashPreview:           string;
  mutationStrategy?:     string;
}

export interface SecurityDashboardWidgetProps {
  state?: WidgetState;
}

/**
 * Warden AI Red Team Console Widget (React / Next.js)
 * Implements the dark-themed Warden Console design system with Space Grotesk/Inter fonts,
 * real-time ScopeGuard status, dual judge verdicts, human escalation alerts, and SHA-256 audit chain.
 */
export default function SecurityDashboardWidget({ state }: SecurityDashboardWidgetProps) {
  if (!state) {
    return (
      <div style={{
        padding: '2rem',
        fontFamily: "'Inter', sans-serif",
        color: '#8A93A8',
        backgroundColor: '#0A0C10',
        borderRadius: '12px',
        border: '1px solid #1B202A',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🛡️ Warden Console</div>
        <div style={{ fontSize: '0.875rem' }}>No red-team attempt data active. Launch a test run to inspect telemetry.</div>
      </div>
    );
  }

  const isBlocked = !state.scopeAuthorized;

  return (
    <div style={{
      fontFamily: "'Inter', sans-serif",
      backgroundColor: '#0A0C10',
      color: '#E9EBF1',
      borderRadius: '16px',
      border: '1px solid #1B202A',
      padding: '1.75rem',
      maxWidth: '750px',
      boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)'
    }}>
      {/* Warden Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #1B202A', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #7C6CFF, #FF4D5E)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: '14px',
            color: '#fff'
          }}>
            W
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: '#E9EBF1' }}>
              Warden AI Red Team Console
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#565E70', fontFamily: "'JetBrains Mono', monospace" }}>
              Sequence #{state.sequence} • {new Date(state.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Scope Check Status Badge */}
        <div style={{
          padding: '0.4rem 0.85rem',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          backgroundColor: isBlocked ? 'rgba(255, 77, 94, 0.12)' : 'rgba(51, 209, 138, 0.12)',
          color: isBlocked ? '#FF4D5E' : '#33D17A',
          border: `1px solid ${isBlocked ? 'rgba(255, 77, 94, 0.3)' : 'rgba(51, 209, 138, 0.3)'}`
        }}>
          {isBlocked ? '❌ SCOPE BLOCKED' : '✅ SCOPE AUTHORIZED'}
        </div>
      </div>

      {/* Scope Evidence Interdictor Alert */}
      {isBlocked && (
        <div style={{
          backgroundColor: 'rgba(255, 59, 87, 0.1)',
          borderLeft: '4px solid #FF3B57',
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem',
          borderRadius: '6px',
          fontSize: '0.85rem',
          color: '#FF8A9A'
        }}>
          <strong>ScopeGuard Interdictor:</strong> {state.scopeEvidence}
        </div>
      )}

      {/* Attack Mutation Strategy Badge */}
      {state.mutationStrategy && (
        <div style={{ marginBottom: '1.25rem', fontSize: '0.825rem', color: '#8A93A8' }}>
          <span>Attacker Mutation Strategy: </span>
          <code style={{
            backgroundColor: '#12151C',
            border: '1px solid #242A36',
            padding: '0.25rem 0.5rem',
            borderRadius: '6px',
            color: '#FF4D5E',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600
          }}>
            {state.mutationStrategy}
          </code>
        </div>
      )}

      {/* Target Model Output Console Card */}
      <div style={{
        backgroundColor: '#12151C',
        border: '1px solid #1B202A',
        padding: '1.1rem',
        borderRadius: '10px',
        marginBottom: '1.25rem'
      }}>
        <div style={{ fontSize: '0.725rem', color: '#565E70', marginBottom: '0.4rem', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
          TARGET MODEL INFERENCE [{state.targetModel}]
        </div>
        <div style={{
          fontSize: '0.9rem',
          color: isBlocked ? '#565E70' : '#E9EBF1',
          fontStyle: isBlocked ? 'italic' : 'normal',
          lineHeight: 1.5
        }}>
          {state.targetOutput}
        </div>
      </div>

      {/* Dual Judge Evaluation Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* LLM Judge */}
        <div style={{ backgroundColor: '#12151C', padding: '1rem', borderRadius: '10px', border: '1px solid #1B202A' }}>
          <div style={{ fontSize: '0.725rem', color: '#8A93A8', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.5px' }}>
            ⚖️ LLM JUDGE (qwen2.5:3b)
          </div>
          {state.llmJudge ? (
            <div>
              <span style={{
                fontWeight: 700,
                fontSize: '1rem',
                color: state.llmJudge.verdict === 'jailbreak' ? '#FF4D5E' : '#33D17A',
                textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono', monospace"
              }}>
                {state.llmJudge.verdict}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#565E70', marginLeft: '0.5rem', fontFamily: "'JetBrains Mono', monospace" }}>
                ({(state.llmJudge.confidence * 100).toFixed(0)}%)
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '0.85rem', color: '#565E70' }}>N/A (Blocked)</span>
          )}
        </div>

        {/* Pattern Judge */}
        <div style={{ backgroundColor: '#12151C', padding: '1rem', borderRadius: '10px', border: '1px solid #1B202A' }}>
          <div style={{ fontSize: '0.725rem', color: '#8A93A8', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.5px' }}>
            🔍 PATTERN JUDGE (Embedding + Regex)
          </div>
          {state.patternJudge ? (
            <div>
              <span style={{
                fontWeight: 700,
                fontSize: '1rem',
                color: state.patternJudge.verdict === 'jailbreak' ? '#FF4D5E' : '#33D17A',
                textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono', monospace"
              }}>
                {state.patternJudge.verdict}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#565E70', marginLeft: '0.5rem', fontFamily: "'JetBrains Mono', monospace" }}>
                ({(state.patternJudge.confidence * 100).toFixed(0)}%)
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '0.85rem', color: '#565E70' }}>N/A (Blocked)</span>
          )}
        </div>
      </div>

      {/* Disagreement Escalation Banner */}
      {state.flaggedForHumanReview && (
        <div style={{
          backgroundColor: 'rgba(245, 179, 65, 0.1)',
          border: '1px solid rgba(245, 179, 65, 0.3)',
          padding: '0.85rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          color: '#F5B341',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          <div>
            <strong>Judge Disagreement Flagged:</strong> LLM Judge and Pattern Judge verdicts conflict. Entry escalated for human review (not auto-resolved).
          </div>
        </div>
      )}

      {/* Audit Chain Footer */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid #1B202A',
        paddingTop: '0.85rem',
        fontSize: '0.75rem',
        color: '#565E70',
        fontFamily: "'JetBrains Mono', monospace"
      }}>
        <div>
          SHA-256 Hash: <code style={{ color: '#8A93A8' }}>{state.hashPreview}</code>
        </div>
        <div style={{
          color: state.hashChainValid ? '#33D17A' : '#FF3B57',
          fontWeight: 700
        }}>
          {state.hashChainValid ? '🔒 Audit Chain: VALID' : '🚨 Audit Chain: TAMPERED'}
        </div>
      </div>
    </div>
  );
}
