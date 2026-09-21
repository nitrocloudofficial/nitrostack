'use client';
import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

interface CrossCheckData {
  ticker: string;
  price_reaction: 'already_moved' | 'moving_now' | 'not_yet_reacted';
  price_change_since_news_pct: number;
  volume_ratio: number;
  reasoning: string;
  findings_timestamp?: string;
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

export default function CrossCheckPriceAction() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const output = getToolOutput<CrossCheckData>();
  const isDark = theme === 'dark';

  if (!output) {
    return (
      <div style={{
        padding: '24px', textAlign: 'center', maxWidth: '600px', borderRadius: '16px',
        background: isDark ? 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
      }}>Loading...</div>
    );
  }

  const d = output;
  const reactionConfig: Record<string, { label: string; bg: string; fg: string; desc: string }> = {
    already_moved: { label: 'Already Moved', bg: 'rgba(252,129,129,0.25)', fg: '#fc8181', desc: 'Price has already reacted significantly' },
    moving_now: { label: 'Moving Now', bg: 'rgba(248,168,89,0.25)', fg: '#f8a859', desc: 'Price is currently reacting' },
    not_yet_reacted: { label: 'Not Yet Reacted', bg: 'rgba(104,211,145,0.25)', fg: '#68d391', desc: 'Price has not yet moved in response' },
  };
  const rc = reactionConfig[d.price_reaction] || reactionConfig.not_yet_reacted;

  return (
    <div style={{
      maxWidth: '600px', borderRadius: '16px', overflow: 'hidden',
      background: isDark ? 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white', fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '28px' }}>🔍</span>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Price Cross-Check</h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.7 }}>{d.ticker}</p>
        </div>
      </div>

      <div style={{ padding: '0 24px 20px' }}>
        {/* Reaction Badge */}
        <div style={{
          background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '20px',
          backdropFilter: 'blur(10px)', marginBottom: '12px', textAlign: 'center',
        }}>
          <Badge label={rc.label} bg={rc.bg} fg={rc.fg} />
          <p style={{ margin: '8px 0 0', fontSize: '13px', opacity: 0.7 }}>{rc.desc}</p>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '14px 16px',
            backdropFilter: 'blur(10px)', textAlign: 'center',
          }}>
            <div style={{ fontSize: '11px', opacity: 0.6, textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '4px' }}>
              Price Change
            </div>
            <div style={{
              fontSize: '20px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
              color: d.price_change_since_news_pct > 0 ? '#68d391' : d.price_change_since_news_pct < 0 ? '#fc8181' : '#a0aec0',
            }}>
              {d.price_change_since_news_pct > 0 ? '+' : ''}{d.price_change_since_news_pct.toFixed(2)}%
            </div>
          </div>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '14px 16px',
            backdropFilter: 'blur(10px)', textAlign: 'center',
          }}>
            <div style={{ fontSize: '11px', opacity: 0.6, textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '4px' }}>
              Volume Ratio
            </div>
            <div style={{
              fontSize: '20px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
              color: d.volume_ratio >= 1.5 ? '#68d391' : '#a0aec0',
            }}>
              {d.volume_ratio.toFixed(2)}x
            </div>
          </div>
        </div>

        {/* Reasoning */}
        <div style={{
          background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '16px 20px',
          backdropFilter: 'blur(10px)', marginBottom: '12px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', opacity: 0.8, marginBottom: '8px' }}>
            Reasoning
          </div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', opacity: 0.9 }}>{d.reasoning}</p>
        </div>

        {/* Findings Timestamp */}
        {d.findings_timestamp && (
          <div style={{ fontSize: '11px', opacity: 0.5, textAlign: 'right' }}>
            Findings at {d.findings_timestamp}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 24px', borderTop: '1px solid rgba(255,255,255,0.1)',
        fontSize: '12px', opacity: 0.6, textAlign: 'center',
      }}>
        NitroSignal Analyst Agent
      </div>
    </div>
  );
}
