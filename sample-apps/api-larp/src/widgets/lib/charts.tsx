'use client';

import React from 'react';

const ANIM_STYLE = `
@keyframes arcDraw { from { stroke-dashoffset: var(--len); } to { stroke-dashoffset: var(--target); } }
@keyframes barFill { from { width: 0; } }
@keyframes ringFill { from { stroke-dashoffset: var(--len); } to { stroke-dashoffset: var(--target); } }
@keyframes pulse { 0%,100%{ box-shadow:0 0 0 0 rgba(6,118,71,.35); } 50%{ box-shadow:0 0 0 8px rgba(6,118,71,0); } }
@keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes popIn { 0%{transform:scale(0)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
@keyframes tickDraw { from{stroke-dashoffset:24} to{stroke-dashoffset:0} }
@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
`;
if (typeof document !== 'undefined' && !document.getElementById('apiguard-chart-keyframes')) {
  const s = document.createElement('style');
  s.id = 'apiguard-chart-keyframes';
  s.textContent = ANIM_STYLE;
  document.head.appendChild(s);
}

/* ─── Donut Chart ─── */
interface DonutSlice { value: number; color: string; label: string; }
export function DonutChart({ slices, size = 100, thickness = 12, center, animDelay = 0 }: { slices: DonutSlice[]; size?: number; thickness?: number; center?: React.ReactNode; animDelay?: number }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  if (total === 0) return null;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eaecf0" strokeWidth={thickness} />
        {slices.map((s, i) => {
          const pct = s.value / total;
          const dash = circ * pct;
          const gap = circ - dash;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-currentOffset}
              strokeLinecap="butt"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', '--len': String(circ), '--target': String(circ - dash), animation: `ringFill 700ms ease-out ${animDelay + i * 150}ms both` } as React.CSSProperties}
            />
          );
        })}
      </svg>
      {center && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>{center}</div>}
    </div>
  );
}

