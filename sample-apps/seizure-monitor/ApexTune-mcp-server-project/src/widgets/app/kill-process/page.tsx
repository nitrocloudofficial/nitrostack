'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface KillProcessData {
  message?: string;
  preview?: boolean;
  warning?: boolean;
}

export default function KillProcessWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<KillProcessData>();

  const isDark = theme === 'dark';
  const bg = isDark ? 'rgba(15,17,26,0.96)' : 'rgba(255,255,255,0.96)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';

  const isWarning = data?.warning;
  const isPreview = data?.preview && !data?.warning;
  const isSuccess = data?.message && !data?.preview && !data?.warning;

  const accentColor = isWarning ? '#ef4444' : isPreview ? '#f59e0b' : '#22c55e';
  const accentBg = accentColor + '15';
  const accentBorder = accentColor + '30';
  const statusIcon = isWarning ? '⚠️' : isPreview ? '👁️' : '✓';
  const statusLabel = isWarning ? 'Warning' : isPreview ? 'Preview' : 'Done';

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: bg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', width: '100%', minHeight: '100vh', boxSizing: 'border-box' as any, color: textColor, boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#ef4444,#b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🔪</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>Kill Process</div>
            <div style={{ fontSize: '11px', color: mutedColor, marginTop: '1px' }}>Force terminate a process</div>
          </div>
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, background: accentColor + '22', color: accentColor, borderRadius: '999px', padding: '4px 10px' }}>{statusLabel}</div>
      </div>
      <div style={{ height: '1px', background: border, marginBottom: '14px' }} />

      {!data ? (
        <div style={{ textAlign: 'center', color: mutedColor, fontSize: '13px', padding: '12px 0' }}>Waiting for result…</div>
      ) : (
        <div style={{ padding: '14px', borderRadius: '12px', background: accentBg, border: `1px solid ${accentBorder}`, fontSize: '13px', lineHeight: 1.6, color: isWarning ? '#fca5a5' : isPreview ? '#fcd34d' : '#86efac' }}>
          <span style={{ fontWeight: 700, marginRight: '6px' }}>{statusIcon}</span>
          {data.message}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px', fontSize: '11px', color: mutedColor }}>
        <span>⚡</span><span>Powered by ApexTune</span><span>·</span><span>Theme: {theme}</span>
      </div>
    </div>
  );
}
