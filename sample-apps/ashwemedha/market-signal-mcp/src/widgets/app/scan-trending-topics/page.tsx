'use client';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

interface HeadlineEntry {
  source: string;
  text: string;
  url: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_score: number;
  published_at?: string;
}

interface FindingEntry {
  ticker: string;
  resolved_from: string;
  company_name: string;
  timestamp: string;
  headlines: HeadlineEntry[];
  narrative_summary: string;
  mention_velocity: 'spiking' | 'steady' | 'declining';
  narrative_entropy?: 'low' | 'medium' | 'high';
}

interface ScanTrendingData {
  findings: FindingEntry[];
  scan_timestamp: string;
  source_used: 'live_api' | 'seed_fallback';
  message: string;
}

const SENTIMENT_COLORS: Record<string, { bg: string; fg: string }> = {
  positive: { bg: 'rgba(104,211,145,0.12)', fg: '#68d391' },
  negative: { bg: 'rgba(252,129,129,0.12)', fg: '#fc8181' },
  neutral:  { bg: 'rgba(160,174,192,0.10)', fg: '#a0aec0' },
};

const VELOCITY_COLORS: Record<string, { bg: string; fg: string; icon: string }> = {
  spiking:  { bg: 'rgba(252,129,129,0.12)', fg: '#fc8181', icon: '\u2B06' },
  steady:   { bg: 'rgba(160,174,192,0.10)', fg: '#a0aec0', icon: '\u2192' },
  declining:{ bg: 'rgba(99,179,237,0.10)',  fg: '#63b3ed', icon: '\u2B07' },
};

