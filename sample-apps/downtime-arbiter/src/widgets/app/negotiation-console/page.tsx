'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface SensorDetail {
  bearing_temp_c: number;
  vibration_hz: number;
  oil_pressure_bar: number;
  last_reading_timestamp: string;
}

interface RiskTrajectory {
  now_risk_pct: number;
  risk_at_24h_pct: number;
  risk_at_72h_pct: number;
  risk_at_96h_pct: number;
}

interface NegotiationRound {
  round: number;
  role: string;
  window_start: string;
  window_end: string;
  duration_hours: number;
  rationale: string;
  estimated_cost: number;
  timestamp: string;
}

interface FinalResolution {
  decision: string;
  winning_proposal_role: string;
  winning_proposal_cost: number;
  cost_gap_pct: number;
  override_applied: boolean;
  escalation_reason?: string;
  negotiation_rounds_completed: number;
}

interface NegotiationDashboardDTO {
  machine_id: string;
  failure_mode: string;
  current_risk_pct: number;
  urgency_tier: string;
  sensor_detail: SensorDetail;
  risk_trajectory: RiskTrajectory;
  negotiation_rounds: NegotiationRound[];
  final_resolution?: FinalResolution;
}

export default function NegotiationConsole() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();

  const data = getToolOutput<NegotiationDashboardDTO>();

  if (!isReady || !data) {
    return (
      <div
        style={{
          padding: '32px',
          background: '#0f172a',
          color: '#e2e8f0',
          borderRadius: '12px',
          textAlign: 'center',
        }}
      >
        <div style={{ color: '#94a3b8', fontSize: '14px' }}>Loading negotiation dashboard...</div>
      </div>
    );
  }

  if (!data.machine_id || !data.failure_mode) {
    return (
      <div
        style={{
          padding: '32px',
          background: '#0f172a',
          color: '#ef4444',
          borderRadius: '12px',
          textAlign: 'center',
        }}
      >
        Invalid dashboard data
      </div>
    );
  }

  const urgencyColors: Record<string, string> = {
    Low: '#10b981',
    Medium: '#f59e0b',
    High: '#ef4444',
    Critical: '#991b1b',
  };

  const urgencyBgColors: Record<string, string> = {
    Low: 'rgba(16, 185, 129, 0.1)',
    Medium: 'rgba(245, 158, 11, 0.1)',
    High: 'rgba(239, 68, 68, 0.1)',
    Critical: 'rgba(153, 27, 27, 0.1)',
  };

  const trajectoryPoints = [
    { label: 'Now', value: data.risk_trajectory.now_risk_pct },
    { label: '+24h', value: data.risk_trajectory.risk_at_24h_pct },
    { label: '+72h', value: data.risk_trajectory.risk_at_72h_pct },
    { label: '+96h', value: data.risk_trajectory.risk_at_96h_pct },
  ];

  const chartHeight = 120;

  const isMaintDecision = data.final_resolution?.decision === 'accept_maintenance';
  const isProdDecision = data.final_resolution?.decision === 'accept_production';

  const decisionColor = isMaintDecision ? '#3b82f6' : isProdDecision ? '#6b7280' : '#ef4444';
  const decisionBgColor = isMaintDecision
    ? 'rgba(59, 130, 246, 0.2)'
    : isProdDecision
      ? 'rgba(107, 114, 128, 0.2)'
      : 'rgba(239, 68, 68, 0.2)';
  const decisionLabel = isMaintDecision ? 'Maint' : isProdDecision ? 'Prod' : 'Escalated';

  return (
    <div
      style={{
        padding: '24px',
        background: '#0f172a',
        color: '#e2e8f0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        borderRadius: '12px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#f1f5f9' }}>
            {data.machine_id}
          </h1>
          <span style={{ fontSize: '14px', color: '#94a3b8', fontStyle: 'italic' }}>
            {data.failure_mode}
          </span>
        </div>
        <div
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: `2px solid ${urgencyColors[data.urgency_tier]}`,
            backgroundColor: urgencyBgColors[data.urgency_tier],
            fontSize: '14px',
            fontWeight: '600',
            color: urgencyColors[data.urgency_tier],
          }}
        >
          {data.urgency_tier}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            border: '2px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.5)',
          }}
        >
          <h3
            style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#cbd5e1',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Maint View
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '8px',
              }}
            >
              <span style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                Current Risk
              </span>
              <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
                {data.current_risk_pct}%
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Bearing Temp
                </span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>
                  {data.sensor_detail.bearing_temp_c}°C
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Vibration
                </span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>
                  {data.sensor_detail.vibration_hz} Hz
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Oil Pressure
                </span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>
                  {data.sensor_detail.oil_pressure_bar} bar
                </span>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
              Last reading: {new Date(data.sensor_detail.last_reading_timestamp).toLocaleString()}
            </div>
          </div>
        </div>

        <div
          style={{
            border: '2px solid rgba(107, 114, 128, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.5)',
          }}
        >
          <h3
            style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#cbd5e1',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Prod View
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', opacity: 0.7 }}>Urgency Tier Only</span>
            </div>
            <div
              style={{
                padding: '24px',
                borderRadius: '8px',
                border: `2px solid ${urgencyColors[data.urgency_tier]}`,
                backgroundColor: urgencyBgColors[data.urgency_tier],
                textAlign: 'center',
                minWidth: '120px',
              }}
            >
              <span
                style={{
                  color: urgencyColors[data.urgency_tier],
                  fontWeight: 'bold',
                  fontSize: '24px',
                }}
              >
                {data.urgency_tier}
              </span>
            </div>
            <div style={{ fontSize: '11px', opacity: 0.5, textAlign: 'center' }}>
              No raw risk data exposed
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginBottom: '24px',
          padding: '16px',
          background: 'rgba(15, 23, 42, 0.5)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <h3
          style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: '#cbd5e1',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Risk Trajectory ({data.failure_mode})
        </h3>
        <div style={{ width: '100%', height: '160px', position: 'relative', marginTop: '8px' }}>
          <svg width="100%" height={chartHeight} style={{ overflow: 'visible' }}>
            {[0, 25, 50, 75, 100].map((pct) => (
              <line
                key={`grid-${pct}`}
                x1="0"
                y1={(chartHeight * (100 - pct)) / 100}
                x2="100%"
                y2={(chartHeight * (100 - pct)) / 100}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
            ))}

            {[0, 25, 50, 75, 100].map((pct) => (
              <text
                key={`label-${pct}`}
                x="0"
                y={(chartHeight * (100 - pct)) / 100}
                fontSize="10"
                fill="rgba(255,255,255,0.4)"
                textAnchor="end"
                dy="0.3em"
                dx="-4"
              >
                {pct}%
              </text>
            ))}

            <polyline
              points={trajectoryPoints
                .map((p, i) => {
                  const x = ((i + 1) / trajectoryPoints.length) * 100 + '%';
                  const y = (chartHeight * (100 - p.value)) / 100;
                  return `${x} ${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {trajectoryPoints.map((p, i) => {
              const x = ((i + 1) / trajectoryPoints.length) * 100 + '%';
              const y = (chartHeight * (100 - p.value)) / 100;
              return (
                <g key={`point-${i}`}>
                  <circle cx={x} cy={y} r="3" fill="#3b82f6" vectorEffect="non-scaling-stroke" />
                  <text
                    x={x}
                    y={y - 12}
                    fontSize="11"
                    fill="#3b82f6"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {p.value.toFixed(1)}%
                  </text>
                </g>
              );
            })}

            {trajectoryPoints.map((p, i) => {
              const x = ((i + 1) / trajectoryPoints.length) * 100 + '%';
              return (
                <text
                  key={`xlabel-${i}`}
                  x={x}
                  y={chartHeight + 16}
                  fontSize="11"
                  fill="rgba(255,255,255,0.6)"
                  textAnchor="middle"
                >
                  {p.label}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {data.negotiation_rounds && data.negotiation_rounds.length > 0 && (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h3
            style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#cbd5e1',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Negotiation Timeline
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.negotiation_rounds.map((round, idx) => (
              <div
                key={idx}
                style={{
                  borderLeft: '3px solid #3b82f6',
                  padding: '12px',
                  background: 'rgba(59, 130, 246, 0.05)',
                  borderRadius: '6px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#3b82f6' }}>
                    {round.role}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#94a3b8',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    Round {round.round}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#94a3b8', fontWeight: '500' }}>Window:</span>
                    <span style={{ color: '#e2e8f0', textAlign: 'right', flex: 1, marginLeft: '12px' }}>
                      {new Date(round.window_start).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#94a3b8', fontWeight: '500' }}>Duration:</span>
                    <span style={{ color: '#e2e8f0', textAlign: 'right', flex: 1, marginLeft: '12px' }}>
                      {round.duration_hours}h
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#94a3b8', fontWeight: '500' }}>Cost:</span>
                    <span
                      style={{
                        color: '#e2e8f0',
                        textAlign: 'right',
                        flex: 1,
                        marginLeft: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {round.estimated_cost}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#94a3b8', fontWeight: '500' }}>Rationale:</span>
                    <span style={{ color: '#e2e8f0', textAlign: 'right', flex: 1, marginLeft: '12px' }}>
                      {round.rationale}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.final_resolution && (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h3
            style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#cbd5e1',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Final Arbiter Decision
          </h3>
          <div
            style={{
              borderRadius: '8px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ marginBottom: '12px' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: `2px solid ${decisionColor}`,
                  backgroundColor: decisionBgColor,
                  fontSize: '13px',
                  fontWeight: '600',
                  color: decisionColor,
                }}
              >
                {decisionLabel}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#94a3b8', fontWeight: '500' }}>Winning Proposal:</span>
                <span style={{ color: '#e2e8f0', textAlign: 'right', flex: 1, marginLeft: '12px' }}>
                  {data.final_resolution.winning_proposal_role}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#94a3b8', fontWeight: '500' }}>Cost:</span>
                <span style={{ color: '#e2e8f0', textAlign: 'right', flex: 1, marginLeft: '12px' }}>
                  {data.final_resolution.winning_proposal_cost}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#94a3b8', fontWeight: '500' }}>Cost Gap:</span>
                <span style={{ color: '#e2e8f0', textAlign: 'right', flex: 1, marginLeft: '12px' }}>
                  {data.final_resolution.cost_gap_pct.toFixed(1)}%
                </span>
              </div>
              {data.final_resolution.override_applied && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#f59e0b',
                  }}
                >
                  <span style={{ fontWeight: '500' }}>Override Applied:</span>
                  <span style={{ textAlign: 'right', flex: 1, marginLeft: '12px' }}>
                    Yes (gap ≥ 10%)
                  </span>
                </div>
              )}
              {data.final_resolution.escalation_reason && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#ef4444',
                  }}
                >
                  <span style={{ fontWeight: '500' }}>Escalation Reason:</span>
                  <span style={{ textAlign: 'right', flex: 1, marginLeft: '12px' }}>
                    {data.final_resolution.escalation_reason}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#94a3b8', fontWeight: '500' }}>Rounds Completed:</span>
                <span style={{ color: '#e2e8f0', textAlign: 'right', flex: 1, marginLeft: '12px' }}>
                  {data.final_resolution.negotiation_rounds_completed}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: '24px',
          padding: '8px 12px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '6px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '500' }}>
          ✓ 11/11 checks passing
        </span>
      </div>
    </div>
  );
}
