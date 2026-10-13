'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface DiskInfo {
  mount: string;
  usedPercent: string;
}

interface SystemOverviewData {
  cpuLoadPercent: string;
  ramUsedPercent: string;
  disks: DiskInfo[];
  gpuLoadPercent: string | number;
}

const statusColor = (pct: number) =>
  pct >= 85 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#22c55e';

const statusLabel = (pct: number) =>
  pct >= 85 ? 'Critical' : pct >= 60 ? 'High' : 'Normal';

function MetricBar({
  icon,
  label,
  percent,
  isDark,
}: {
  icon: string;
  label: string;
  percent: number;
  isDark: boolean;
}) {
  const color = statusColor(percent);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        borderRadius: '10px',
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        marginBottom: '8px',
      }}
    >
      <span style={{ fontSize: '16px', minWidth: '20px', textAlign: 'center' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            marginBottom: '5px',
            opacity: 0.8,
          }}
        >
          <span style={{ fontWeight: 600, letterSpacing: '0.01em' }}>{label}</span>
          <span
            style={{
              fontSize: '11px',
              background: color + '22',
              color: color,
              borderRadius: '999px',
              padding: '1px 8px',
              fontWeight: 700,
            }}
          >
            {statusLabel(percent)} · {percent.toFixed(0)}%
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '999px',
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(0, percent))}%`,
              height: '100%',
              borderRadius: '999px',
              background: color,
              transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function SystemOverview() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<SystemOverviewData>();

  const isDark = theme === 'dark';

  const bg = isDark
    ? 'rgba(15, 17, 26, 0.96)'
    : 'rgba(255,255,255,0.96)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';

  if (!data) {
    return (
      <div style={{ padding: '28px', textAlign: 'center', color: mutedColor, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚡</div>
        <div style={{ fontSize: '13px' }}>Loading system stats…</div>
      </div>
    );
  }

  const cpu = parseFloat(data.cpuLoadPercent) || 0;
  const ram = parseFloat(data.ramUsedPercent) || 0;
  const gpu =
    typeof data.gpuLoadPercent === 'number'
      ? data.gpuLoadPercent
      : parseFloat(String(data.gpuLoadPercent)) || 0;

  const overallStatus = Math.max(cpu, ram, gpu);

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '16px',
        padding: '20px',
        width: '100%', minHeight: '100vh', boxSizing: 'border-box' as any, color: textColor,
        boxShadow: isDark
          ? '0 8px 32px rgba(0,0,0,0.6)'
          : '0 8px 32px rgba(0,0,0,0.12)',
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
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            ⚡
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>System Overview</div>
            <div style={{ fontSize: '11px', color: mutedColor, marginTop: '1px' }}>Live hardware snapshot</div>
          </div>
        </div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            background: statusColor(overallStatus) + '22',
            color: statusColor(overallStatus),
            borderRadius: '999px',
            padding: '4px 10px',
          }}
        >
          {statusLabel(overallStatus)}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: border, marginBottom: '14px' }} />

      {/* Metrics */}
      <MetricBar icon="🔲" label="CPU" percent={cpu} isDark={isDark} />
      <MetricBar icon="🧠" label="RAM" percent={ram} isDark={isDark} />
      {typeof data.gpuLoadPercent === 'number' || !isNaN(parseFloat(String(data.gpuLoadPercent))) ? (
        <MetricBar icon="🎮" label="GPU" percent={gpu} isDark={isDark} />
      ) : null}
      {data.disks?.map((d) => (
        <MetricBar
          key={d.mount}
          icon="💾"
          label={`Disk ${d.mount}`}
          percent={parseFloat(d.usedPercent) || 0}
          isDark={isDark}
        />
      ))}

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