const ENTROPY_COLORS: Record<string, { bg: string; fg: string; icon: string }> = {
  low:    { bg: 'rgba(104,211,145,0.12)', fg: '#68d391', icon: '\u2713' },
  medium: { bg: 'rgba(248,168,89,0.12)',  fg: '#f8a859', icon: '~' },
  high:   { bg: 'rgba(252,129,129,0.12)', fg: '#fc8181', icon: '\u26A0' },
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

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(((score + 1) / 2) * 100);
  const color = score > 0.1 ? '#68d391' : score < -0.1 ? '#fc8181' : '#a0aec0';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
      <div
        style={{
          flex: 1,
          height: '4px',
          borderRadius: '2px',
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: '2px',
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <span
        style={{
          fontSize: '10px',
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          color,
          minWidth: '38px',
          textAlign: 'right',
        }}
      >
        {score >= 0 ? '+' : ''}{score.toFixed(2)}
      </span>
    </div>
  );
}

export default function ScanTrendingTopics() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ expandedTicker: string | null }>(() => ({
    expandedTicker: null,
  }));

  const data = getToolOutput<ScanTrendingData>();
  const isDark = theme === 'dark';

  if (!data) {
    return (
      <div
        style={{
          padding: '32px',
          textAlign: 'center',
          color: isDark ? '#8a9bb0' : '#4a5568',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '13px',
        }}
      >
        Waiting for scan results...
      </div>
    );
  }

  const surfaceBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const textPrimary = isDark ? '#e2e8f0' : '#1a202c';
  const textSecondary = isDark ? '#8a9bb0' : '#4a5568';
  const textMuted = isDark ? '#4a5568' : '#a0aec0';

  const sourceLabel = data.source_used === 'live_api' ? 'Live API' : 'Seed Fallback';
  const sourceColor = data.source_used === 'live_api' ? '#68d391' : '#f8a859';

  const expandedTicker = state?.expandedTicker ?? null;

  return (
    <div
      style={{
        padding: '24px',
        background: isDark
          ? 'linear-gradient(135deg, #0d1420 0%, #080c14 100%)'
          : 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
        borderRadius: '16px',
        color: textPrimary,
        fontFamily: "'Inter', system-ui, sans-serif",
        maxWidth: '600px',
        boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #63b3ed 0%, #3182ce 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            🔭
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>
              Scout Agent
            </div>
            <div
              style={{
                fontSize: '11px',
                color: textSecondary,
                fontFamily: "'JetBrains Mono', monospace",
                marginTop: '1px',
              }}
            >
              News &amp; sentiment scan
            </div>
          </div>
        </div>
        <Badge
          label={sourceLabel}
          bg={`${sourceColor}18`}
          fg={sourceColor}
        />
      </div>

      {/* Scan metadata */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '20px',
          padding: '10px 14px',
          background: surfaceBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          fontSize: '11px',
          fontFamily: "'JetBrains Mono', monospace",
          color: textMuted,
        }}
      >
        <span>
          {data.findings.length} ticker{data.findings.length !== 1 ? 's' : ''} scanned
        </span>
        <span style={{ opacity: 0.3 }}>|</span>
        <span>
          {new Date(data.scan_timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Ticker findings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {data.findings.map((finding, idx) => {
          const isExpanded = true;
          const velocity = VELOCITY_COLORS[finding.mention_velocity] ?? VELOCITY_COLORS.steady;
          const entropy = finding.narrative_entropy
            ? ENTROPY_COLORS[finding.narrative_entropy]
            : null;

          return (
            <div
              key={finding.ticker}
              style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                border: `1px solid ${borderColor}`,
                borderRadius: '12px',
                overflow: 'hidden',
                animation: `fadeSlideIn 0.4s ease ${idx * 80}ms both`,
              }}
            >
              {/* Ticker header */}
              <button
                onClick={() =>
                  setState({ expandedTicker: isExpanded ? null : finding.ticker })
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '14px 16px',
                  background: 'none',
                  border: 'none',
                  color: textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderBottom: isExpanded ? `1px solid ${borderColor}` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 800,
                      fontSize: '15px',
                      color: '#63b3ed',
                    }}
                  >
                    {finding.ticker}
                  </span>
                  {finding.resolved_from &&
                    finding.resolved_from.toUpperCase() !== finding.ticker && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: textMuted,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        from &ldquo;{finding.resolved_from}&rdquo;
                      </span>
                    )}
                  <span style={{ fontSize: '11px', color: textSecondary }}>
                    {finding.company_name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Badge
                    label={`${velocity.icon} ${finding.mention_velocity}`}
                    bg={velocity.bg}
                    fg={velocity.fg}
                  />
                  {entropy && (
                    <Badge
                      label={`${entropy.icon} ${finding.narrative_entropy}`}
                      bg={entropy.bg}
                      fg={entropy.fg}
                    />
                  )}
                  <span
                    style={{
                      fontSize: '14px',
                      color: textMuted,
                      transition: 'transform 0.2s',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    ▾
                  </span>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ padding: '14px 16px' }}>
                  {/* Headlines */}
                  {finding.headlines.map((h, i) => {
                    const sColor = SENTIMENT_COLORS[h.sentiment] ?? SENTIMENT_COLORS.neutral;
                    return (
                      <div
                        key={i}
                        style={{
                          padding: '10px 12px',
                          background: surfaceBg,
                          border: `1px solid ${borderColor}`,
                          borderRadius: '8px',
                          marginBottom: i < finding.headlines.length - 1 ? '8px' : 0,
                          animation: `fadeSlideIn 0.3s ease ${i * 60}ms both`,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '6px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              color: textMuted,
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.5px',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            {h.source}
                          </span>
                          <Badge
                            label={`${h.sentiment_score >= 0 ? '+' : ''}${h.sentiment_score.toFixed(2)} ${h.sentiment}`}
                            bg={sColor.bg}
                            fg={sColor.fg}
                          />
                        </div>
                        <a
                          href={h.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '13px',
                            lineHeight: 1.5,
                            color: textPrimary,
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.color = '#63b3ed';
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.color = textPrimary;
                          }}
                        >
                          {h.text}
                        </a>
                        <div style={{ marginTop: '6px' }}>
                          <ScoreBar score={h.sentiment_score} />
                        </div>
                      </div>
                    );
                  })}

                  {/* Narrative summary */}
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px 14px',
                      background: 'rgba(99,179,237,0.06)',
                      border: '1px solid rgba(99,179,237,0.15)',
                      borderRadius: '8px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: '#63b3ed',
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.6px',
                        marginBottom: '6px',
                      }}
                    >
                      Narrative Summary
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        lineHeight: 1.6,
                        color: textSecondary,
                      }}
                    >
                      {finding.narrative_summary}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: '16px',
          fontSize: '10px',
          textAlign: 'center',
          color: textMuted,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
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
