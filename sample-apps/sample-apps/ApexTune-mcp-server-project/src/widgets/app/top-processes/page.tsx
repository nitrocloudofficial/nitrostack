'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface ProcessEntry {
  pid: number;
  name: string;
  cpuPercent: string;
  memoryMB: string;
}

interface TopProcessesData {
  processes: ProcessEntry[];
}

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#a16207'];

export default function TopProcessesWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<TopProcessesData>();

  const isDark = theme === 'dark';
  const bg = isDark ? 'rgba(15, 17, 26, 0.96)' : 'rgba(255,255,255,0.96)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const rowBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';

  if (!data) {
    return (
      <div style={{ padding: '28px', textAlign: 'center', color: mutedColor, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
        <div style={{ fontSize: '13px' }}>Loading process list…</div>
      </div>
    );
  }

  // Range normalization: lowest process = 0%, highest = 100%
  // This makes bars visually differentiated even when values are close
  const memValues = data.processes.map((p) => parseFloat(p.memoryMB));
  const cpuValues = data.processes.map((p) => parseFloat(p.cpuPercent));
  const minMem = Math.min(...memValues);
  const maxMem = Math.max(...memValues);
  const maxCpu = Math.max(...cpuValues);
  const memRange = maxMem - minMem || 1;

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
              background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            📋
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>Top Processes</div>
            <div style={{ fontSize: '11px', color: mutedColor, marginTop: '1px' }}>
              {data.processes.length} processes found
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            background: 'rgba(14,165,233,0.15)',
            color: '#0ea5e9',
            borderRadius: '999px',
            padding: '4px 10px',
          }}
        >
          Live
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: border, marginBottom: '14px' }} />

      {/* Column Headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '28px 1fr 70px 80px',
          gap: '8px',
          fontSize: '10px',
          fontWeight: 700,
          color: mutedColor,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: '8px',
          padding: '0 4px',
        }}
      >
        <span>#</span>
        <span>Process</span>
        <span style={{ textAlign: 'right' }}>CPU</span>
        <span style={{ textAlign: 'right' }}>Memory</span>
      </div>

      {/* Process Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {data.processes.map((proc, i) => {
          const cpu = parseFloat(proc.cpuPercent);
          const mem = parseFloat(proc.memoryMB);
          // Range-normalized: 0% = lowest in list, 100% = highest in list
          const memPct = Math.round(((mem - minMem) / memRange) * 100);
          const isHigh = cpu > 10;
          const isAnyCpuActive = maxCpu > 0;

          return (
            <div
              key={proc.pid}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr 70px 80px',
                gap: '8px',
                alignItems: 'center',
                padding: '9px 10px',
                borderRadius: '10px',
                background: rowBg,
                transition: 'background 0.15s',
              }}
            >
              {/* Rank */}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: RANK_COLORS[i] ?? mutedColor,
                  textAlign: 'center',
                }}
              >
                {i + 1}
              </span>

              {/* Name + single memory bar */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {proc.name}
                  </span>
                  {cpu > 0 && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: isHigh ? '#ef4444' : '#0ea5e9',
                        background: (isHigh ? '#ef4444' : '#0ea5e9') + '20',
                        borderRadius: '999px',
                        padding: '1px 6px',
                        flexShrink: 0,
                      }}
                    >
                      CPU {proc.cpuPercent}%
                    </span>
                  )}
                </div>
                {/* Single memory bar with % label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ flex: 1, height: '4px', borderRadius: '999px', background: border, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${memPct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        borderRadius: '999px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '9px', color: mutedColor, minWidth: '26px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {memPct}%
                  </span>
                </div>
              </div>

              {/* CPU value */}
              <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 700, color: isHigh ? '#ef4444' : textColor }}>
                {proc.cpuPercent}%
              </div>

              {/* Memory value */}
              <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#8b5cf6' }}>
                {parseFloat(proc.memoryMB) > 1024
                  ? `${(parseFloat(proc.memoryMB) / 1024).toFixed(1)} GB`
                  : `${proc.memoryMB} MB`}
              </div>
            </div>
          );
        })}
      </div>

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
