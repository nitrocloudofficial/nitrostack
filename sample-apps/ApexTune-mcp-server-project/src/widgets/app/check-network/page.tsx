'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface NetworkData {
  adapters?: { name: string; ip4: string; mac: string }[];
  throughput?: { iface: string; rxSecKB: string; txSecKB: string }[];
  message?: string;
}

export default function CheckNetworkWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<NetworkData>();

  const isDark = theme === 'dark';
  const bg = isDark ? 'rgba(15,17,26,0.96)' : 'rgba(255,255,255,0.96)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
  const rowBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

  const throughputMap = Object.fromEntries((data?.throughput ?? []).map(t => [t.iface, t]));

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: bg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', width: '100%', minHeight: '100vh', boxSizing: 'border-box' as any, color: textColor, boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#0ea5e9,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🌐</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>Network</div>
            <div style={{ fontSize: '11px', color: mutedColor, marginTop: '1px' }}>{data?.adapters?.length ?? 0} active adapter{data?.adapters?.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, background: 'rgba(14,165,233,0.15)', color: '#0ea5e9', borderRadius: '999px', padding: '4px 10px' }}>Live</div>
      </div>
      <div style={{ height: '1px', background: border, marginBottom: '14px' }} />

      {!data ? (
        <div style={{ textAlign: 'center', color: mutedColor, fontSize: '13px', padding: '12px 0' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.adapters?.map((adapter) => {
            const tp = throughputMap[adapter.name];
            return (
              <div key={adapter.name} style={{ padding: '12px 14px', borderRadius: '12px', background: rowBg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>{adapter.name}</span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#0ea5e9' }}>{adapter.ip4 || '—'}</span>
                </div>
                <div style={{ fontSize: '10px', color: mutedColor, marginBottom: tp ? '8px' : 0, fontFamily: 'monospace' }}>{adapter.mac}</div>
                {tp && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div style={{ padding: '6px 8px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <div style={{ fontSize: '10px', color: mutedColor, marginBottom: '2px' }}>↓ Download</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e' }}>{tp.rxSecKB} KB/s</div>
                    </div>
                    <div style={{ padding: '6px 8px', borderRadius: '8px', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
                      <div style={{ fontSize: '10px', color: mutedColor, marginBottom: '2px' }}>↑ Upload</div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0ea5e9' }}>{tp.txSecKB} KB/s</div>
                    </div>
                  </div>
                )}
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
