'use client';

import React from 'react';
import {
  colors,
  fadeKeyframes,
  font,
  inset,
  radii,
  sectionTitle,
  space,
  surfaceAccent,
} from './ui';

interface RecommendationPanelProps {
  summary: string;
  recommendations: string[];
  pros?: string[];
  cons?: string[];
  verdict: string;
  isDark: boolean;
}

export function RecommendationPanel({
  summary,
  recommendations,
  pros = [],
  cons = [],
  verdict,
  isDark,
}: RecommendationPanelProps) {
  const nextSteps =
    recommendations.length > 0
      ? recommendations
      : ['No next steps were provided in the current DecisionReport.'];
  const verdictLabel = String(verdict || 'NEEDS_MORE_DATA').replace(/_/g, ' ');

  return (
    <section aria-label="Executive recommendation" style={surfaceAccent(isDark)}>
      <style>{fadeKeyframes}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: space.md,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 24, lineHeight: 1 }} aria-hidden="true">
          📋
        </span>
        <h3 style={{ ...sectionTitle(), margin: 0, fontSize: 20, fontWeight: 800 }}>
          Final Strategic Executive Verdict
        </h3>
        <span
          aria-label={`Verdict ${verdictLabel}`}
          style={{
            marginLeft: 'auto',
            background: colors.blue,
            color: colors.white,
            padding: '4px 10px',
            borderRadius: radii.pill,
            fontSize: font.tiny,
            fontWeight: 700,
            letterSpacing: '0.4px',
          }}
        >
          {verdictLabel}
        </span>
      </div>

      <div
        style={{
          ...inset(isDark),
          background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(241,245,249,0.9)',
          fontSize: font.body,
          lineHeight: 1.6,
          marginBottom: space.xl,
        }}
      >
        {summary || 'No executive summary was returned for this decision.'}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          gap: space.lg,
          marginBottom: space.xl,
        }}
      >
        <div
          style={{
            padding: space.lg,
            borderRadius: radii.md,
            background: isDark ? 'rgba(6,78,59,0.2)' : 'rgba(209,250,229,0.6)',
            border: `1px solid ${colors.green}`,
          }}
        >
          <h4 style={{ margin: `0 0 10px`, color: colors.green, fontSize: 15 }}>
            ✅ Strategic Pros
          </h4>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: font.small, lineHeight: 1.5 }}>
            {(pros.length > 0 ? pros : ['No pros returned in recommendation.']).map((p, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            padding: space.lg,
            borderRadius: radii.md,
            background: isDark ? 'rgba(127,29,29,0.2)' : 'rgba(254,226,226,0.6)',
            border: `1px solid ${colors.red}`,
          }}
        >
          <h4 style={{ margin: `0 0 10px`, color: colors.red, fontSize: 15 }}>
            ⚠️ Key Risks & Cons
          </h4>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: font.small, lineHeight: 1.5 }}>
            {(cons.length > 0 ? cons : ['No cons returned in recommendation.']).map((c, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        style={{
          padding: space.lg,
          borderRadius: radii.md,
          background: isDark ? 'rgba(30,58,138,0.3)' : 'rgba(219,234,254,0.7)',
          borderLeft: `4px solid ${colors.blue}`,
        }}
      >
        <h4 style={{ margin: `0 0 10px`, color: colors.blue, fontSize: 15 }}>
          🚀 Recommended Immediate Action Steps
        </h4>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: font.small, lineHeight: 1.7, fontWeight: 600 }}>
          {nextSteps.map((step, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>
              {step.replace(/^\d+\.\s*/, '')}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
