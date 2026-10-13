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

interface EngineExplanation {
  engineId: string;
  reasonForSelection: string;
  dependsOn: string[];
  executionPriority: number;
}

interface ExecutionTimelineProps {
  explanations: EngineExplanation[];
  stageBreakdown: string[];
  isDark: boolean;
}

export function ExecutionTimeline({
  explanations,
  stageBreakdown,
  isDark,
}: ExecutionTimelineProps) {
  const safeExplanations = Array.isArray(explanations) ? explanations : [];
  const safeStages = Array.isArray(stageBreakdown) ? stageBreakdown : [];

  const steps =
    safeExplanations.length > 0
      ? [
          { name: 'Context Parsing', type: 'Pipeline start', duration: '—' },
          ...safeExplanations.map((e) => ({
            name: e.engineId.replace('-engine', '').toUpperCase(),
            type:
              e.dependsOn.length === 0
                ? 'Parallel Stage'
                : `Sequential (After ${e.dependsOn.join(', ')})`,
            duration: e.reasonForSelection || 'Executed',
          })),
          { name: 'Recommendation Synthesis', type: 'Pipeline end', duration: '—' },
        ]
      : safeStages.length > 0
        ? safeStages.map((stage, idx) => ({
            name: typeof stage === 'string' ? stage : `Stage ${idx + 1}`,
            type: 'Executed stage',
            duration: '—',
          }))
        : [{ name: 'No engine stages available', type: 'Awaiting report metadata', duration: '—' }];

  return (
    <section aria-label="Engine execution timeline" style={surface(isDark)}>
      <style>{fadeKeyframes}</style>
      <h3 style={sectionTitle()}>
        <span aria-hidden="true">⏱️</span> Engine Execution Timeline
      </h3>

      <ol style={{ display: 'flex', flexDirection: 'column', gap: space.md, margin: 0, padding: 0, listStyle: 'none' }}>
        {steps.map((step, index) => (
          <li
            key={`${step.name}-${index}`}
            style={{
              ...inset(isDark),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: space.md,
              flexWrap: 'wrap',
              borderLeft: `4px solid ${
                index === 0 || index === steps.length - 1 ? colors.blue : colors.green
              }`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: space.md, minWidth: 0 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isDark ? colors.slate600 : '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: font.label,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: font.body }}>{step.name}</div>
                <div style={{ fontSize: font.label, opacity: 0.7 }}>{step.type}</div>
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: font.label, fontWeight: 700, color: colors.blue }}>{step.duration}</div>
              <div style={{ fontSize: 10, color: colors.green }}>✓ Executed</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
