'use client';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

interface StockEntry {
  ticker: string;
  price: number;
  change_pct: number;
  volume: number;
}

interface TrendingStocksData {
  fetched_at: string;
  top_gainers?: StockEntry[];
  top_losers?: StockEntry[];
  most_actively_traded?: StockEntry[];
  suggested_scan: string[];
  tip: string;
}

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

function StockRow({
  entry,
  isLast,
  borderColor,
  textPrimary,
  textSecondary,
}: {
  entry: StockEntry;
  isLast: boolean;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
}) {
  const changeColor = entry.change_pct >= 0 ? '#68d391' : '#fc8181';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: isLast ? 'none' : `1px solid ${borderColor}`,
    }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 800,
        fontSize: '13px',
        color: textPrimary,
        minWidth: '52px',
      }}>
        {entry.ticker}
      </span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '12px',
        color: textSecondary,
        textAlign: 'right',
        flex: 1,
      }}>
        ${entry.price.toFixed(2)}
      </span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '12px',
        fontWeight: 700,
        color: changeColor,
        textAlign: 'right',
        minWidth: '60px',
      }}>
        {entry.change_pct >= 0 ? '+' : ''}{entry.change_pct.toFixed(2)}%
      </span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '11px',
        color: textSecondary,
        textAlign: 'right',
        minWidth: '70px',
      }}>
        {(entry.volume / 1_000_000).toFixed(1)}M
      </span>
    </div>
  );
}

function StockSection({
  title,
  entries,
  indicatorColor,
  borderColor,
  surfaceBg,
  textPrimary,
  textSecondary,
  textMuted,
  isDark,
}: {
  title: string;
  entries: StockEntry[];
  indicatorColor: string;
  borderColor: string;
  surfaceBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  isDark: boolean;
}) {
  return (
    <div style={{
      padding: '14px 16px',
      background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
      border: `1px solid ${borderColor}`,
      borderRadius: '12px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px',
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: indicatorColor,
        }} />
        <span style={{
          fontSize: '12px',
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          color: textPrimary,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.5px',
        }}>
          {title}
        </span>
      </div>
      {entries.length === 0 ? (
        <div style={{ fontSize: '11px', color: textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
          No data available
        </div>
      ) : (
        <div>
          {entries.map((entry, idx) => (
            <StockRow
              key={entry.ticker}
              entry={entry}
              isLast={idx === entries.length - 1}
              borderColor={borderColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GetTrendingStocks() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [state] = useWidgetState<{}>(() => ({}));

  const data = getToolOutput<TrendingStocksData>();
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
        Waiting for trending stocks...
      </div>
    );
  }

  const surfaceBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const textPrimary = isDark ? '#e2e8f0' : '#1a202c';
  const textSecondary = isDark ? '#8a9bb0' : '#4a5568';
  const textMuted = isDark ? '#4a5568' : '#a0aec0';

  const gainers = data.top_gainers ?? [];
  const losers = data.top_losers ?? [];
  const active = data.most_actively_traded ?? [];

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
            background: 'linear-gradient(135deg, #fc8181 0%, #e53e3e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
          }}>
            🔥
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>
              Trending Stocks
            </div>
            <div style={{
              fontSize: '11px',
              color: textSecondary,
              fontFamily: "'JetBrains Mono', monospace",
              marginTop: '1px',
            }}>
              Top movers today
            </div>
          </div>
        </div>
        <Badge label={new Date(data.fetched_at).toLocaleTimeString()} bg="rgba(160,174,192,0.10)" fg="#a0aec0" />
      </div>

      {/* Stock Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        <StockSection
          title="Top Gainers"
          entries={gainers}
          indicatorColor="#68d391"
          borderColor={borderColor}
          surfaceBg={surfaceBg}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          textMuted={textMuted}
          isDark={isDark}
        />
        <StockSection
          title="Top Losers"
          entries={losers}
          indicatorColor="#fc8181"
          borderColor={borderColor}
          surfaceBg={surfaceBg}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          textMuted={textMuted}
          isDark={isDark}
        />
        <StockSection
          title="Most Actively Traded"
          entries={active}
          indicatorColor="#63b3ed"
          borderColor={borderColor}
          surfaceBg={surfaceBg}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          textMuted={textMuted}
          isDark={isDark}
        />
      </div>

      {/* Suggested Scan */}
      {data.suggested_scan.length > 0 && (
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
            marginBottom: '8px',
          }}>
            Suggested Scans
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {data.suggested_scan.map((ticker) => (
              <Badge key={ticker} label={ticker} bg="rgba(99,179,237,0.12)" fg="#63b3ed" />
            ))}
          </div>
        </div>
      )}

      {/* Tip */}
      <div style={{
        padding: '12px 16px',
        background: surfaceBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        fontSize: '11px',
        lineHeight: 1.5,
        color: textSecondary,
        fontFamily: "'JetBrains Mono', monospace",
        marginBottom: '16px',
      }}>
        💡 {data.tip}
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
