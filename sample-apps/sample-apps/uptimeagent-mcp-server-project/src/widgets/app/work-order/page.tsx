'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

type Severity = 'none' | 'low' | 'moderate' | 'high';
type Urgency = 'routine' | 'medium' | 'high' | 'critical';

interface SensorTrigger {
  sensor: string;
  unit: string;
  currentValue: number;
  baselineMean: number;
  severity: Severity;
}

interface WorkOrder {
  ticketId: string;
  machineId: string;
  machineName: string;
  generatedAt: string;
  urgencyLevel: Urgency;
  issueDescription: string;
  recommendedActions: string[];
  estimatedRemainingLife: {
    cycles: number | null;
    days: number | null;
    confidence: 'low' | 'medium' | 'high' | null;
  };
  analysis?: {
    triggeredSensors: SensorTrigger[];
  };
}

const URGENCY_COLORS: Record<Urgency, { bg: string; fg: string }> = {
  critical: { bg: '#7f1d1d', fg: '#fecaca' },
  high: { bg: '#7c2d12', fg: '#fed7aa' },
  medium: { bg: '#78350f', fg: '#fde68a' },
  routine: { bg: '#14532d', fg: '#bbf7d0' }
};

const SEVERITY_COLORS: Record<Severity, string> = {
  high: '#f87171',
  moderate: '#fb923c',
  low: '#facc15',
  none: '#4ade80'
};

export default function WorkOrderPage() {
  const { isReady, getToolOutput, theme } = useWidgetSDK();
  const data = getToolOutput<WorkOrder>();

  if (!isReady || !data) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#9ca3af' }}>
        Loading work order...
      </div>
    );
  }

  const isDark = theme !== 'light';
  const cardBg = isDark ? '#18181b' : '#ffffff';
  const textColor = isDark ? '#e5e7eb' : '#1f2937';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';
  const borderColor = isDark ? '#27272a' : '#e5e7eb';
  const urgency = URGENCY_COLORS[data.urgencyLevel];

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        background: cardBg,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: 20,
        maxWidth: 480
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: mutedColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Work Order &middot; {data.ticketId}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
            {data.machineName} <span style={{ color: mutedColor, fontWeight: 400 }}>({data.machineId})</span>
          </div>
        </div>
        <span
          style={{
            background: urgency.bg,
            color: urgency.fg,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '4px 10px',
            borderRadius: 999,
            whiteSpace: 'nowrap'
          }}
        >
          {data.urgencyLevel}
        </span>
      </div>

      <p style={{ fontSize: 14, lineHeight: 1.5, marginTop: 14 }}>{data.issueDescription}</p>

      {data.analysis && data.analysis.triggeredSensors.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: mutedColor, marginBottom: 6 }}>TRIGGERED SENSORS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.analysis.triggeredSensors.map(t => (
              <div key={t.sensor} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: SEVERITY_COLORS[t.severity] }} />
                  {t.sensor}
                </span>
                <span style={{ color: mutedColor }}>
                  {t.currentValue} {t.unit} (baseline {t.baselineMean})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: mutedColor, marginBottom: 6 }}>RECOMMENDED ACTIONS</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
          {data.recommendedActions.map((action, i) => (
            <li key={i}>{action}</li>
          ))}
        </ul>
      </div>

      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: `1px solid ${borderColor}`,
          fontSize: 12,
          color: mutedColor,
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <span>
          {data.estimatedRemainingLife.days !== null
            ? `Est. remaining life: ~${data.estimatedRemainingLife.days} days (${data.estimatedRemainingLife.confidence} confidence)`
            : 'Est. remaining life: not yet projectable'}
        </span>
        <span>{new Date(data.generatedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}
