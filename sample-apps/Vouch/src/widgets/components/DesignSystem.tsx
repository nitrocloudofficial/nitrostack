'use client';

import React from 'react';

// --- Color Palette Tokens ---
export const colors = {
  primary: '#4F46E5', // Deep Indigo
  primaryGlow: 'rgba(79, 70, 229, 0.35)',
  secondary: '#3B82F6', // Electric Blue
  success: '#10B981', // Emerald
  successGlow: 'rgba(16, 185, 129, 0.25)',
  warning: '#F59E0B', // Amber
  warningGlow: 'rgba(245, 158, 11, 0.25)',
  danger: '#EF4444', // Red
  dangerGlow: 'rgba(239, 68, 68, 0.25)',
  bgDark: '#0F172A', // Slate 900
  bgCard: 'rgba(30, 41, 59, 0.7)',
  bgCardHover: 'rgba(47, 63, 86, 0.85)',
  border: 'rgba(255, 255, 255, 0.1)',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
};

// --- Reusable Button Component ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  style,
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: { padding: '6px 12px', fontSize: '12px', borderRadius: '10px' },
    md: { padding: '10px 18px', fontSize: '13px', borderRadius: '12px' },
    lg: { padding: '14px 26px', fontSize: '15px', borderRadius: '14px' },
  }[size];

  const variantStyles = {
    primary: {
      background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)',
      color: '#FFFFFF',
      border: 'none',
      boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
    },
    secondary: {
      background: 'rgba(255, 255, 255, 0.08)',
      color: '#F8FAFC',
      border: '1px solid rgba(255, 255, 255, 0.12)',
    },
    outline: {
      background: 'transparent',
      color: '#818CF8',
      border: '1px solid rgba(99, 102, 241, 0.4)',
    },
    ghost: {
      background: 'transparent',
      color: '#94A3B8',
      border: 'none',
    },
    danger: {
      background: 'rgba(239, 68, 68, 0.15)',
      color: '#FCA5A5',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    },
    success: {
      background: 'rgba(16, 185, 129, 0.15)',
      color: '#6EE7B7',
      border: '1px solid rgba(16, 185, 129, 0.3)',
    },
  }[variant];

  return (
    <button
      type="button"
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: "'Inter', sans-serif",
        outline: 'none',
        ...sizeStyles,
        ...variantStyles,
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
            display: 'inline-block',
          }}
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};

// --- Reusable Card Component ---
interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, hoverEffect = true }) => {
  return (
    <div
      style={{
        background: colors.bgCard,
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        transition: hoverEffect ? 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// --- Reusable Badge Component ---
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'neutral';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'indigo',
  size = 'md',
  icon,
}) => {
  const styles = {
    indigo: { bg: 'rgba(79, 70, 229, 0.15)', color: '#818CF8', border: 'rgba(79, 70, 229, 0.3)' },
    emerald: { bg: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: 'rgba(16, 185, 129, 0.3)' },
    amber: { bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: 'rgba(245, 158, 11, 0.3)' },
    rose: { bg: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: 'rgba(239, 68, 68, 0.3)' },
    cyan: { bg: 'rgba(6, 182, 212, 0.15)', color: '#22D3EE', border: 'rgba(6, 182, 212, 0.3)' },
    neutral: { bg: 'rgba(255, 255, 255, 0.08)', color: '#94A3B8', border: 'rgba(255, 255, 255, 0.12)' },
  }[variant];

  const sizeStyle = size === 'sm'
    ? { padding: '2px 8px', fontSize: '11px', borderRadius: '8px' }
    : { padding: '4px 12px', fontSize: '12px', borderRadius: '10px' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontWeight: 600,
        background: styles.bg,
        color: styles.color,
        border: `1px solid ${styles.border}`,
        fontFamily: "'Inter', sans-serif",
        ...sizeStyle,
      }}
    >
      {icon}
      {children}
    </span>
  );
};

// --- Reusable Skeleton Shimmer Loader ---
export const Skeleton: React.FC<{ width?: string; height?: string; borderRadius?: string; style?: React.CSSProperties }> = ({
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  style,
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.05) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        ...style,
      }}
    />
  );
};

// --- Reusable Radial Gauge / Trust Score Meter ---
export const TrustScoreGauge: React.FC<{ score: number; size?: number; label?: string }> = ({
  score,
  size = 110,
  label = 'Trust Score',
}) => {
  const getScoreColor = (s: number) => {
    if (s >= 80) return colors.success;
    if (s >= 50) return colors.warning;
    return colors.danger;
  };

  const color = getScoreColor(score);
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: size * 0.28, fontWeight: 800, color: '#F8FAFC', lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>
          {score}
        </div>
        <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, marginTop: '2px' }}>
          /100
        </div>
      </div>
    </div>
  );
};