/* ─── Progress Ring ─── */
export function ProgressRing({ value, max = 100, size = 80, thickness = 8, color = '#067647', label, animDelay = 0 }: { value: number; max?: number; size?: number; thickness?: number; color?: string; label?: string; animDelay?: number }) {
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const target = circ * (1 - pct);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eaecf0" strokeWidth={thickness} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thickness}
          strokeDasharray={circ} strokeDashoffset={circ} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', '--len': String(circ), '--target': String(target), animation: `ringFill 800ms ease-out ${animDelay}ms both` } as React.CSSProperties}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ fontSize: size > 60 ? 18 : 14, fontWeight: 700, color: '#101828' }}>{value}</span>
        {label && <span style={{ fontSize: 9, fontWeight: 600, color: '#667085', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{label}</span>}
      </div>
    </div>
  );
}

/* ─── Stacked Bar ─── */
interface BarSegment { value: number; color: string; label: string; }
export function StackedBar({ segments, height = 8, animDelay = 0, showLabels = true }: { segments: BarSegment[]; height?: number; animDelay?: number; showLabels?: boolean }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) return null;
  return (
    <div>
      <div style={{ display: 'flex', borderRadius: height, overflow: 'hidden', height, background: '#eaecf0' }}>
        {segments.map((s, i) => {
          const pct = (s.value / total) * 100;
          return (
            <div key={i} title={`${s.label}: ${s.value}`} style={{ width: `${pct}%`, background: s.color, animation: `barFill 600ms ease-out ${animDelay + i * 100}ms both` }} />
          );
        })}
      </div>
      {showLabels && (
        <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' as const }}>
          {segments.map((s, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475467' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              {s.label}: {s.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Severity Bar (gradient) ─── */
export function SeverityBar({ high, medium, low, animDelay = 0 }: { high: number; medium: number; low: number; animDelay?: number }) {
  const total = high + medium + low;
  if (total === 0) return null;
  return (
    <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 10, background: '#eaecf0' }}>
      {[
        { v: high, c: '#b42318' }, { v: medium, c: '#b54708' }, { v: low, c: '#067647' },
      ].map((s, i) => (
        <div key={i} style={{ width: `${(s.v / total) * 100}%`, background: s.c, animation: `barFill 600ms ease-out ${animDelay + i * 100}ms both` }} />
      ))}
    </div>
  );
}

/* ─── Gauge (half-arc) ─── */
export function GaugeArc({ value, max = 100, size = 120, thickness = 14, color = '#067647', label, animDelay = 0 }: { value: number; max?: number; size?: number; thickness?: number; color?: string; label?: string; animDelay?: number }) {
  const r = (size - thickness) / 2;
  const circ = Math.PI * r;
  const pct = Math.min(value / max, 1);
  const target = circ * (1 - pct);
  return (
    <div style={{ position: 'relative', width: size, height: size / 2 + 10, overflow: 'hidden', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', top: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eaecf0" strokeWidth={thickness} strokeDasharray={`${circ} ${circ}`} strokeDashoffset={0} style={{ transform: 'rotate(180deg)', transformOrigin: '50% 50%' }} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ}
          style={{ transform: 'rotate(180deg)', transformOrigin: '50% 50%', '--len': String(circ), '--target': String(target), animation: `ringFill 800ms ease-out ${animDelay}ms both` } as React.CSSProperties}
        />
      </svg>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#101828' }}>{value}{max === 100 ? '%' : ''}</div>
        {label && <div style={{ fontSize: 10, fontWeight: 600, color: '#667085', textTransform: 'uppercase' as const }}>{label}</div>}
      </div>
    </div>
  );
}

/* ─── Sparkline ─── */
export function Sparkline({ values, color = '#067647', width = 80, height = 24, animDelay = 0 }: { values: number[]; color?: string; width?: number; height?: number; animDelay?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  return (
    <svg width={width} height={height} style={{ animation: `fadeUp 400ms ease-out ${animDelay}ms both` }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={(values.length - 1) / (values.length - 1) * width} cy={height - ((values[values.length - 1] - min) / range) * (height - 4) - 2} r="2" fill={color} />
    </svg>
  );
}

/* ─── Trend Arrow ─── */
export function TrendArrow({ direction, value }: { direction: 'up' | 'down' | 'flat'; value?: string }) {
  const colors = { up: '#b42318', down: '#067647', flat: '#667085' };
  const arrows = { up: '\u2191', down: '\u2193', flat: '\u2192' };
  return (
    <span style={{ color: colors[direction], fontSize: 12, fontWeight: 600 }}>
      {arrows[direction]}{value ? ` ${value}` : ''}
    </span>
  );
}

/* ─── Status Dot ─── */
export function StatusDot({ status, animate = true }: { status: 'pass' | 'fail' | 'warn' | 'skip' | 'pending'; animate?: boolean }) {
  const colors = { pass: '#12b76a', fail: '#d92d20', warn: '#f79009', skip: '#98a2b3', pending: '#d0d5dd' };
  const icons = {
    pass: <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill={colors.pass} /><path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 24, strokeDashoffset: animate ? 24 : 0, animation: animate ? 'tickDraw 400ms ease-out 200ms both' : undefined }} /></svg>,
    fail: <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill={colors.fail} /><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" style={{ strokeDasharray: 24, strokeDashoffset: animate ? 24 : 0, animation: animate ? 'tickDraw 400ms ease-out 200ms both' : undefined }} /></svg>,
    warn: <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill={colors.warn} /><text x="8" y="12" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">!</text></svg>,
    skip: <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill={colors.skip} /><text x="8" y="12" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">-</text></svg>,
    pending: <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="none" stroke={colors.pending} strokeWidth="1.5" strokeDasharray="4 3" style={{ animation: animate ? 'spin 3s linear infinite' : undefined, transformOrigin: '50% 50%' }} /></svg>,
  };
  return icons[status];
}

/* ─── Heatmap Grid ─── */
export function HeatmapGrid({ rows, columns, cells, animDelay = 0 }: { rows: string[]; columns: string[]; cells: number[][]; animDelay?: number }) {
  const maxVal = Math.max(...cells.flat(), 1);
  function cellColor(v: number) {
    const pct = v / maxVal;
    if (pct === 0) return '#f8f9fb';
    if (pct < 0.33) return '#f0fdf4';
    if (pct < 0.66) return '#fef3f2';
    return '#b42318';
  }
  function cellFg(v: number) {
    const pct = v / maxVal;
    if (pct < 0.33) return '#067647';
    if (pct < 0.66) return '#b54708';
    return '#ffffff';
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
        <thead>
          <tr>
            <th style={{ padding: '6px 8px', textAlign: 'left', color: '#667085', fontWeight: 600 }}></th>
            {columns.map((c, i) => <th key={i} style={{ padding: '6px 8px', textAlign: 'center', color: '#667085', fontWeight: 600, whiteSpace: 'nowrap' }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              <td style={{ padding: '6px 8px', fontWeight: 600, color: '#475467', whiteSpace: 'nowrap' }}>{r}</td>
              {columns.map((_, ci) => (
                <td key={ci} style={{ padding: '4px 6px', textAlign: 'center', background: cellColor(cells[ri]?.[ci] ?? 0), color: cellFg(cells[ri]?.[ci] ?? 0), borderRadius: 4, fontWeight: 600, animation: `fadeUp 300ms ease-out ${animDelay + (ri * columns.length + ci) * 40}ms both` }}>
                  {cells[ri]?.[ci] ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Timeline ─── */
interface TimelineStep { label: string; status: 'done' | 'active' | 'pending'; time?: string; }
export function Timeline({ steps, animDelay = 0 }: { steps: TimelineStep[]; animDelay?: number }) {
  return (
    <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
      {steps.map((s, i) => {
        const colors = { done: '#067647', active: '#067647', pending: '#d0d5dd' };
        const bg = { done: '#067647', active: '#ffffff', pending: '#f2f4f7' };
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: `fadeUp 300ms ease-out ${animDelay + i * 120}ms both` }}>
              <div style={{
                width: 20, height: 20, borderRadius: 10, border: `2px solid ${colors[s.status]}`,
                background: bg[s.status], display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: s.status === 'done' ? 'popIn 300ms ease-out' : undefined,
              }}>
                {s.status === 'done' && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>}
                {s.status === 'active' && <div style={{ width: 6, height: 6, borderRadius: 3, background: '#067647' }} />}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: s.status === 'pending' ? '#98a2b3' : '#101828', textAlign: 'center', maxWidth: 72 }}>{s.label}</div>
              {s.time && <div style={{ fontSize: 9, color: '#667085', marginTop: 2 }}>{s.time}</div>}
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: steps[i].status === 'done' ? '#067647' : '#eaecf0', marginTop: 9, minWidth: 20, animation: `barFill 400ms ease-out ${animDelay + i * 120}ms both` }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Metric Card with Sparkline ─── */
export function MetricCard({ label, value, sparkValues, trend, trendLabel, animDelay = 0 }: { label: string; value: string | number; sparkValues?: number[]; trend?: 'up' | 'down' | 'flat'; trendLabel?: string; animDelay?: number }) {
  return (
    <div style={{ padding: 14, borderRadius: 8, background: '#f8f9fb', border: '1px solid #eaecf0', animation: `fadeUp 350ms ease-out ${animDelay}ms both` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#101828' }}>{value}</div>
        {sparkValues && <Sparkline values={sparkValues} width={60} height={20} />}
      </div>
      {trend && <div style={{ marginTop: 4 }}><TrendArrow direction={trend} value={trendLabel} /></div>}
    </div>
  );
}

/* ─── Checklist Item ─── */
export function CheckItem({ label, checked, animDelay = 0 }: { label: string; checked: boolean; animDelay?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: checked ? '#f0fdf4' : '#fef3f2', border: `1px solid ${checked ? '#a6f4c5' : '#fecdca'}`, animation: `fadeUp 300ms ease-out ${animDelay}ms both` }}>
      <div style={{ animation: checked ? 'popIn 300ms ease-out' : undefined }}>
        <StatusDot status={checked ? 'pass' : 'fail'} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: checked ? '#067647' : '#b42318' }}>{label}</span>
    </div>
  );
}
