'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface GpuEntry {
  model: string;
  vramMB: number;
  loadPercent: number | string;
  temperatureC: number | string;
}

interface GpuData {
  gpus: GpuEntry[];
}

export default function CheckGpuWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<GpuData>();

  const isDark = theme === 'dark';
  const bg = isDark ? 'rgba(15,17,26,0.96)' : 'rgba(255,255,255,0.96)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
  const rowBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: bg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', width: '100%', minHeight: '100vh', boxSizing: 'border-box' as any, color: textColor, boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#f472b6,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🎮</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>GPU Info</div>
            <div style={{ fontSize: '11px', color: mutedColor, marginTop: '1px' }}>{data?.gpus?.length ?? 0} GPU{data?.gpus?.length !== 1 ? 's' : ''} detected</div>
          </div>
        </div>
      </div>
      <div style={{ height: '1px', background: border, marginBottom: '14px' }} />

      {!data ? (
        <div style={{ textAlign: 'center', color: mutedColor, fontSize: '13px', padding: '12px 0' }}>Loading…</div>
      ) : data.gpus.map((gpu, i) => {
        const load = typeof gpu.loadPercent === 'number' ? gpu.loadPercent : parseFloat(String(gpu.loadPercent));
        const hasLoad = !isNaN(load);
        const loadColor = hasLoad && load >= 85 ? '#ef4444' : hasLoad && load >= 60 ? '#f59e0b' : '#f472b6';
        const hasTemp = typeof gpu.temperatureC === 'number';
        const tempColor = hasTemp && (gpu.temperatureC as number) > 85 ? '#ef4444' : '#22c55e';

        return (
          <div key={i} style={{ marginBottom: i < data.gpus.length - 1 ? '12px' : 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: '#f472b6' }}>
              {gpu.model}
            </div>
            {hasLoad && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px', color: mutedColor }}>
                  <span>GPU Load</span><span style={{ color: loadColor, fontWeight: 700 }}>{load.toFixed(0)}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', borderRadius: '999px', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, load)}%`, height: '100%', background: loadColor, borderRadius: '999px' }} />
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div style={{ padding: '8px 10px', borderRadius: '10px', background: rowBg }}>
                <div style={{ fontSize: '11px', color: mutedColor, marginBottom: '2px' }}>VRAM</div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>
                  {gpu.vramMB >= 1024 ? `${(gpu.vramMB / 1024).toFixed(1)} GB` : `${gpu.vramMB} MB`}
                </div>
              </div>
              <div style={{ padding: '8px 10px', borderRadius: '10px', background: rowBg }}>
                <div style={{ fontSize: '11px', color: mutedColor, marginBottom: '2px' }}>Temp</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: hasTemp ? tempColor : mutedColor }}>
                  {hasTemp ? `${gpu.temperatureC}°C` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px', fontSize: '11px', color: mutedColor }}>
        <span>⚡</span><span>Powered by ApexTune</span><span>·</span><span>Theme: {theme}</span>
      </div>
    </div>
  );
}
