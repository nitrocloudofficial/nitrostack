'use client';

import React from 'react';
import {
  colors,
  fadeKeyframes,
  font,
  radii,
  sectionTitle,
  space,
  surface,
} from './ui';

interface IdentifiedRisk {
  hazard?: string;
  probability?: string;
  impact?: string;
  mitigation?: string;
}

interface RiskMatrixProps {
  identifiedRisks: IdentifiedRisk[] | string[];
  mitigations: string[];
  riskScore: number;
  overallRiskLevel?: string | null;
  isDark: boolean;
}

function normalizeRisks(
  identifiedRisks: IdentifiedRisk[] | string[],
  mitigations: string[]
): Array<{ hazard: string; probability: string; impact: string; mitigation: string; severity: string }> {
  if (!Array.isArray(identifiedRisks) || identifiedRisks.length === 0) {
    return [];
  }

  return identifiedRisks.map((risk, idx) => {
    if (typeof risk === 'string') {
      const probability = idx === 0 ? 'MEDIUM' : idx === 1 ? 'HIGH' : 'LOW';
      const impact = idx === 0 ? 'HIGH' : 'MEDIUM';
      return {
        hazard: risk,
        probability,
        impact,
        mitigation: mitigations[idx] || 'Monitor metrics closely',
        severity: probability === 'HIGH' || impact === 'HIGH' ? 'HIGH' : probability === 'MEDIUM' ? 'MED' : 'LOW',
      };
    }

    const probability = String(risk.probability || 'MEDIUM').toUpperCase();
    const impact = String(risk.impact || 'MEDIUM').toUpperCase();
    const severity =
      probability === 'HIGH' || impact === 'HIGH'
        ? 'HIGH'
        : probability === 'MEDIUM' || impact === 'MEDIUM'
          ? 'MED'
          : 'LOW';

    return {
      hazard: risk.hazard || `Risk ${idx + 1}`,
      probability,
      impact,
      mitigation: risk.mitigation || mitigations[idx] || 'Monitor metrics closely',
      severity,
    };
  });
}

function severityColor(severity: string) {
  if (severity === 'HIGH') return colors.red;
  if (severity === 'MED') return colors.amber;
  return colors.blue;
}

export function RiskMatrix({
  identifiedRisks,
  mitigations,
  riskScore,
  overallRiskLevel,
  isDark,
}: RiskMatrixProps) {
  const risksList = normalizeRisks(identifiedRisks, mitigations);
  const safeScore = Number.isFinite(riskScore) ? riskScore : 0;
  const scoreBg = safeScore > 70 ? colors.redDark : safeScore > 40 ? colors.amberDark : colors.green;

  return (
    <section aria-label="Risk matrix" style={surface(isDark)}>
      <style>{fadeKeyframes}</style>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: space.lg,
          gap: space.md,
          flexWrap: 'wrap',
        }}
      >
        <h3 style={{ ...sectionTitle(), margin: 0 }}>
          <span aria-hidden="true">🛡️</span> Risk Matrix & Mitigation Plan
        </h3>
        <div style={{ display: 'flex', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' }}>
          {overallRiskLevel ? (
            <span
              style={{
                background: isDark ? colors.slate600 : '#e2e8f0',
                color: isDark ? colors.slate50 : colors.slate800,
                padding: '4px 10px',
                borderRadius: radii.md,
                fontSize: font.label,
                fontWeight: 700,
              }}
            >
              {overallRiskLevel} RISK
            </span>
          ) : null}
          <span
            aria-label={`Risk score ${safeScore} out of 100`}
            style={{
              background: scoreBg,
              color: colors.white,
              padding: '4px 10px',
              borderRadius: radii.md,
              fontSize: font.label,
              fontWeight: 700,
            }}
          >
            Risk Score: {safeScore}/100
          </span>
        </div>
      </div>

      {risksList.length === 0 ? (
        <p style={{ margin: 0, fontSize: font.small, opacity: 0.75 }}>
          No identified risks in the current DecisionReport.
        </p>
      ) : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: font.small,
              minWidth: 560,
            }}
          >
            <caption style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              Identified risks and mitigations
            </caption>
            <thead>
              <tr
                style={{
                  borderBottom: isDark ? `2px solid ${colors.slate600}` : '2px solid #e2e8f0',
                  textAlign: 'left',
                }}
              >
                <th scope="col" style={{ padding: space.sm, fontWeight: 700 }}>Risk Factor</th>
                <th scope="col" style={{ padding: space.sm, fontWeight: 700 }}>Probability</th>
                <th scope="col" style={{ padding: space.sm, fontWeight: 700 }}>Impact</th>
                <th scope="col" style={{ padding: space.sm, fontWeight: 700 }}>Severity</th>
                <th scope="col" style={{ padding: space.sm, fontWeight: 700 }}>Mitigation Strategy</th>
              </tr>
            </thead>
            <tbody>
              {risksList.map((risk, idx) => (
                <tr
                  key={`${risk.hazard}-${idx}`}
                  style={{
                    borderBottom: isDark
                      ? '1px solid rgba(255,255,255,0.05)'
                      : '1px solid rgba(0,0,0,0.05)',
                  }}
                >
                  <td style={{ padding: '10px 8px', fontWeight: 600, verticalAlign: 'top' }}>{risk.hazard}</td>
                  <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>{risk.probability}</td>
                  <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>{risk.impact}</td>
                  <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>
                    <span
                      style={{
                        background: severityColor(risk.severity),
                        color: colors.white,
                        padding: '2px 8px',
                        borderRadius: radii.sm,
                        fontSize: font.tiny,
                        fontWeight: 700,
                      }}
                    >
                      {risk.severity}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', opacity: 0.9, verticalAlign: 'top' }}>{risk.mitigation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
