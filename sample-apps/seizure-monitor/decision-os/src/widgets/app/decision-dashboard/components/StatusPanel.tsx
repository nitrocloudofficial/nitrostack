'use client';

import React from 'react';
import { colors, fadeKeyframes, font, radii, space } from './ui';

interface StatusPanelProps {
  isDark: boolean;
  title?: string;
  message: string;
  detail?: React.ReactNode;
  tone?: 'neutral' | 'error' | 'info';
  role?: 'status' | 'alert';
}

export function StatusPanel({
  isDark,
  title = 'DecisionOS Command Center',
  message,
  detail,
  tone = 'neutral',
  role = 'status',
}: StatusPanelProps) {
  const messageColor =
    tone === 'error' ? colors.red : tone === 'info' ? colors.blue : undefined;

  return (
    <div
      role={role}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      style={{
        padding: '32px',
        textAlign: 'center',
        background: isDark ? colors.slate800 : colors.slate50,
        color: isDark ? colors.slate50 : colors.slate800,
        borderRadius: radii.lg,
        fontFamily: font.family,
        animation: 'dosFadeIn 280ms ease-out',
        boxSizing: 'border-box',
      }}
    >
      <style>{fadeKeyframes}</style>
      <div
        style={{
          width: 36,
          height: 36,
          margin: `0 auto ${space.md}`,
          borderRadius: radii.pill,
          border: `3px solid ${isDark ? colors.slate600 : '#e2e8f0'}`,
          borderTopColor: colors.blue,
          animation: tone === 'neutral' ? 'dosSpin 0.9s linear infinite' : undefined,
          display: tone === 'neutral' ? 'block' : 'none',
        }}
        aria-hidden="true"
      />
      <style>{`@keyframes dosSpin { to { transform: rotate(360deg); } }`}</style>
      <h1 style={{ fontSize: 22, margin: `0 0 ${space.sm}`, fontWeight: 800 }}>{title}</h1>
      <p
        style={{
          margin: 0,
          opacity: messageColor ? 1 : 0.75,
          color: messageColor,
          fontWeight: tone === 'error' ? 700 : 500,
          fontSize: font.body,
          lineHeight: 1.5,
        }}
      >
        {message}
      </p>
      {detail ? (
        <div
          style={{
            opacity: 0.65,
            fontSize: font.label,
            marginTop: space.md,
            lineHeight: 1.5,
            maxWidth: 520,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {detail}
        </div>
      ) : null}
    </div>
  );
}
