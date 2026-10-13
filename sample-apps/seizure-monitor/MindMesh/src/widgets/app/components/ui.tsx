'use client';

import React from 'react';
import { DESIGN, getPhaseColor } from './design-tokens';

interface PhaseBadgeProps {
  phase: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function PhaseBadge({ phase, size = 'md', showLabel = true }: PhaseBadgeProps) {
  const phaseInfo = require('./design-tokens').getPhaseInfo(phase);
  const color = getPhaseColor(phase);
  const group = require('./design-tokens').getPhaseGroup(phase);

  const sizes = {
    sm: { px: 8, py: 2, fs: 11, gap: 4 },
    md: { px: 10, py: 3, fs: 12, gap: 6 },
    lg: { px: 12, py: 4, fs: 13, gap: 8 },
  };
  const s = sizes[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: `${s.py}px ${s.px}px`,
        backgroundColor: `${color}20`,
        border: `1px solid ${color}60`,
        borderRadius: DESIGN.radius.md,
        fontSize: s.fs,
        fontWeight: 600,
        color,
        fontFamily: DESIGN.fonts.mono,
        whiteSpace: 'nowrap',
      }}
    >
      {showLabel && phaseInfo && (
        <span style={{ opacity: 0.9 }}>{phaseInfo.name}</span>
      )}
      <span style={{ fontFamily: DESIGN.fonts.mono }}>P{phase}</span>
    </span>
  );
}

interface ToolChipProps {
  name: string;
  phase?: number;
  active?: boolean;
  onClick?: () => void;
  showPhase?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ToolChip({ name, phase, active = false, onClick, showPhase = true, size = 'sm' }: ToolChipProps) {
  const color = phase !== undefined ? getPhaseColor(phase) : DESIGN.colors.amber;
  const fontSize = size === 'sm' ? 11 : size === 'md' ? 12 : 13;
  const padding = size === 'sm' ? `${DESIGN.spacing.xs}px ${DESIGN.spacing.sm}px` : size === 'md' ? `${DESIGN.spacing.sm}px ${DESIGN.spacing.md}px` : `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`;

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: DESIGN.spacing.xs,
        padding,
        backgroundColor: active ? `${color}20` : 'transparent',
        border: `1px solid ${active ? color : DESIGN.colors.border}`,
        borderRadius: DESIGN.radius.sm,
        fontSize,
        fontWeight: 500,
        color: active ? color : DESIGN.colors.fgMuted,
        fontFamily: DESIGN.fonts.mono,
        cursor: onClick ? 'pointer' : 'default',
        transition: DESIGN.transitions.fast,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.borderColor = color;
        if (onClick) e.currentTarget.style.color = color;
      }}
      onMouseLeave={(e) => {
        if (!active && onClick) e.currentTarget.style.borderColor = DESIGN.colors.border;
        if (!active && onClick) e.currentTarget.style.color = DESIGN.colors.fgMuted;
      }}
    >
      <code style={{ fontSize: 11 }}>{name}</code>
      {showPhase && phase !== undefined && (
        <span
          style={{
            fontSize: 9,
            padding: '1px 4px',
            backgroundColor: `${color}30`,
            borderRadius: DESIGN.radius.sm,
            color,
            fontWeight: 600,
          }}
        >
          P{phase}
        </span>
      )}
    </button>
  );
}

interface StatusDotProps {
  status: 'idle' | 'pending' | 'in-progress' | 'synced' | 'completed' | 'error' | 'review' | 'creating' | 'syncing' | 'modified';
  size?: number;
  label?: string;
}

