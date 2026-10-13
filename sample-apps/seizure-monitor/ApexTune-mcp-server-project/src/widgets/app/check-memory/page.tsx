'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface MemoryData {
  system_memory: string;
}

export default function CheckMemoryWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<MemoryData>();

  const isDark = theme === 'dark';
  const bg = isDark ? 'rgba(15,17,26,0.96)' : 'rgba(255,255,255,0.96)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';

  // Parse "Total: 15.94GB, Used: 8.12GB (50.9%)"
  const totalMatch = data?.system_memory?.match(/Total:\s*([\d.]+GB)/);
  const usedMatch = data?.system_memory?.match(/Used:\s*([\d.]+GB)/);
  const pctMatch = data?.system_memory?.match(/\(([\d.]+)%\)/);
  const pct = pctMatch ? parseFloat(pctMatch[1]) : 0;
  const barColor = pct >= 85 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#a78bfa';
  const statusLabel = pct >= 85 ? 'Critical' : pct >= 60 ? 'High' : 'Normal';

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: bg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', width: '100%', minHeight: '100vh', boxSizing: 'border-box' as any, color: textColor, boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🧠</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>RAM Usage</div>
            <div style={{ fontSize: '11px', color: mutedColor, marginTop: '1px' }}>System memory</div>
          </div>
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, background: barColor + '22', color: barColor, borderRadius: '999px', padding: '4px 10px' }}>{statusLabel}</div>
      </div>
      <div style={{ height: '1px', background: border, marginBottom: '16px' }} />
      {!data ? (
        <div style={{ textAlign: 'center', color: mutedColor, fontSize: '13px', padding: '12px 0' }}>Loading…</div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: barColor }}>{pct.toFixed(0)}%</div>
              <div style={{ fontSize: '11px', color: mutedColor, marginTop: '2px' }}>used</div>
            </div>
            <div style={{ width: '1px', background: border }} />
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>{usedMatch?.[1] ?? '—'}</div>
              <div style={{ fontSize: '11px', color: mutedColor, marginTop: '2px' }}>of {totalMatch?.[1] ?? '—'}</div>
            </div>
          </div>
          <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: '999px', background: barColor, transition: 'width 0.5s ease' }} />
          </div>
        </>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px', fontSize: '11px', color: mutedColor }}>
        <span>⚡</span><span>Powered by ApexTune</span><span>·</span><span>Theme: {theme}</span>
      </div>
    </div>
  );
}
