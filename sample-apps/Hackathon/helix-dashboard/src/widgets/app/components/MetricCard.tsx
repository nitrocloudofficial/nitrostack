'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trendBadge?: {
    text: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  progressPercentage?: number;
  statusColor?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'neon';
  icon?: React.ReactNode;
  delay?: number;
  sparklineData?: number[];
  gaugeValue?: number;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trendBadge,
  progressPercentage,
  statusColor = 'neon',
  icon,
  delay = 0,
  sparklineData,
  gaugeValue,
  onClick,
}) => {
  const getColorHex = (color: string) => {
    switch (color) {
      case 'emerald': return '#10B981';
      case 'amber': return '#3B82F6';
      case 'rose': return '#EF4444';
      case 'neon': return '#2563EB';
      case 'indigo': return '#6366F1';
      default: return '#2563EB';
    }
  };

  const accentHex = getColorHex(statusColor);

  // Sparkline Generator
  const renderSparkline = (data: number[], color: string) => {
    if (!data || data.length === 0) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 70; // slightly smaller width
    const height = 30;
    const step = width / (data.length - 1);
    
    const points = data.map((d, i) => {
      const x = i * step;
      const y = height - ((d - min) / range) * (height - 6) - 3; // pad top/bottom
      return `${x},${y}`;
    }).join(' L ');
    
    return (
      <svg width="70" height="30" viewBox="0 0 70 30" style={{ overflow: 'hidden' }}>
        <path d={`M ${points}`} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
          style={{ filter: `drop-shadow(0px 3px 4px ${color}60)` }} />
      </svg>
    );
  };

  // Circular Gauge Generator
  const renderGauge = (value: number, color: string) => {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return (
      <div style={{ position: 'relative', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
          <motion.circle 
            cx="20" cy="20" r={radius} 
            fill="none" 
            stroke={color} 
            strokeWidth="4" 
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, delay: delay + 0.3, ease: "easeOut" }}
            style={{ strokeDasharray: circumference, filter: `drop-shadow(0 0 4px ${color}80)` }}
            transform="rotate(-90 20 20)"
          />
        </svg>
        <span style={{ position: 'absolute', fontSize: '10px', fontWeight: 800, color: '#FFF' }}>
          {Math.round(value)}%
        </span>
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5, boxShadow: `0 12px 30px -10px rgba(0,0,0,0.8), 0 0 20px ${accentHex}25` }}
      className="glass-card" 
      onClick={onClick}
      style={{
        padding: '20px 24px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '135px',
        overflow: 'hidden', // PREVENT BLEEDING
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Top accent glow line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: `linear-gradient(90deg, ${accentHex} 0%, transparent 100%)`,
        opacity: 0.8,
      }} />

      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {title}
        </span>
        {icon && (
          <div style={{
            color: accentHex,
            backgroundColor: `${accentHex}15`,
            padding: '8px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${accentHex}30`,
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* Value Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          <span className="glow-text" style={{ 
            fontSize: typeof value === 'string' && value.length > 14 ? '18px' : '26px', 
            fontWeight: 800, 
            color: '#FFFFFF', 
            letterSpacing: '-0.5px', 
            whiteSpace: typeof value === 'string' && value.length > 14 ? 'normal' : 'nowrap', 
            lineHeight: '1.2'
          }}>
            {value}
          </span>

          {trendBadge && (
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: '12px',
              backgroundColor: trendBadge.isNeutral
                ? 'rgba(161, 161, 170, 0.1)'
                : trendBadge.isPositive
                ? 'rgba(16, 185, 129, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
              color: trendBadge.isNeutral
                ? '#A1A1AA'
                : trendBadge.isPositive
                ? '#10B981'
                : '#EF4444',
              border: `1px solid ${
                trendBadge.isNeutral
                  ? 'rgba(161, 161, 170, 0.2)'
                  : trendBadge.isPositive
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)'
              }`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}>
              {trendBadge.text}
            </span>
          )}
        </div>

        {/* Dynamic Visualizations on the Right */}
        {sparklineData && sparklineData.length > 0 && (
          <div style={{ marginLeft: 'auto', flexShrink: 0, width: '70px' }}>
            {renderSparkline(sparklineData, accentHex)}
          </div>
        )}
        
        {gaugeValue !== undefined && (
          <div style={{ marginLeft: 'auto', flexShrink: 0, width: '40px' }}>
            {renderGauge(gaugeValue, accentHex)}
          </div>
        )}
      </div>

      {/* Progress Bar or Subtitle */}
      {progressPercentage !== undefined ? (
        <div style={{ marginTop: '16px' }}>
          <div style={{
            height: '4px',
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
              transition={{ duration: 1, delay: delay + 0.2, ease: "easeOut" }}
              style={{
                height: '100%',
                backgroundColor: accentHex,
                boxShadow: `0 0 10px ${accentHex}`,
              }} 
            />
          </div>
          {subtitle && (
            <span style={{ fontSize: '11px', color: '#52525B', marginTop: '8px', display: 'block', fontWeight: 500 }}>
              {subtitle}
            </span>
          )}
        </div>
      ) : subtitle ? (
        <span style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '6px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subtitle}
        </span>
      ) : null}
    </motion.div>
  );
};
