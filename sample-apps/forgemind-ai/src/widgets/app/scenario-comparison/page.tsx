'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface SimulateScenarioOutput {
  failureProbabilityNow: number;
  failureProbabilityIfDelayed: number;
  expectedDowntimeNowHours: number;
  expectedDowntimeIfDelayedHours: number;
  estimatedProductionLossUnits: number;
  recommendation: string;
}

export default function ScenarioComparison() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<SimulateScenarioOutput>();

  if (!isReady || !data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Loading scenario data...
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const borderColor = isDark ? '#333' : '#e5e7eb';
  const textColor = isDark ? '#ffffff' : '#000000';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';

  // Safe defaults
  const failureProbabilityNow = data?.failureProbabilityNow ?? 0;
  const failureProbabilityIfDelayed = data?.failureProbabilityIfDelayed ?? 0;
  const expectedDowntimeNowHours = data?.expectedDowntimeNowHours ?? 0;
  const expectedDowntimeIfDelayedHours = data?.expectedDowntimeIfDelayedHours ?? 0;
  const estimatedProductionLossUnits = data?.estimatedProductionLossUnits ?? 0;
  const recommendation = data?.recommendation ?? '';

  // Calculate deltas
  const failureProbabilityDelta = failureProbabilityIfDelayed - failureProbabilityNow;
  const downtimeDelta = expectedDowntimeIfDelayedHours - expectedDowntimeNowHours;

  // Determine risk indicators
  const getRiskColor = (probability: number) => {
    if (probability >= 75) return '#ef4444'; // Critical red
    if (probability >= 50) return '#f59e0b'; // Warning orange
    if (probability >= 25) return '#eab308'; // Caution yellow
    return '#10b981'; // Safe green
  };

  const getRiskIcon = (probability: number) => {
    if (probability >= 75) return '✕';
    if (probability >= 50) return '⚠';
    if (probability >= 25) return '◐';
    return '✓';
  };

  const getDeltaColor = (delta: number) => {
    if (delta > 20) return '#ef4444'; // Bad
    if (delta > 10) return '#f59e0b'; // Moderate
    if (delta > 0) return '#eab308'; // Slight increase
    return '#10b981'; // Improvement
  };

  const getDeltaIcon = (delta: number) => {
    if (delta > 0) return '↑';
    if (delta < 0) return '↓';
    return '→';
  };

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      color: textColor,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '24px',
        borderBottom: `1px solid ${borderColor}`,
        paddingBottom: '16px',
      }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold' }}>
          📊 Scenario Comparison
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: mutedColor }}>
          Maintenance delay impact analysis
        </p>
      </div>

      {/* Recommendation Banner */}
      {recommendation && (
        <div style={{
          padding: '16px',
          background: isDark ? '#1e3a1f' : '#ecfdf5',
          border: `1px solid #10b981`,
          borderRadius: '8px',
          marginBottom: '24px',
          color: '#10b981',
          fontSize: '14px',
          lineHeight: '1.5',
        }}>
          <strong>💡 Recommendation:</strong> {recommendation}
        </div>
      )}

      {/* Two-Column Comparison */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        {/* NOW Scenario */}
        <div style={{
          padding: '16px',
          background: isDark ? '#2d2d2d' : '#f9fafb',
          borderRadius: '8px',
          border: `2px solid #10b981`,
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>
            ✓ Maintain Now
          </h3>

          {/* Failure Probability */}
          <div style={{
            padding: '12px',
            background: isDark ? '#1a1a1a' : '#ffffff',
            borderRadius: '6px',
            marginBottom: '12px',
            border: `1px solid ${borderColor}`,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '12px', color: mutedColor }}>
                Failure Probability
              </span>
              <span style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: getRiskColor(failureProbabilityNow),
              }}>
                {failureProbabilityNow}%
              </span>
            </div>
            <div style={{
              height: '4px',
              background: isDark ? '#333' : '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${failureProbabilityNow}%`,
                background: getRiskColor(failureProbabilityNow),
              }} />
            </div>
          </div>

          {/* Downtime */}
          <div style={{
            padding: '12px',
            background: isDark ? '#1a1a1a' : '#ffffff',
            borderRadius: '6px',
            marginBottom: '12px',
            border: `1px solid ${borderColor}`,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '12px', color: mutedColor }}>
                Expected Downtime
              </span>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {expectedDowntimeNowHours.toFixed(1)}h
              </span>
            </div>
          </div>

          {/* Production Loss */}
          <div style={{
            padding: '12px',
            background: isDark ? '#1a1a1a' : '#ffffff',
            borderRadius: '6px',
            border: `1px solid ${borderColor}`,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '12px', color: mutedColor }}>
                Production Loss
              </span>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {estimatedProductionLossUnits} units
              </span>
            </div>
          </div>
        </div>

        {/* DELAYED Scenario */}
        <div style={{
          padding: '16px',
          background: isDark ? '#2d2d2d' : '#f9fafb',
          borderRadius: '8px',
          border: `2px solid ${getRiskColor(failureProbabilityIfDelayed)}`,
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>
            ⏱ If Delayed
          </h3>

          {/* Failure Probability */}
          <div style={{
            padding: '12px',
            background: isDark ? '#1a1a1a' : '#ffffff',
            borderRadius: '6px',
            marginBottom: '12px',
            border: `1px solid ${borderColor}`,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '12px', color: mutedColor }}>
                Failure Probability
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: getRiskColor(failureProbabilityIfDelayed),
                }}>
                  {failureProbabilityIfDelayed}%
                </span>
                <span style={{
                  fontSize: '16px',
                  color: getDeltaColor(failureProbabilityDelta),
                  fontWeight: 'bold',
                }}>
                  {getDeltaIcon(failureProbabilityDelta)} {Math.abs(failureProbabilityDelta)}%
                </span>
              </div>
            </div>
            <div style={{
              height: '4px',
              background: isDark ? '#333' : '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${failureProbabilityIfDelayed}%`,
                background: getRiskColor(failureProbabilityIfDelayed),
              }} />
            </div>
          </div>

          {/* Downtime */}
          <div style={{
            padding: '12px',
            background: isDark ? '#1a1a1a' : '#ffffff',
            borderRadius: '6px',
            marginBottom: '12px',
            border: `1px solid ${borderColor}`,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '12px', color: mutedColor }}>
                Expected Downtime
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {expectedDowntimeIfDelayedHours.toFixed(1)}h
                </span>
                <span style={{
                  fontSize: '14px',
                  color: getDeltaColor(downtimeDelta),
                  fontWeight: 'bold',
                }}>
                  {getDeltaIcon(downtimeDelta)} {Math.abs(downtimeDelta).toFixed(1)}h
                </span>
              </div>
            </div>
          </div>

          {/* Production Loss */}
          <div style={{
            padding: '12px',
            background: isDark ? '#1a1a1a' : '#ffffff',
            borderRadius: '6px',
            border: `1px solid ${borderColor}`,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '12px', color: mutedColor }}>
                Production Loss
              </span>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {estimatedProductionLossUnits} units
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Summary */}
      <div style={{
        padding: '16px',
        background: isDark ? '#2d2d2d' : '#f3f4f6',
        borderRadius: '8px',
        border: `1px solid ${borderColor}`,
        marginBottom: '24px',
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>
          📈 Risk Impact Summary
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
        }}>
          <div>
            <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '4px' }}>
              Failure Risk Increase
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: getDeltaColor(failureProbabilityDelta),
            }}>
              {getDeltaIcon(failureProbabilityDelta)} {Math.abs(failureProbabilityDelta)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '4px' }}>
              Downtime Increase
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: getDeltaColor(downtimeDelta),
            }}>
              {getDeltaIcon(downtimeDelta)} {Math.abs(downtimeDelta).toFixed(1)}h
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '4px' }}>
              Production Loss
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#ef4444',
            }}>
              {estimatedProductionLossUnits} units
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        fontSize: '12px',
        color: mutedColor,
        textAlign: 'center',
        borderTop: `1px solid ${borderColor}`,
        paddingTop: '16px',
      }}>
        FactoryCopilot MCP Server • Scenario Analysis
      </div>
    </div>
  );
}
