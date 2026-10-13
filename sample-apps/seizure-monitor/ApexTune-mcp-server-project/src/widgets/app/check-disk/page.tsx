'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface DriveEntry {
  mount: string;
  totalGB: string;
  usedGB: string;
  usedPercent: string;
}

interface DiskData {
  drives: DriveEntry[];
}

export default function CheckDiskWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<DiskData>();

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
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#facc15,#f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💾</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>Disk Usage</div>
            <div style={{ fontSize: '11px', color: mutedColor, marginTop: '1px' }}>{data?.drives?.length ?? 0} drive{data?.drives?.length !== 1 ? 's' : ''} found</div>
          </div>
        </div>
      </div>
      <div style={{ height: '1px', background: border, marginBottom: '14px' }} />

      {!data ? (
        <div style={{ textAlign: 'center', color: mutedColor, fontSize: '13px', padding: '12px 0' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.drives.map((drive) => {
            const pct = parseFloat(drive.usedPercent) || 0;
            const barColor = pct >= 90 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#facc15';
            const freeGB = (parseFloat(drive.totalGB) - parseFloat(drive.usedGB)).toFixed(1);

            return (
              <div key={drive.mount} style={{ padding: '12px 14px', borderRadius: '12px', background: rowBg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{drive.mount}</span>
                    <span style={{ fontSize: '10px', background: barColor + '22', color: barColor, borderRadius: '999px', padding: '2px 8px', fontWeight: 600 }}>
                      {pct.toFixed(0)}% used
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: mutedColor }}>{freeGB} GB free</span>
                </div>
                <div style={{ width: '100%', height: '6px', borderRadius: '999px', background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: '999px', background: barColor, transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: mutedColor, marginTop: '6px' }}>
                  <span>{drive.usedGB} GB used</span>
                  <span>{drive.totalGB} GB total</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px', fontSize: '11px', color: mutedColor }}>
        <span>⚡</span><span>Powered by ApexTune</span><span>·</span><span>Theme: {theme}</span>
      </div>
    </div>
  );
}