export function StatusDot({ status, size = 8, label }: StatusDotProps) {
  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    idle: { color: DESIGN.colors.fgDim, bg: DESIGN.colors.fgDim, label: 'Idle' },
    pending: { color: DESIGN.colors.amber, bg: DESIGN.colors.amber, label: 'Pending' },
    'in-progress': { color: DESIGN.colors.blue, bg: DESIGN.colors.blue, label: 'In Progress' },
    synced: { color: DESIGN.colors.green, bg: DESIGN.colors.green, label: 'Synced' },
    completed: { color: DESIGN.colors.green, bg: DESIGN.colors.green, label: 'Completed' },
    error: { color: DESIGN.colors.red, bg: DESIGN.colors.red, label: 'Error' },
    review: { color: DESIGN.colors.phaseStretch, bg: DESIGN.colors.phaseStretch, label: 'Review' },
    creating: { color: DESIGN.colors.blue, bg: DESIGN.colors.blue, label: 'Creating' },
    syncing: { color: DESIGN.colors.blue, bg: DESIGN.colors.blue, label: 'Syncing' },
    modified: { color: DESIGN.colors.amber, bg: DESIGN.colors.amber, label: 'Modified' },
  };

  const config = statusConfig[status] || statusConfig.idle;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: DESIGN.spacing.xs,
        fontSize: 11,
        color: DESIGN.colors.fgMuted,
        fontFamily: DESIGN.fonts.mono,
      }}
    >
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: config.bg,
          boxShadow: `0 0 ${size * 2}px ${config.bg}`,
          animation: status === 'in-progress' || status === 'pending' ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}
      />
      {label || config.label}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
      `}</style>
    </span>
  );
}

interface StatusIndicatorProps {
  status: StatusDotProps['status'];
  text?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function StatusIndicator({ status, text, className = '', style }: StatusIndicatorProps) {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: DESIGN.spacing.xs, ...style }}>
      <StatusDot status={status} size={6} />
      {text && <span style={{ fontSize: 11, color: DESIGN.colors.fgMuted, fontFamily: DESIGN.fonts.mono }}>{text}</span>}
    </span>
  );
}

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  style?: React.CSSProperties;
}

export function Separator({ orientation = 'horizontal', className = '', style }: SeparatorProps) {
  return (
    <div
      className={className}
      style={{
        ...(orientation === 'horizontal'
          ? { width: '100%', height: 1, backgroundColor: DESIGN.colors.border }
          : { width: 1, height: '100%', backgroundColor: DESIGN.colors.border }),
        flexShrink: 0,
      }}
    />
  );
}

interface CardProps {
  children: React.ReactNode;
  elevated?: boolean;
  padding?: keyof typeof DESIGN.spacing;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({ children, elevated = false, padding = 'md', className = '', onClick, style }: CardProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        backgroundColor: elevated ? DESIGN.colors.bgElevated : DESIGN.colors.bg,
        border: `1px solid ${DESIGN.colors.border}`,
        borderRadius: DESIGN.radius.lg,
        padding: DESIGN.spacing[padding],
        boxShadow: elevated ? DESIGN.shadows.md : DESIGN.shadows.sm,
        transition: DESIGN.transitions.normal,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
        ...(onClick && {
          ':hover': {
            borderColor: DESIGN.colors.borderBright,
            boxShadow: DESIGN.shadows.md,
          },
        }),
      }}
    >
      {children}
    </div>
  );
}

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style' | 'ref'> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, icon, error, className = '', style = {}, inputStyle, ...props }, ref) => {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: DESIGN.spacing.xs, ...style }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 600, color: DESIGN.colors.fgMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: DESIGN.fonts.mono }}>
          {label}
        </label>
      )}
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        {icon && (
          <span style={{ position: 'absolute', left: DESIGN.spacing.sm, color: DESIGN.colors.fgDim, pointerEvents: 'none', fontSize: 14 }}>{icon}</span>
        )}
        <input
          ref={ref}
          {...props}
          style={{
            width: '100%',
            padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.md}px`,
            paddingLeft: icon ? DESIGN.spacing.xl : DESIGN.spacing.md,
            backgroundColor: DESIGN.colors.bg,
            border: `1px solid ${error ? DESIGN.colors.red : DESIGN.colors.border}`,
            borderRadius: DESIGN.radius.md,
            fontSize: 13,
            color: DESIGN.colors.fg,
            fontFamily: DESIGN.fonts.sans,
            outline: 'none',
            transition: DESIGN.transitions.fast,
            ...inputStyle,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = DESIGN.colors.amber;
            e.currentTarget.style.boxShadow = DESIGN.shadows.glowAmber;
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? DESIGN.colors.red : DESIGN.colors.border;
            e.currentTarget.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
        />
      </div>
      {error && <span style={{ fontSize: 11, color: DESIGN.colors.red, fontFamily: DESIGN.fonts.mono }}>{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  className = '',
  style = {},
  onClick,
  ...props
}: ButtonProps) {
  const variants = {
    primary: {
      bg: DESIGN.colors.amber,
      bgHover: DESIGN.colors.amberDim,
      border: DESIGN.colors.amber,
      color: DESIGN.colors.bg,
      disabledBg: DESIGN.colors.fgDim,
    },
    secondary: {
      bg: DESIGN.colors.bgElevated,
      bgHover: DESIGN.colors.bgHover,
      border: DESIGN.colors.borderBright,
      color: DESIGN.colors.fg,
      disabledBg: DESIGN.colors.border,
    },
    ghost: {
      bg: 'transparent',
      bgHover: DESIGN.colors.bgHover,
      border: 'transparent',
      color: DESIGN.colors.amber,
      disabledBg: 'transparent',
    },
    danger: {
      bg: DESIGN.colors.red,
      bgHover: '#dc2626',
      border: DESIGN.colors.red,
      color: DESIGN.colors.fg,
      disabledBg: DESIGN.colors.border,
    },
  };

  const sizes = {
    sm: { px: DESIGN.spacing.sm, py: DESIGN.spacing.xs, fs: 11, gap: DESIGN.spacing.xs },
    md: { px: DESIGN.spacing.md, py: DESIGN.spacing.sm, fs: 12, gap: DESIGN.spacing.sm },
    lg: { px: DESIGN.spacing.lg, py: DESIGN.spacing.md, fs: 13, gap: DESIGN.spacing.sm },
  };

  const v = variants[variant];
  const s = sizes[size];
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      onClick={onClick}
      disabled={isDisabled}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        padding: `${s.py}px ${s.px}px`,
        backgroundColor: isDisabled ? v.disabledBg : v.bg,
        border: `1px solid ${isDisabled ? 'transparent' : v.border}`,
        borderRadius: DESIGN.radius.md,
        fontSize: s.fs,
        fontWeight: 600,
        color: isDisabled ? DESIGN.colors.fgDim : v.color,
        fontFamily: DESIGN.fonts.sans,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: DESIGN.transitions.fast,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {loading && (
        <span
          style={{
            width: s.fs,
            height: s.fs,
            borderRadius: '50%',
            border: `2px solid ${v.color}40`,
            borderTopColor: v.color,
            animation: 'spin 0.8s linear infinite',
          }}
        >
          <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </span>
      )}
      {!loading && leftIcon && <span>{leftIcon}</span>}
      <span>{children}</span>
      {!loading && rightIcon && <span>{rightIcon}</span>}
    </button>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export function Badge({ children, variant = 'default', size = 'md', style }: BadgeProps) {
  const variants = {
    default: { bg: DESIGN.colors.border, color: DESIGN.colors.fgMuted, border: DESIGN.colors.border },
    success: { bg: DESIGN.colors.greenBg, color: DESIGN.colors.green, border: DESIGN.colors.greenBorder },
    warning: { bg: DESIGN.colors.amberBg, color: DESIGN.colors.amber, border: DESIGN.colors.amberBorder },
    error: { bg: DESIGN.colors.redBg, color: DESIGN.colors.red, border: DESIGN.colors.redBorder },
    info: { bg: DESIGN.colors.blueBg, color: DESIGN.colors.blue, border: DESIGN.colors.blueBorder },
  };

  const sizes = {
    sm: { px: 6, py: 1, fs: 10 },
    md: { px: 8, py: 2, fs: 11 },
  };

  const v = variants[variant];
  const s = sizes[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: `${s.py}px ${s.px}px`,
        backgroundColor: v.bg,
        border: `1px solid ${v.border}`,
        borderRadius: DESIGN.radius.sm,
        fontSize: s.fs,
        fontWeight: 600,
        color: v.color,
        fontFamily: DESIGN.fonts.mono,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}