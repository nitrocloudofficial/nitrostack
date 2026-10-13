'use client';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

interface BatchAnalysis {
  batch_label: string;
  narrative_entropy: 'low' | 'medium' | 'high';
  technical_hits: number;
  hype_hits: number;
  hype_ratio: number;
}

interface NarrativeShiftData {
  ticker: string;
  batch_analysis: BatchAnalysis[];
  trend: 'improving' | 'stable' | 'degrading';
  trend_explanation: string;
  recommendation: string;
}

const ENTROPY_COLORS: Record<string, { bg: string; fg: string; icon: string }> = {
  low:    { bg: 'rgba(104,211,145,0.12)', fg: '#68d391', icon: '✓' },
  medium: { bg: 'rgba(248,168,89,0.12)',  fg: '#f8a859', icon: '~' },
  high:   { bg: 'rgba(252,129,129,0.12)', fg: '#fc8181', icon: '⚠' },
};

const TREND_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  improving: { icon: '↑', color: '#68d391', bg: 'rgba(104,211,145,0.12)', label: 'Improving' },
  stable:    { icon: '→', color: '#f8a859', bg: 'rgba(248,168,89,0.12)',  label: 'Stable' },
  degrading: { icon: '↓', color: '#fc8181', bg: 'rgba(252,129,129,0.12)', label: 'Degrading' },
};

function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
        background: bg,
        color: fg,
      }}
    >
      {label}
    </span>
  );
}

function BarChart({ technical, hype }: { technical: number; hype: number }) {
  const total = technical + hype || 1;
  const techPct = (technical / total) * 100;
  const hypePct = (hype / total) * 100;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: '4px', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${techPct}%`, background: '#63b3ed', borderRadius: '3px', transition: 'width 0.6s ease' }} />
        <div style={{ width: `${hypePct}%`, background: '#fc8181', borderRadius: '3px', transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', fontFamily: "'JetBrains Mono', monospace" }}>
        <span style={{ color: '#63b3ed' }}>Technical {technical}</span>
        <span style={{ color: '#fc8181' }}>Hype {hype}</span>
      </div>
    </div>
  );
}

export default function DetectNarrativeShift() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [state] = useWidgetState<{}>(() => ({}));

  const data = getToolOutput<NarrativeShiftData>();
  const isDark = theme === 'dark';

  if (!data) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        color: isDark ? '#8a9bb0' : '#4a5568',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '13px',
      }}>
        Waiting for narrative analysis...
      </div>
    );
  }

  const surfaceBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const textPrimary = isDark ? '#e2e8f0' : '#1a202c';
  const textSecondary = isDark ? '#8a9bb0' : '#4a5568';
  const textMuted = isDark ? '#4a5568' : '#a0aec0';
  const trend = TREND_CONFIG[data.trend] ?? TREND_CONFIG.stable;

  return (
    <div style={{
      padding: '24px',
      background: isDark
        ? 'linear-gradient(135deg, #0d1420 0%, #080c14 100%)'
        : 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
      borderRadius: '16px',
      color: textPrimary,
      fontFamily: "'Inter', system-ui, sans-serif",
      maxWidth: '600px',
      boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.08)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #68d391 0%, #38a169 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
          }}>
            📊
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>
              Narrative Shift Detection
            </div>
            <div style={{
              fontSize: '11px',
              color: textSecondary,
              fontFamily: "'JetBrains Mono', monospace",
              marginTop: '1px',
            }}>
              Vocabulary drift analysis
            </div>
          </div>
        </div>
        <Badge label={data.ticker} bg="rgba(99,179,237,0.12)" fg="#63b3ed" />
      </div>

      {/* Batch Analysis Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {data.batch_analysis.map((batch, idx) => {
          const entropy = ENTROPY_COLORS[batch.narrative_entropy] ?? ENTROPY_COLORS.low;
          return (
            <div
              key={batch.batch_label}
              style={{
                padding: '14px 16px',
                background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                border: `1px solid ${borderColor}`,
                borderRadius: '12px',
                animation: `fadeSlideIn 0.4s ease ${idx * 80}ms both`,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: textPrimary,
                }}>
                  {batch.batch_label}
                </span>
                <Badge label={`${entropy.icon} ${batch.narrative_entropy}`} bg={entropy.bg} fg={entropy.fg} />
              </div>
              <BarChart technical={batch.technical_hits} hype={batch.hype_hits} />
              <div style={{
                marginTop: '8px',
                fontSize: '11px',
                fontFamily: "'JetBrains Mono', monospace",
                color: textSecondary,
                textAlign: 'right',
              }}>
                Hype Ratio: {(batch.hype_ratio * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        background: trend.bg,
        border: `1px solid ${trend.color}20`,
        borderRadius: '12px',
        marginBottom: '16px',
      }}>
        <div style={{
          fontSize: '36px',
          fontWeight: 800,
          color: trend.color,
          lineHeight: 1,
        }}>
          {trend.icon}
        </div>
        <div>
          <div style={{
            fontSize: '15px',
            fontWeight: 800,
            color: trend.color,
          }}>
            {trend.label}
          </div>
          <div style={{
            fontSize: '12px',
            color: textSecondary,
            marginTop: '2px',
          }}>
            Narrative trend over recent batches
          </div>
        </div>
      </div>

      {/* Explanation Box */}
      <div style={{
        padding: '14px 16px',
        background: 'rgba(99,179,237,0.06)',
        border: '1px solid rgba(99,179,237,0.15)',
        borderRadius: '10px',
        marginBottom: '12px',
      }}>
        <div style={{
          fontSize: '9px',
          fontWeight: 700,
          color: '#63b3ed',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.6px',
          marginBottom: '6px',
        }}>
          Trend Explanation
        </div>
        <div style={{
          fontSize: '12px',
          lineHeight: 1.6,
          color: textSecondary,
        }}>
          {data.trend_explanation}
        </div>
      </div>

      {/* Recommendation Box */}
      <div style={{
        padding: '14px 16px',
        background: isDark ? 'rgba(104,211,145,0.06)' : 'rgba(56,161,105,0.06)',
        border: `1px solid ${isDark ? 'rgba(104,211,145,0.15)' : 'rgba(56,161,105,0.15)'}`,
        borderRadius: '10px',
        marginBottom: '16px',
      }}>
        <div style={{
          fontSize: '9px',
          fontWeight: 700,
          color: '#68d391',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.6px',
          marginBottom: '6px',
        }}>
          Recommendation
        </div>
        <div style={{
          fontSize: '12px',
          lineHeight: 1.6,
          color: textSecondary,
        }}>
          {data.recommendation}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        fontSize: '10px',
        textAlign: 'center',
        color: textMuted,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        ✨ NitroSignal Scout Agent
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
