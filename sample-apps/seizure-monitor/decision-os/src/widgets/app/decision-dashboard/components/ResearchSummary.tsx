'use client';

import React from 'react';
import {
  colors,
  fadeKeyframes,
  font,
  inset,
  sectionTitle,
  space,
  surface,
} from './ui';

interface ResearchSummaryProps {
  assumptions: string[];
  limitations: string[];
  findings?: string[];
  isDark: boolean;
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  const list = items.length > 0 ? items : [empty];
  return (
    <ul style={{ margin: 0, paddingLeft: 20, fontSize: font.small, lineHeight: 1.6 }}>
      {list.map((item, idx) => (
        <li key={idx} style={{ marginBottom: 4 }}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function ResearchSummary({
  assumptions,
  limitations,
  findings = [],
  isDark,
}: ResearchSummaryProps) {
  const primaryFindings =
    findings.length > 0 ? findings : assumptions.length > 0 ? assumptions : [];

  return (
    <section aria-label="Research and fact synthesis" style={surface(isDark)}>
      <style>{fadeKeyframes}</style>
      <h3 style={sectionTitle()}>
        <span aria-hidden="true">🔍</span> Research & Fact Synthesis
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          gap: space.lg,
        }}
      >
        <div style={inset(isDark)}>
          <h4
            style={{
              margin: `0 0 ${space.sm}`,
              fontWeight: 700,
              fontSize: font.body,
              color: colors.blue,
              display: 'flex',
              alignItems: 'center',
              gap: space.xs,
            }}
          >
            <span aria-hidden="true">📌</span> Key Findings
          </h4>
          <BulletList
            items={primaryFindings}
            empty="No research findings in the current DecisionReport."
          />
        </div>

        <div style={inset(isDark)}>
          <h4
            style={{
              margin: `0 0 ${space.sm}`,
              fontWeight: 700,
              fontSize: font.body,
              color: colors.amber,
              display: 'flex',
              alignItems: 'center',
              gap: space.xs,
            }}
          >
            <span aria-hidden="true">⚠️</span> Unknowns & Data Limitations
          </h4>
          <BulletList items={limitations} empty="No explicit limitations returned." />
        </div>
      </div>
    </section>
  );
}
