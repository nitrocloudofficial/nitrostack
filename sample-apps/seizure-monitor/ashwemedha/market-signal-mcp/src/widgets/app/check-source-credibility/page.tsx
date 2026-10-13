'use client';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

interface CredibilityData {
  credibility_tier: 'high' | 'medium' | 'low' | 'unknown';
  is_press_release_mill: boolean;
  credibility_score: number;
  check_result: 'pass' | 'flagged';
  reason: string;
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

export default function CheckSourceCredibility() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [state] = useWidgetState<{}>(() => ({}));

  const data = getToolOutput<CredibilityData>();
  const isDark = theme === 'dark';

  if (!data) {
    return (
      <div style={{
        padding: '32px', textAlign: 'center',
        color: isDark ? '#8a9bb0' : '#4a5568',
        fontFamily: "'JetBrains Mono', monospace", fontSize: '13px',
      }}>
        Waiting for credibility results...
      </div>
    );
  }

  const textPrimary = isDark ? '#e2e8f0' : '#1a202c';
  const textSecondary = isDark ? '#8a9bb0' : '#4a5568';
  const textMuted = isDark ? '#4a5568' : '#a0aec0';
  const surfaceBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';

  const isPass = data.check_result === 'pass';
  const resultBg = isPass ? 'rgba(104,211,145,0.15)' : 'rgba(252,129,129,0.15)';
  const resultFg = isPass ? '#68d391' : '#fc8181';
  const resultLabel = isPass ? 'PASS' : 'FLAGGED';
  const resultIcon = isPass ? '✅' : '🚨';

  const tierColors: Record<string, { bg: string; fg: string }> = {
    high: { bg: 'rgba(104,211,145,0.15)', fg: '#68d391' },
    medium: { bg: 'rgba(248,168,89,0.15)', fg: '#f8a859' },
    low: { bg: 'rgba(252,129,129,0.15)', fg: '#fc8181' },
    unknown: { bg: 'rgba(160,174,192,0.10)', fg: '#a0aec0' },
  };
  const tier = tierColors[data.credibility_tier] ?? tierColors.unknown;

  const scorePct = Math.max(0, Math.min(100, data.credibility_score));
  const scoreColor = scorePct > 70 ? '#68d391' : scorePct >= 40 ? '#f8a859' : '#fc8181';

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
        }}>🔎</div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>
            Source Credibility Check
          </div>
          <div style={{
            fontSize: '11px', color: textSecondary,
            fontFamily: "'JetBrains Mono', monospace", marginTop: '1px',
          }}>
            News source verification
          </div>
        </div>
      </div>

      {/* Check result banner */}
      <div style={{
        padding: '16px 20px', borderRadius: '12px',
        background: resultBg, border: `1px solid ${resultFg}30`,
        marginBottom: '16px', textAlign: 'center',
      }}>
        <div style={{
          fontSize: '14px', fontWeight: 700, color: resultFg,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {resultIcon} {resultLabel}
        </div>
      </div>

      {/* Credibility tier */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: surfaceBg, border: `1px solid ${borderColor}`,
        borderRadius: '10px', marginBottom: '12px',
      }}>
        <span style={{
          fontSize: '11px', color: textMuted, fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' as const,
          letterSpacing: '0.5px',
        }}>Credibility Tier</span>
        <Badge label={data.credibility_tier} bg={tier.bg} fg={tier.fg} />
      </div>

      {/* Score bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginBottom: '6px',
        }}>
          <span style={{
            fontSize: '11px', color: textMuted, fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
          }}>Credibility Score</span>
          <span style={{
            fontSize: '11px', color: scoreColor, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
          }}>{data.credibility_score}/100</span>
        </div>
        <div style={{
          height: '8px', borderRadius: '4px',
          background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
        }}>
          <div style={{
            width: `${scorePct}%`, height: '100%', borderRadius: '4px',
            background: scoreColor, transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Press release mill warning */}
      {data.is_press_release_mill && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px',
          background: 'rgba(252,129,129,0.10)',
          border: '1px solid rgba(252,129,129,0.20)',
          marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ fontSize: '14px' }}>⚠️</span>
          <span style={{
            fontSize: '12px', fontWeight: 600, color: '#fc8181',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Warning: This source is flagged as a press release mill
          </span>
        </div>
      )}

      {/* Reason */}
      <div style={{
        padding: '14px 16px', borderRadius: '10px',
        background: surfaceBg, border: `1px solid ${borderColor}`, marginBottom: '16px',
      }}>
        <div style={{
          fontSize: '9px', fontWeight: 700, color: '#63b3ed',
          textTransform: 'uppercase' as const, letterSpacing: '0.6px', marginBottom: '6px',
        }}>Reason</div>
        <div style={{
          fontSize: '12px', lineHeight: 1.6, color: textSecondary,
        }}>{data.reason}</div>
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
