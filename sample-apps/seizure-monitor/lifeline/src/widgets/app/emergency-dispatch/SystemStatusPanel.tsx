'use client';

type SimpleStatus = 'ok' | 'warn' | 'error' | 'idle';

const STATUS_COLOR: Record<SimpleStatus, string> = { ok: '#16a34a', warn: '#d97706', error: '#dc2626', idle: '#94a3b8' };
const STATUS_DOT: Record<SimpleStatus, string> = { ok: '🟢', warn: '🟡', error: '🔴', idle: '⚪' };

const MCP_TOOLS = [
  'triage_symptoms',
  'get_nearby_hospitals',
  'get_hospital_capabilities',
  'check_resource_availability',
  'calculate_route',
  'rank_hospitals',
  'request_emergency_reservation',
];

interface SystemStatusPanelProps {
  isConnected: boolean;
  mapStatus: SimpleStatus;
  routeStatus: SimpleStatus;
  reservationStatus: SimpleStatus;
  isDark: boolean;
}

function StatusChip({ label, status }: { label: string; status: SimpleStatus }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 10.5,
        fontWeight: 600,
        color: STATUS_COLOR[status],
        whiteSpace: 'nowrap',
      }}
    >
      <span>{STATUS_DOT[status]}</span>
      {label}
    </div>
  );
}

export default function SystemStatusPanel({ isConnected, mapStatus, routeStatus, reservationStatus, isDark }: SystemStatusPanelProps) {
  const mutedColor = isDark ? 'rgba(241,245,249,0.5)' : 'rgba(15,23,42,0.45)';
  const borderColor = isDark ? '#1e293b' : '#e2e8f0';
  const backendStatus: SimpleStatus = isConnected ? 'ok' : 'error';
  const overall: SimpleStatus =
    [mapStatus, routeStatus, reservationStatus, backendStatus].includes('error')
      ? 'error'
      : [mapStatus, routeStatus, reservationStatus].includes('warn')
        ? 'warn'
        : 'ok';

  return (
    <div
      style={{
        margin: '12px 16px 0',
        padding: '10px 14px',
        borderRadius: 10,
        border: `1px solid ${borderColor}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: mutedColor, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          ⚙️ System Status
        </span>
        <StatusChip label={overall === 'ok' ? 'All Systems Operational' : overall === 'warn' ? 'Degraded' : 'Issue Detected'} status={overall} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <StatusChip label="AI Reasoning" status={backendStatus} />
        <StatusChip label="MCP Server" status={backendStatus} />
        <StatusChip label="Widget" status={isConnected ? 'ok' : 'idle'} />
        <StatusChip label="Map" status={mapStatus} />
        <StatusChip label="Route" status={routeStatus} />
        <StatusChip label="Reservation" status={reservationStatus} />
        <StatusChip label="Backend" status={backendStatus} />
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: mutedColor }}>
        Connected tools: {MCP_TOOLS.join(' · ')}
      </div>
    </div>
  );
}
