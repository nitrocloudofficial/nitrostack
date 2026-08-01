'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface StartupApp { name: string; command: string; location: string; }
interface StartupData { startupApps?: StartupApp[]; message?: string; }

export default function ListStartupAppsWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<StartupData>();

  const isDark = theme === 'dark';
  const bg = isDark ? 'rgba(15,17,26,0.96)' : 'rgba(255,255,255,0.96)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
  const rowBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

  const apps = data?.startupApps ?? [];

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: bg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', width: '100%', minHeight: '100vh', boxSizing: 'border-box' as any, color: textColor, boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🚀</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>Startup Apps</div>
            <div style={{ fontSize: '11px', color: mutedColor, marginTop: '1px' }}>{apps.length} app{apps.length !== 1 ? 's' : ''} at launch</div>
          </div>
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: '999px', padding: '4px 10px' }}>Startup</div>
      </div>
      <div style={{ height: '1px', background: border, marginBottom: '14px' }} />

      {!data ? (
        <div style={{ textAlign: 'center', color: mutedColor, fontSize: '13px', padding: '12px 0' }}>Loading…</div>
      ) : data.message ? (
        <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '13px', color: '#fca5a5' }}>✗ {data.message}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
          {apps.map((app, i) => (
            <div key={i} style={{ padding: '10px 12px', borderRadius: '10px', background: rowBg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, flex: 1, minWidth: 0 }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.name}</div>
                </div>
                <div style={{ fontSize: '10px', background: 'rgba(16,185,129,0.12)', color: '#10b981', borderRadius: '6px', padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {app.location?.split('\\').pop() ?? 'Registry'}
                </div>
              </div>
              <div style={{ fontSize: '10px', color: mutedColor, marginTop: '4px', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {app.command}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px', fontSize: '11px', color: mutedColor }}>
        <span>⚡</span><span>Powered by ApexTune</span><span>·</span><span>Theme: {theme}</span>
      </div>
    </div>
  );
}
