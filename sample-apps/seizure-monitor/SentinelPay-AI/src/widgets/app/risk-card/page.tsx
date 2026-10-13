'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { RiskCard } from '../../RiskCard';
import type { RiskCardProps } from '../../RiskCard/types';

/**
 * Widget page for the `calculateRisk` tool.
 * Reads the tool's structured output via the Widget SDK and hands it
 * straight to the existing presentational <RiskCard /> component —
 * no business logic lives here.
 */
export default function RiskCardPage() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<RiskCardProps>();

  if (!data) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          color: theme === 'dark' ? '#fff' : '#000',
        }}
      >
        Loading risk assessment…
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <RiskCard
        caseId={data.caseId}
        riskScore={data.riskScore}
        riskLevel={data.riskLevel}
        factors={data.factors}
      />
    </div>
  );
}
