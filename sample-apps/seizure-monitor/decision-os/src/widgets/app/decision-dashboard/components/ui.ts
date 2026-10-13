/** Shared Decision Dashboard design tokens — visual consistency only. */

import type { CSSProperties } from 'react';

export const colors = {
  blue: '#3b82f6',
  green: '#10b981',
  greenDark: '#059669',
  amber: '#f59e0b',
  amberDark: '#d97706',
  red: '#ef4444',
  redDark: '#dc2626',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#334155',
  slate700: '#1e293b',
  slate800: '#0f172a',
  slate100: '#f1f5f9',
  slate50: '#f8fafc',
  white: '#ffffff',
} as const;

export const radii = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  pill: '999px',
} as const;

export const space = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
} as const;

export const font = {
  family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  title: 22,
  section: 18,
  body: 14,
  small: 13,
  label: 12,
  tiny: 11,
} as const;

export function surface(isDark: boolean): CSSProperties {
  return {
    background: isDark ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(10px)',
    borderRadius: radii.lg,
    padding: space.xxl,
    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
    color: isDark ? colors.slate50 : colors.slate800,
    boxSizing: 'border-box',
    width: '100%',
    animation: 'dosFadeIn 280ms ease-out',
    transition: 'box-shadow 160ms ease, border-color 160ms ease',
  };
}

export function surfaceAccent(isDark: boolean): CSSProperties {
  return {
    ...surface(isDark),
    background: isDark
      ? 'linear-gradient(135deg, rgba(30,41,59,0.85) 0%, rgba(15,23,42,0.95) 100%)'
      : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(241,245,249,0.95) 100%)',
    boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
  };
}

export function inset(isDark: boolean): CSSProperties {
  return {
    padding: space.lg,
    borderRadius: radii.md,
    background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(241,245,249,0.8)',
    boxSizing: 'border-box',
  };
}

export function sectionTitle(): CSSProperties {
  return {
    margin: `0 0 ${space.lg} 0`,
    fontSize: font.section,
    fontWeight: 700,
    lineHeight: 1.3,
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
  };
}

export function mutedLabel(isDark: boolean): CSSProperties {
  return {
    fontSize: font.label,
    opacity: 0.7,
    color: isDark ? colors.slate400 : colors.slate500,
  };
}

export function tabButton(active: boolean, isDark: boolean): CSSProperties {
  return {
    padding: `${space.sm} ${space.md}`,
    borderRadius: radii.sm,
    border: 'none',
    background: active ? colors.blue : isDark ? colors.slate700 : '#e2e8f0',
    color: active ? colors.white : isDark ? colors.slate50 : colors.slate800,
    fontSize: font.label,
    fontWeight: 600,
    cursor: 'pointer',
    textTransform: 'capitalize' as const,
    transition: 'background 140ms ease, transform 140ms ease',
  };
}

export function pathButton(active: boolean, activeColor: string, isDark: boolean): CSSProperties {
  return {
    padding: `${space.sm} 14px`,
    borderRadius: '10px',
    border: 'none',
    background: active ? activeColor : isDark ? colors.slate600 : '#cbd5e1',
    color: active ? colors.white : isDark ? colors.slate50 : colors.slate800,
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: font.label,
    transition: 'background 140ms ease, transform 140ms ease',
  };
}

export const fadeKeyframes = `
@keyframes dosFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

export function confidenceColor(score: number): string {
  if (score >= 80) return colors.green;
  if (score >= 50) return colors.amber;
  return colors.red;
}
