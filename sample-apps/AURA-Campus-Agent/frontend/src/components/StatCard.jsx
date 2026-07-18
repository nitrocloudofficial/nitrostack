import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ title, value, unit, icon: Icon, color = '#00f0ff', trend, trendLabel }) {
  return (
    <div style={{ ...S.card }} className="glass-panel">
      {/* Neon corner accent */}
      <div style={{ ...S.cornerAccent, background: `radial-gradient(circle at 0 0, ${color}20, transparent 70%)` }} />

      {/* Top row: title + icon */}
      <div style={S.top}>
        <span style={S.title}>{title}</span>
        <div style={{ ...S.iconWrap, background: `${color}18`, border: `1px solid ${color}35`, boxShadow: `0 0 12px ${color}30` }}>
          <Icon size={16} color={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        </div>
      </div>

      {/* Value */}
      <div style={S.valRow}>
        <span style={{ ...S.value, color }}>
          {value}
        </span>
        {unit && <span style={S.unit}>{unit}</span>}
      </div>

      {/* Trend indicator */}
      {trend !== undefined && (
        <div style={S.trend}>
          {trend >= 0
            ? <TrendingUp size={11} color="#00ff9f" />
            : <TrendingDown size={11} color="#ff2d55" />}
          <span style={{ color: trend >= 0 ? '#00ff9f' : '#ff2d55', fontSize: '0.68rem', fontWeight: 700 }}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          {trendLabel && <span style={S.trendLabel}>{trendLabel}</span>}
        </div>
      )}

      {/* Bottom neon line */}
      <div style={{ ...S.bottomLine, background: `linear-gradient(90deg, ${color}60, ${color}20, transparent)` }} />
    </div>
  );
}

const S = {
  card: {
    padding: '18px 20px 16px',
    display: 'flex', flexDirection: 'column', gap: '10px',
    position: 'relative', overflow: 'hidden',
    minHeight: '120px',
  },
  cornerAccent: {
    position: 'absolute', top: 0, left: 0,
    width: '80px', height: '80px',
    borderRadius: '0 0 100% 0',
    pointerEvents: 'none', zIndex: 0,
  },
  top: {
    display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: '8px',
    position: 'relative', zIndex: 1,
  },
  title: {
    fontSize: '0.72rem', fontWeight: '700',
    color: 'var(--txt-soft)', textTransform: 'uppercase',
    letterSpacing: '0.8px', lineHeight: 1.3, flex: 1,
  },
  iconWrap: {
    width: '34px', height: '34px', borderRadius: '9px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'all 0.3s ease',
  },
  valRow: {
    display: 'flex', alignItems: 'baseline', gap: '5px',
    position: 'relative', zIndex: 1,
  },
  value: {
    fontSize: '1.9rem', fontWeight: '900',
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: '-0.03em',
    transition: 'color 0.3s',
  },
  unit: {
    fontSize: '0.78rem', color: 'var(--txt-dim)',
    fontWeight: '600', letterSpacing: '0.3px',
  },
  trend: {
    display: 'flex', alignItems: 'center', gap: '4px',
    position: 'relative', zIndex: 1,
  },
  trendLabel: {
    fontSize: '0.65rem', color: 'var(--txt-dim)', fontWeight: '500',
  },
  bottomLine: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '2px', pointerEvents: 'none',
  },
};
