'use client';

import React from 'react';
import {
  colors,
  confidenceColor,
  fadeKeyframes,
  font,
  mutedLabel,
  radii,
  space,
  surfaceAccent,
} from './ui';

interface OverviewCardProps {
  objective: string;
  decisionType: string;
  confidenceScore: number;
  verdict: string;
  executionTimeMs: number;
  isDark: boolean;
}

function getVerdictBadge(v: string) {
  switch (v) {
    case 'PROCEED':
      return { label: 'PROCEED', bg: colors.greenDark, color: colors.white };
    case 'PROCEED_WITH_CAUTION':
      return { label: 'PROCEED WITH CAUTION', bg: colors.amberDark, color: colors.white };
    case 'DO_NOT_PROCEED':
      return { label: 'DO NOT PROCEED', bg: colors.redDark, color: colors.white };
    default:
      return { label: 'NEEDS MORE DATA', bg: colors.blue, color: colors.white };
  }
}

export function OverviewCard({
  objective,
  decisionType,
  confidenceScore,
  verdict,
  executionTimeMs,
  isDark,
}: OverviewCardProps) {
  const badge = getVerdictBadge(verdict);
  const safeConfidence = Number.isFinite(confidenceScore) ? confidenceScore : 0;
  const safeExecution = Number.isFinite(executionTimeMs) ? executionTimeMs : 0;

  return (
    <article
      aria-label="Decision overview"
      style={{
        ...surfaceAccent(isDark),
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{fadeKeyframes}</style>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: space.md,
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 180px' }}>
          <span
            style={{
              fontSize: font.tiny,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: isDark ? colors.slate400 : colors.slate500,
            }}
          >
            {decisionType || 'GENERAL'} DECISION
          </span>
          <h2
            style={{
              margin: `${space.xs} 0 0`,
              fontSize: 20,
              fontWeight: 700,
              lineHeight: 1.35,
              wordBreak: 'break-word',
            }}
          >
            {objective || 'Decision Analysis'}
          </h2>
        </div>
        <span
          aria-label={`Verdict ${badge.label}`}
          style={{
            background: badge.bg,
            color: badge.color,
            padding: '6px 14px',
            borderRadius: radii.pill,
            fontSize: font.label,
            fontWeight: 700,
            letterSpacing: '0.5px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            flexShrink: 0,
          }}
        >
          {badge.label}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: space.lg,
          marginTop: 'auto',
          paddingTop: space.lg,
          borderTop: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <div>
          <div style={mutedLabel(isDark)}>Confidence</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              marginTop: space.xs,
              color: confidenceColor(safeConfidence),
            }}
          >
            {safeConfidence}%
          </div>
        </div>
        <div>
          <div style={mutedLabel(isDark)}>Execution Time</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: space.xs }}>{safeExecution} ms</div>
        </div>
        <div>
          <div style={mutedLabel(isDark)}>Status</div>
          <div style={{ fontSize: font.body, fontWeight: 600, marginTop: space.sm, display: 'flex', alignItems: 'center', gap: space.xs }}>
            <span aria-hidden="true">⚡</span> Complete
          </div>
        </div>
      </div>
    </article>
  );
}
