'use client';

import React from 'react';
import {
  colors,
  fadeKeyframes,
  inset,
  mutedLabel,
  sectionTitle,
  space,
  surface,
} from './ui';

interface FinancialSummaryProps {
  estimatedCost: string | number;
  estimatedRevenue: string | number;
  roi: string | number;
  breakEvenMonths?: number | null;
  isDark: boolean;
}

function formatValue(value: string | number): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString();
  }
  const text = String(value ?? '').trim();
  return text || 'Unavailable';
}

function MetricCell({
  label,
  value,
  color,
  isDark,
}: {
  label: string;
  value: string;
  color: string;
  isDark: boolean;
}) {
  return (
    <div style={inset(isDark)}>
      <div style={mutedLabel(isDark)}>{label}</div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color,
          marginTop: space.xs,
          wordBreak: 'break-word',
          lineHeight: 1.35,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function FinancialSummary({
  estimatedCost,
  estimatedRevenue,
  roi,
  breakEvenMonths,
  isDark,
}: FinancialSummaryProps) {
  const costLabel = formatValue(estimatedCost);
  const revenueLabel = formatValue(estimatedRevenue);
  const roiLabel = formatValue(roi);
  const breakEvenLabel =
    typeof breakEvenMonths === 'number' && Number.isFinite(breakEvenMonths)
      ? `${breakEvenMonths} Months`
      : 'Insufficient data';

  return (
    <section aria-label="Financial feasibility summary" style={surface(isDark)}>
      <style>{fadeKeyframes}</style>
      <h3 style={sectionTitle()}>
        <span aria-hidden="true">💰</span> Financial Feasibility Summary
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
          gap: space.lg,
        }}
      >
        <MetricCell label="Estimated Cost" value={costLabel} color={colors.red} isDark={isDark} />
        <MetricCell label="Estimated Revenue" value={revenueLabel} color={colors.green} isDark={isDark} />
        <MetricCell label="Projected ROI" value={roiLabel} color={colors.amber} isDark={isDark} />
        <MetricCell label="Estimated Break-even" value={breakEvenLabel} color={colors.blue} isDark={isDark} />
      </div>
    </section>
  );
}
