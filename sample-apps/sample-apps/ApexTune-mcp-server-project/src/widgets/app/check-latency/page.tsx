'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface LatencyData { raw?: string; message?: string; }

export default function CheckLatencyWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<LatencyData>();

  const isDark = theme === 'dark';
  const bg = isDark ? 'rgba(15,17,26,0.96)' : 'rgba(255,255,255,0.96)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';

  // Parse ping output: "Average = 12ms"
  const avgMatch = data?.raw?.match(/Average\s*=\s*(\d+)ms/i);
  const minMatch = data?.raw?.match(/Minimum\s*=\s*(\d+)ms/i);
  const maxMatch = data?.raw?.match(/Maximum\s*=\s*(\d+)ms/i);
  const lossMatch = data?.raw?.match(/\((\d+)%\s*loss\)/i);
  const hostMatch = data?.raw?.match(/Pinging\s+(\S+)/i);

  const avgMs = avgMatch ? parseInt(avgMatch[1]) : null;
  const loss = lossMatch ? parseInt(lossMatch[1]) : 0;
  const latencyColor = avgMs === null ? mutedColor : avgMs < 30 ? '#22c55e' : avgMs < 80 ? '#f59e0b' : '#ef4444';
  const latencyLabel = avgMs === null ? 'N/A' : avgMs < 30 ? 'Excellent' : avgMs < 80 ? 'Good' : 'Poor';

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: bg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', width: '100%', minHeight: '100vh', boxSizing: 'border-box' as any, color: textColor, boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📡</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>Latency Check</div>
            <div style={{ fontSize: '11px', color: mutedColor, marginTop: '1px' }}>{hostMatch?.[1] ?? 'Ping test'}</div>
          </div>
        </div>
        {avgMs !== null && (
          <div style={{ fontSize: '11px', fontWeight: 600, background: latencyColor + '22', color: latencyColor, borderRadius: '999px', padding: '4px 10px' }}>{latencyLabel}</div>
        )}
      </div>
      <div style={{ height: '1px', background: border, marginBottom: '16px' }} />

      {!data ? (
        <div style={{ textAlign: 'center', color: mutedColor, fontSize: '13px', padding: '12px 0' }}>Loading…</div>
      ) : data.message && !data.raw ? (
        <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '13px', color: '#fca5a5' }}>
          ✗ {data.message}
        </div>
      ) : (
        <>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '40px', fontWeight: 800, color: latencyColor, letterSpacing: '-2px' }}>
              {avgMs ?? '—'}<span style={{ fontSize: '18px', fontWeight: 400, opacity: 0.7 }}>ms</span>
            </div>
            <div style={{ fontSize: '11px', color: mutedColor, marginTop: '4px' }}>average latency</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            {[{ label: 'Min', value: minMatch?.[1] ? `${minMatch[1]}ms` : '—', color: '#22c55e' },
              { label: 'Avg', value: avgMs ? `${avgMs}ms` : '—', color: latencyColor },
              { label: 'Max', value: maxMatch?.[1] ? `${maxMatch[1]}ms` : '—', color: '#f59e0b' }
            ].map(s => (
              <div key={s.label} style={{ padding: '8px', borderRadius: '10px', background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: mutedColor, marginBottom: '3px' }}>{s.label}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          {loss > 0 && (
            <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '12px', color: '#fca5a5' }}>
              ⚠️ {loss}% packet loss detected
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px', fontSize: '11px', color: mutedColor }}>
        <span>⚡</span><span>Powered by ApexTune</span><span>·</span><span>Theme: {theme}</span>
      </div>
    </div>
  );
}
