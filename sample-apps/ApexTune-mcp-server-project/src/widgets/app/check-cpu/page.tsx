'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface CpuData {
  cpu: string;
  cores: number;
  speedGHz: number;
  loadPercent: string;
  temperatureC: number | string;
}

export default function CheckCpuWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<CpuData>();

  const isDark = theme === 'dark';
  const bg = isDark ? 'rgba(15,17,26,0.96)' : 'rgba(255,255,255,0.96)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
  const rowBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

  const load = parseFloat(data?.loadPercent ?? '0') || 0;
  const loadColor = load >= 85 ? '#ef4444' : load >= 60 ? '#f59e0b' : '#22d3ee';
  const statusLabel = load >= 85 ? 'Heavy' : load >= 60 ? 'Moderate' : 'Normal';
  const hasTemp = data && typeof data.temperatureC === 'number';
  const tempColor = hasTemp && (data.temperatureC as number) > 85 ? '#ef4444' : hasTemp && (data.temperatureC as number) > 70 ? '#f59e0b' : '#22c55e';

  const StatRow = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: '10px', background: rowBg, marginBottom: '6px' }}>
      <span style={{ fontSize: '12px', color: mutedColor }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 700, color: accent ?? textColor }}>{value}</span>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: bg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', width: '100%', minHeight: '100vh', boxSizing: 'border-box' as any, color: textColor, boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#22d3ee,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🔲</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>CPU Info</div>
            <div style={{ fontSize: '11px', color: mutedColor, marginTop: '1px' }}>{data?.cpu ?? 'Processor'}</div>
          </div>
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, background: loadColor + '22', color: loadColor, borderRadius: '999px', padding: '4px 10px' }}>{statusLabel}</div>
      </div>
      <div style={{ height: '1px', background: border, marginBottom: '14px' }} />

      {!data ? (
        <div style={{ textAlign: 'center', color: mutedColor, fontSize: '13px', padding: '12px 0' }}>Loading…</div>
      ) : (
        <>
          {/* Load bar */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
              <span style={{ color: mutedColor }}>Load</span>
              <span style={{ fontWeight: 700, color: loadColor }}>{load.toFixed(0)}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, load)}%`, height: '100%', borderRadius: '999px', background: loadColor, transition: 'width 0.5s ease' }} />
            </div>
          </div>

          <StatRow label="Cores" value={String(data.cores)} />
          <StatRow label="Speed" value={`${data.speedGHz} GHz`} accent="#22d3ee" />
          <StatRow label="Temperature" value={hasTemp ? `${data.temperatureC}°C` : 'N/A'} accent={hasTemp ? tempColor : mutedColor} />
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px', fontSize: '11px', color: mutedColor }}>
        <span>⚡</span><span>Powered by ApexTune</span><span>·</span><span>Theme: {theme}</span>
      </div>
    </div>
  );
}
