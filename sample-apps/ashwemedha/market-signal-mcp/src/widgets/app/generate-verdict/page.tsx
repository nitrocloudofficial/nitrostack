'use client';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

interface VerdictData {
  ticker: string;
  timestamp: string;
  challenges_raised: string[];
  credibility_check: 'pass' | 'flagged';
  recycled_content_check: 'pass' | 'flagged';
  volume_context_check: 'organic' | 'explained_by_calendar_event';
  final_verdict: 'confirmed_signal' | 'weakened_signal' | 'rejected_signal';
  verdict_reasoning: string;
}

function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '999px', fontSize: '11px',
      fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
      textTransform: 'uppercase' as const, letterSpacing: '0.5px',
      background: bg, color: fg,
    }}>{label}</span>
  );
}

export default function GenerateVerdict() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [state] = useWidgetState<{}>(() => ({}));

  const data = getToolOutput<VerdictData>();
  const isDark = theme === 'dark';

  if (!data) {
    return (
      <div style={{
        padding: '32px', textAlign: 'center',
        color: isDark ? '#8a9bb0' : '#4a5568',
        fontFamily: "'JetBrains Mono', monospace", fontSize: '13px',
      }}>
        Waiting for verdict results...
      </div>
    );
  }

  const textPrimary = isDark ? '#e2e8f0' : '#1a202c';
  const textSecondary = isDark ? '#8a9bb0' : '#4a5568';
  const textMuted = isDark ? '#4a5568' : '#a0aec0';
  const surfaceBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';

  const verdictStyles: Record<string, { bg: string; fg: string; border: string; label: string; icon: string }> = {
    confirmed_signal: {
      bg: 'rgba(104,211,145,0.12)', fg: '#68d391',
      border: 'rgba(104,211,145,0.3)', label: 'Confirmed Signal', icon: '✅',
    },
    weakened_signal: {
      bg: 'rgba(248,168,89,0.12)', fg: '#f8a859',
      border: 'rgba(248,168,89,0.3)', label: 'Weakened Signal', icon: '⚠️',
    },
    rejected_signal: {
      bg: 'rgba(252,129,129,0.12)', fg: '#fc8181',
      border: 'rgba(252,129,129,0.3)', label: 'Rejected Signal', icon: '❌',
    },
  };
  const verdict = verdictStyles[data.final_verdict] ?? verdictStyles.rejected_signal;

  const credBg = data.credibility_check === 'pass' ? 'rgba(104,211,145,0.15)' : 'rgba(252,129,129,0.15)';
  const credFg = data.credibility_check === 'pass' ? '#68d391' : '#fc8181';
  const credIcon = data.credibility_check === 'pass' ? '✅' : '🚨';
  const credLabel = data.credibility_check === 'pass' ? 'Pass' : 'Flagged';

  const recycledBg = data.recycled_content_check === 'pass' ? 'rgba(104,211,145,0.15)' : 'rgba(252,129,129,0.15)';
  const recycledFg = data.recycled_content_check === 'pass' ? '#68d391' : '#fc8181';
  const recycledIcon = data.recycled_content_check === 'pass' ? '✅' : '🔁';
  const recycledLabel = data.recycled_content_check === 'pass' ? 'Pass' : 'Flagged';

  const volBg = data.volume_context_check === 'organic' ? 'rgba(104,211,145,0.15)' : 'rgba(248,168,89,0.15)';
  const volFg = data.volume_context_check === 'organic' ? '#68d391' : '#f8a859';
  const volIcon = data.volume_context_check === 'organic' ? '✅' : '📅';
  const volLabel = data.volume_context_check === 'organic' ? 'Organic' : 'Calendar';

  const formattedTime = (() => {
    try {
      return new Date(data.timestamp).toLocaleString();
    } catch {
      return data.timestamp;
    }
  })();

  return (
    <div style={{
      padding: '24px',
      background: isDark
        ? 'linear-gradient(135deg, #0d1420 0%, #080c14 100%)'
        : 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
      borderRadius: '16px', color: textPrimary,
      fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '600px',
      boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.08)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #63b3ed 0%, #3182ce 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
        }}>⚖️</div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>
            Skeptic Verdict
          </div>
          <div style={{
            fontSize: '11px', color: textSecondary,
            fontFamily: "'JetBrains Mono', monospace", marginTop: '1px',
          }}>
            Adversarial signal challenge
          </div>
        </div>
      </div>

      {/* Verdict banner */}
      <div style={{
        padding: '20px 24px', borderRadius: '12px',
        background: verdict.bg, border: `2px solid ${verdict.border}`,
        marginBottom: '20px', textAlign: 'center',
      }}>
        <div style={{
          fontSize: '20px', fontWeight: 800, color: verdict.fg,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {verdict.icon} {verdict.label}
        </div>
      </div>

      {/* Three check items */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: surfaceBg, border: `1px solid ${borderColor}`,
          borderRadius: '8px',
        }}>
          <span style={{
            fontSize: '11px', color: textMuted, fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
          }}>Source Credibility</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px' }}>{credIcon}</span>
            <Badge label={credLabel} bg={credBg} fg={credFg} />
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: surfaceBg, border: `1px solid ${borderColor}`,
          borderRadius: '8px',
        }}>
          <span style={{
            fontSize: '11px', color: textMuted, fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
          }}>Recycled Content</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px' }}>{recycledIcon}</span>
            <Badge label={recycledLabel} bg={recycledBg} fg={recycledFg} />
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: surfaceBg, border: `1px solid ${borderColor}`,
          borderRadius: '8px',
        }}>
          <span style={{
            fontSize: '11px', color: textMuted, fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
          }}>Volume Context</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px' }}>{volIcon}</span>
            <Badge label={volLabel} bg={volBg} fg={volFg} />
          </div>
        </div>
      </div>

      {/* Challenges */}
      {data.challenges_raised.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: '9px', fontWeight: 700, color: '#fc8181',
            textTransform: 'uppercase' as const, letterSpacing: '0.6px',
            marginBottom: '8px',
          }}>Challenges Raised</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {data.challenges_raised.map((challenge, i) => (
              <div key={i} style={{
                padding: '10px 14px', borderRadius: '8px',
                background: 'rgba(252,129,129,0.06)',
                border: '1px solid rgba(252,129,129,0.15)',
                borderLeft: '3px solid #fc8181',
              }}>
                <span style={{
                  fontSize: '12px', lineHeight: 1.5, color: textSecondary,
                }}>{challenge}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verdict reasoning */}
      <div style={{
        padding: '14px 16px', borderRadius: '10px',
        background: surfaceBg, border: `1px solid ${borderColor}`, marginBottom: '16px',
      }}>
        <div style={{
          fontSize: '9px', fontWeight: 700, color: '#63b3ed',
          textTransform: 'uppercase' as const, letterSpacing: '0.6px', marginBottom: '6px',
        }}>Verdict Reasoning</div>
        <div style={{
          fontSize: '12px', lineHeight: 1.6, color: textSecondary,
        }}>{data.verdict_reasoning}</div>
      </div>

      {/* Ticker and timestamp */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '16px',
      }}>
        <Badge label={data.ticker} bg="rgba(99,179,237,0.15)" fg="#63b3ed" />
        <span style={{
          fontSize: '10px', color: textMuted,
          fontFamily: "'JetBrains Mono', monospace",
        }}>{formattedTime}</span>
      </div>

      {/* Footer */}
      <div style={{
        fontSize: '10px', textAlign: 'center', color: textMuted,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        NitroSignal Skeptic Agent
      </div>
    </div>
  );
}
