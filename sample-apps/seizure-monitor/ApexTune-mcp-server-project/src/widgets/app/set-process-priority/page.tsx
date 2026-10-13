'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface PriorityData { message: string; }

const PRIORITY_META: Record<string, { color: string; label: string }> = {
  realtime: { color: '#ef4444', label: 'Realtime' },
  high:     { color: '#f59e0b', label: 'High' },
  abovenormal: { color: '#facc15', label: 'Above Normal' },
  normal:   { color: '#22c55e', label: 'Normal' },
  belownormal: { color: '#0ea5e9', label: 'Below Normal' },
  low:      { color: '#94a3b8', label: 'Low' },
};

export default function SetProcessPriorityWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<PriorityData>();

  const isDark = theme === 'dark';
  const bg = isDark ? 'rgba(15,17,26,0.96)' : 'rgba(255,255,255,0.96)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';

  const detectedPriority = data?.message
    ? Object.keys(PRIORITY_META).find(k => data.message.toLowerCase().includes(k))
    : null;
  const meta = detectedPriority ? PRIORITY_META[detectedPriority] : { color: '#22c55e', label: 'Set' };
  const isSuccess = data?.message && !data.message.includes('Could not');

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: bg, border: `1px solid ${border}`, borderRadius: '16px', padding: '20px', width: '100%', minHeight: '100vh', boxSizing: 'border-box' as any, color: textColor, boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⚙️</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>Process Priority</div>
            <div style={{ fontSize: '11px', color: mutedColor, marginTop: '1px' }}>CPU scheduling tuner</div>
          </div>
        </div>
        {detectedPriority && (
          <div style={{ fontSize: '11px', fontWeight: 600, background: meta.color + '22', color: meta.color, borderRadius: '999px', padding: '4px 10px' }}>{meta.label}</div>
        )}
      </div>
      <div style={{ height: '1px', background: border, marginBottom: '14px' }} />

      {/* Priority ladder visual */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
        {Object.entries(PRIORITY_META).map(([key, m]) => {
          const isActive = detectedPriority === key;
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', borderRadius: '8px', background: isActive ? m.color + '18' : 'transparent', border: `1px solid ${isActive ? m.color + '40' : 'transparent'}`, transition: 'all 0.2s' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isActive ? m.color : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', flexShrink: 0, boxShadow: isActive ? `0 0 6px ${m.color}` : 'none' }} />
              <span style={{ fontSize: '12px', fontWeight: isActive ? 700 : 400, color: isActive ? m.color : mutedColor }}>{m.label}</span>
            </div>
          );
        })}
      </div>

      {data?.message && (
        <div style={{ padding: '12px', borderRadius: '10px', background: isSuccess ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, fontSize: '12px', color: isSuccess ? '#86efac' : '#fca5a5', lineHeight: 1.5 }}>
          {isSuccess ? '✓ ' : '✗ '}{data.message}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px', fontSize: '11px', color: mutedColor }}>
        <span>⚡</span><span>Powered by ApexTune</span><span>·</span><span>Theme: {theme}</span>
      </div>
    </div>
  );
}
