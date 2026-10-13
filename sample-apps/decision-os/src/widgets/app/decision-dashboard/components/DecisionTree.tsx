'use client';

import React, { useState } from 'react';
import {
  colors,
  fadeKeyframes,
  font,
  inset,
  pathButton,
  sectionTitle,
  space,
  surface,
} from './ui';

interface DecisionTreeProps {
  objective: string;
  verdict: string;
  alternatives?: string[];
  nextSteps?: string[];
  isDark: boolean;
}

type BranchKey = 'recommended' | 'alternateA' | 'alternateB';

export function DecisionTree({
  objective,
  verdict,
  alternatives = [],
  nextSteps = [],
  isDark,
}: DecisionTreeProps) {
  const [selectedBranch, setSelectedBranch] = useState<BranchKey>('recommended');

  const altA = alternatives[0] || 'Pursue a scaled-down or staged version of this decision.';
  const altB = alternatives[1] || 'Delay action and gather the missing decision-critical information.';
  const primaryAction = nextSteps[0] || `Act according to verdict: ${String(verdict).replace(/_/g, ' ')}`;

  const branches: Record<
    BranchKey,
    { title: string; outcome: string; tradeoffs: string; recommendation: string; accent: string }
  > = {
    recommended: {
      title: `🌟 Recommended Path: ${String(verdict || 'NEEDS_MORE_DATA').replace(/_/g, ' ')}`,
      outcome: `Aligned with current recommendation for: ${objective}`,
      tradeoffs:
        nextSteps.slice(0, 2).join(' · ') ||
        'Follow the executive recommendation and monitor early signals.',
      recommendation: primaryAction,
      accent: colors.green,
    },
    alternateA: {
      title: '🚀 Alternate Option A',
      outcome: altA,
      tradeoffs: 'May trade speed or upside for lower immediate exposure.',
      recommendation: alternatives[0]
        ? `Explore: ${alternatives[0]}`
        : 'Define a lower-commitment pilot before full commitment.',
      accent: colors.blue,
    },
    alternateB: {
      title: '⏸️ Alternate Option B',
      outcome: altB,
      tradeoffs: 'Preserves optionality but may delay upside or first-mover effects.',
      recommendation: alternatives[1]
        ? `Explore: ${alternatives[1]}`
        : 'Collect missing data, then re-run DecisionOS analysis.',
      accent: colors.amber,
    },
  };

  const active = branches[selectedBranch];

  const buttons: Array<{ key: BranchKey; label: string; color: string }> = [
    { key: 'recommended', label: 'Path 1: Recommended', color: colors.green },
    { key: 'alternateA', label: 'Path 2: Alternate A', color: colors.blue },
    { key: 'alternateB', label: 'Path 3: Alternate B', color: colors.amber },
  ];

  return (
    <section aria-label="Decision tree and tradeoffs" style={surface(isDark)}>
      <style>{fadeKeyframes}</style>
      <h3 style={sectionTitle()}>
        <span aria-hidden="true">🌳</span> Interactive Decision Tree & Tradeoffs
      </h3>

      <div
        role="tablist"
        aria-label="Decision paths"
        style={{ display: 'flex', gap: space.sm, marginBottom: space.lg, flexWrap: 'wrap' }}
      >
        {buttons.map((btn) => {
          const selected = selectedBranch === btn.key;
          return (
            <button
              key={btn.key}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="decision-path-panel"
              id={`path-tab-${btn.key}`}
              onClick={() => setSelectedBranch(btn.key)}
              onMouseEnter={(e) => {
                if (!selected) e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
              }}
              style={pathButton(selected, btn.color, isDark)}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      <div
        id="decision-path-panel"
        role="tabpanel"
        aria-labelledby={`path-tab-${selectedBranch}`}
        style={{
          ...inset(isDark),
          borderLeft: `4px solid ${active.accent}`,
          animation: 'dosFadeIn 220ms ease-out',
        }}
      >
        <h4 style={{ margin: `0 0 ${space.sm}`, fontSize: 15, color: active.accent }}>{active.title}</h4>
        <p style={{ fontSize: font.small, margin: `0 0 6px`, lineHeight: 1.5 }}>
          <strong>Expected Outcome:</strong> {active.outcome}
        </p>
        <p style={{ fontSize: font.small, margin: `0 0 6px`, opacity: 0.9, lineHeight: 1.5 }}>
          <strong>Key Tradeoffs:</strong> {active.tradeoffs}
        </p>
        <p style={{ fontSize: font.small, margin: 0, color: colors.blue, fontWeight: 600, lineHeight: 1.5 }}>
          <strong>Action:</strong> {active.recommendation}
        </p>
      </div>
    </section>
  );
}
