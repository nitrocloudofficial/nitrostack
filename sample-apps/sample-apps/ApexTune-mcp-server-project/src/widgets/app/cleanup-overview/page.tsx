'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface CleanupData {
  reclaimableMB?: string;
  message?: string;
}

export default function CleanupOverviewWidget() {
  const theme = useTheme();
  const { getToolOutput, callTool } = useWidgetSDK();
  const data = getToolOutput<CleanupData>();

  const isDark = theme === 'dark';
  const bg = isDark ? 'rgba(15, 17, 26, 0.96)' : 'rgba(255,255,255,0.96)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';

  const reclaimMB = parseFloat(data?.reclaimableMB ?? '0') || 0;
  const reclaimGB = (reclaimMB / 1024).toFixed(2);
  const isLarge = reclaimMB > 1024;
  const displaySize = isLarge ? `${reclaimGB} GB` : `${reclaimMB.toFixed(0)} MB`;

  // Gauge: scale up to 10 GB for 100%
  const gaugePct = Math.min(100, (reclaimMB / 10240) * 100);
  const gaugeColor = reclaimMB > 5120 ? '#ef4444' : reclaimMB > 1024 ? '#f59e0b' : '#22c55e';

  const handleCleanTemp = async () => {
    try {
      await callTool('clean_temp_files', { confirm: true });
    } catch (_) {}
  };

  const handleEmptyBin = async () => {
    try {
      await callTool('empty_recycle_bin', { confirm: true });
    } catch (_) {}
  };

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '16px',
        padding: '20px',
        width: '100%', minHeight: '100vh', boxSizing: 'border-box' as any, color: textColor,
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            🧹
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>Cleanup Overview</div>
            <div style={{ fontSize: '11px', color: mutedColor, marginTop: '1px' }}>Reclaim wasted disk space</div>
          </div>
        </div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            background: gaugeColor + '22',
            color: gaugeColor,
            borderRadius: '999px',
            padding: '4px 10px',
          }}
        >
          {reclaimMB > 1024 ? 'Large' : reclaimMB > 256 ? 'Medium' : 'Clean'}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: border, marginBottom: '16px' }} />

      {/* Space gauge */}
      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          marginBottom: '14px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '32px', fontWeight: 800, color: gaugeColor, letterSpacing: '-1px' }}>
          {displaySize}
        </div>
        <div style={{ fontSize: '11px', color: mutedColor, marginTop: '2px', marginBottom: '12px' }}>
          reclaimable from temp files
        </div>
        {/* Gauge bar */}
        <div
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '999px',
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${gaugePct}%`,
              height: '100%',
              borderRadius: '999px',
              background: `linear-gradient(90deg, #22c55e, ${gaugeColor})`,
              transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </div>
        <div style={{ fontSize: '10px', color: mutedColor, marginTop: '6px' }}>
          {gaugePct.toFixed(0)}% of 10 GB scale
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={handleCleanTemp}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '11px 14px',
            borderRadius: '10px',
            background: 'rgba(16,185,129,0.12)',
            border: '1.5px solid rgba(16,185,129,0.3)',
            cursor: 'pointer',
            color: '#10b981',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
            width: '100%',
            textAlign: 'left',
          }}
        >
          <span>🗑️</span>
          <div style={{ flex: 1 }}>
            <div>Clean Temp Files</div>
            <div style={{ fontSize: '10px', opacity: 0.75, marginTop: '1px', fontWeight: 400 }}>
              Clears %TEMP% & Windows Temp
            </div>
          </div>
          <span style={{ fontSize: '11px', opacity: 0.6 }}>→</span>
        </button>

        <button
          onClick={handleEmptyBin}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '11px 14px',
            borderRadius: '10px',
            background: 'rgba(239,68,68,0.1)',
            border: '1.5px solid rgba(239,68,68,0.25)',
            cursor: 'pointer',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
            width: '100%',
            textAlign: 'left',
          }}
        >
          <span>♻️</span>
          <div style={{ flex: 1 }}>
            <div>Empty Recycle Bin</div>
            <div style={{ fontSize: '10px', opacity: 0.75, marginTop: '1px', fontWeight: 400 }}>
              Permanently removes deleted files
            </div>
          </div>
          <span style={{ fontSize: '11px', opacity: 0.6 }}>→</span>
        </button>
      </div>

      {/* Status message */}
      {data?.message && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: '10px',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${border}`,
            fontSize: '12px',
            color: mutedColor,
            lineHeight: 1.5,
          }}
        >
          {data.message}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          marginTop: '14px',
          fontSize: '11px',
          color: mutedColor,
        }}
      >
        <span>⚡</span>
        <span>Powered by ApexTune</span>
        <span>·</span>
        <span>Theme: {theme}</span>
      </div>
    </div>
  );
}
