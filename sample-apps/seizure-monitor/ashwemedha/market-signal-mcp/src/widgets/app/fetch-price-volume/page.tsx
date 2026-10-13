'use client';
import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FetchPriceVolumeData {
  data: {
    ticker: string;
    currency: string;
    current_price: number;
    previous_close: number;
    change_pct: number;
    volume_today: number;
    volume_30d_avg: number;
    volume_ratio: number;
    price_bars: PriceBar[];
    fetched_at: string;
    source: string;
  };
  source: string;
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

function formatNum(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toFixed(2);
}

export default function FetchPriceVolume() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const output = getToolOutput<FetchPriceVolumeData>();
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

  const d = output.data;
  const isPositive = d.change_pct > 0;
  const isNeg = d.change_pct < 0;
  const changeColor = isPositive ? '#68d391' : isNeg ? '#fc8181' : (isDark ? '#a0aec0' : '#718096');
  const maxVol = Math.max(d.volume_today, d.volume_30d_avg);

  const sourceColors: Record<string, { bg: string; fg: string }> = {
    yahoo: { bg: '#7c3aed', fg: '#fff' },
    coingecko: { bg: '#f59e0b', fg: '#000' },
    alpha_vantage: { bg: '#3b82f6', fg: '#fff' },
    seed: { bg: '#10b981', fg: '#fff' },
    cache: { bg: '#6b7280', fg: '#fff' },
  };
  const sc = sourceColors[d.source] || sourceColors.cache;

  return (
    <div style={{
      maxWidth: '600px', borderRadius: '16px', overflow: 'hidden',
      background: isDark ? 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white', fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>📈</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Price & Volume Data</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.7 }}>Source: {d.source}</p>
          </div>
        </div>
        <Badge label={d.source} bg={sc.bg} fg={sc.fg} />
      </div>

      <div style={{ padding: '0 24px 20px' }}>
        {/* Price Card */}
        <div style={{
          background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '16px 20px',
          backdropFilter: 'blur(10px)', marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
              {d.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '14px', opacity: 0.7 }}>{d.currency.toUpperCase()}</span>
            <Badge
              label={`${isPositive ? '+' : ''}${d.change_pct.toFixed(2)}%`}
              bg={isPositive ? 'rgba(104,211,145,0.25)' : isNeg ? 'rgba(252,129,129,0.25)' : 'rgba(160,174,192,0.25)'}
              fg={changeColor}
            />
          </div>
          <div style={{ fontSize: '13px', opacity: 0.7 }}>
            Previous close: <span style={{ fontWeight: 600, opacity: 1 }}>
              {d.previous_close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Volume Section */}
        <div style={{
          background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '16px 20px',
          backdropFilter: 'blur(10px)', marginBottom: '12px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', opacity: 0.8, marginBottom: '10px' }}>
            Volume
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
            <span>Today</span>
            <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{formatNum(d.volume_today)}</span>
          </div>
          <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.15)', marginBottom: '10px' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: '#63b3ed', width: `${maxVol > 0 ? (d.volume_today / maxVol) * 100 : 0}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
            <span>30d Avg</span>
            <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{formatNum(d.volume_30d_avg)}</span>
          </div>
          <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.15)', marginBottom: '10px' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: '#a78bfa', width: `${maxVol > 0 ? (d.volume_30d_avg / maxVol) * 100 : 0}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', opacity: 0.7 }}>Volume Ratio</span>
            <Badge
              label={`${d.volume_ratio.toFixed(2)}x`}
              bg={d.volume_ratio >= 1.5 ? 'rgba(104,211,145,0.25)' : 'rgba(160,174,192,0.25)'}
              fg={d.volume_ratio >= 1.5 ? '#68d391' : '#a0aec0'}
            />
          </div>
        </div>

        {/* Price Bars Table */}
        {d.price_bars.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '16px 20px',
            backdropFilter: 'blur(10px)', marginBottom: '12px', overflow: 'hidden',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', opacity: 0.8, marginBottom: '10px' }}>
              Price Bars (Last {Math.min(d.price_bars.length, 5)})
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}>
                <thead>
                  <tr style={{ opacity: 0.6, textAlign: 'left' }}>
                    <th style={{ padding: '4px 6px' }}>Date</th>
                    <th style={{ padding: '4px 6px' }}>Open</th>
                    <th style={{ padding: '4px 6px' }}>High</th>
                    <th style={{ padding: '4px 6px' }}>Low</th>
                    <th style={{ padding: '4px 6px' }}>Close</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {d.price_bars.slice(0, 5).map((bar, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <td style={{ padding: '5px 6px' }}>{bar.date}</td>
                      <td style={{ padding: '5px 6px' }}>{bar.open.toFixed(2)}</td>
                      <td style={{ padding: '5px 6px' }}>{bar.high.toFixed(2)}</td>
                      <td style={{ padding: '5px 6px' }}>{bar.low.toFixed(2)}</td>
                      <td style={{ padding: '5px 6px' }}>{bar.close.toFixed(2)}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right' }}>{formatNum(bar.volume)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Fetched At */}
        <div style={{ fontSize: '11px', opacity: 0.5, textAlign: 'right', marginBottom: '8px' }}>
          Fetched at {d.fetched_at}
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
