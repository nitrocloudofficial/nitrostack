'use client';
import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

interface HistoricalPatternData {
  ticker: string;
  pattern_type: string;
  matches_found: number;
  matches: Array<Record<string, any>>;
  avg_signal_score: number;
  summary: string;
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

function MatchCard({ match, index }: { match: Record<string, any>; index: number }) {
  const entries = Object.entries(match).filter(([k]) => k !== '_index');
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px 16px',
      marginBottom: '8px', border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '8px', fontWeight: 700 }}>
        Match #{index + 1}
      </div>
      {entries.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {entries.map(([key, val]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ opacity: 0.6 }}>{key.replace(/_/g, ' ')}</span>
              <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word' }}>
                {typeof val === 'number' ? val.toFixed(2) : String(val)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '12px', opacity: 0.5, fontStyle: 'italic' }}>No structured data</div>
      )}
    </div>
  );
}

export default function HistoricalPatternLookup() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const output = getToolOutput<HistoricalPatternData>();
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
  const scoreColor = d.avg_signal_score >= 65 ? '#68d391' : d.avg_signal_score >= 35 ? '#f8a859' : '#fc8181';

  return (
    <div style={{
      maxWidth: '600px', borderRadius: '16px', overflow: 'hidden',
      background: isDark ? 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white', fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '28px' }}>📚</span>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Historical Pattern Lookup</h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.7 }}>Pattern match analysis</p>
        </div>
      </div>

      <div style={{ padding: '0 24px 20px' }}>
        {/* Ticker + Pattern Badges */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <Badge label={d.ticker} bg="rgba(99,179,237,0.25)" fg="#63b3ed" />
          <Badge label={d.pattern_type} bg="rgba(167,139,250,0.25)" fg="#a78bfa" />
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '14px 16px',
            backdropFilter: 'blur(10px)', textAlign: 'center',
          }}>
            <div style={{ fontSize: '11px', opacity: 0.6, textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '4px' }}>
              Matches Found
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
              {d.matches_found}
            </div>
          </div>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '14px 16px',
            backdropFilter: 'blur(10px)', textAlign: 'center',
          }}>
            <div style={{ fontSize: '11px', opacity: 0.6, textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '4px' }}>
              Avg Signal Score
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: scoreColor }}>
              {d.avg_signal_score.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Match Cards */}
        {d.matches.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', opacity: 0.8, marginBottom: '8px' }}>
              Matches ({Math.min(d.matches.length, 10)})
            </div>
            {d.matches.slice(0, 10).map((match, i) => (
              <MatchCard key={i} match={match} index={i} />
            ))}
          </div>
        )}

        {/* Summary */}
        <div style={{
          background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '16px 20px',
          backdropFilter: 'blur(10px)', marginBottom: '12px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', opacity: 0.8, marginBottom: '8px' }}>
            Summary
          </div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', opacity: 0.9 }}>{d.summary}</p>
        </div>
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
