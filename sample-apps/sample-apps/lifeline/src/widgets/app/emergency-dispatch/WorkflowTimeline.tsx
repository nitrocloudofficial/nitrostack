'use client';

type StageStatus = 'done' | 'active' | 'pending' | 'error';

interface Stage {
  label: string;
  status: StageStatus;
  note?: string;
}

interface WorkflowTimelineProps {
  routeStatus: 'idle' | 'loading' | 'done' | 'error';
  reservationStatus: 'idle' | 'pending' | 'done' | 'error';
  isDark: boolean;
}

const STATUS_ICON: Record<StageStatus, string> = { done: '✓', active: '◐', pending: '○', error: '✕' };
const STATUS_COLOR: Record<StageStatus, string> = { done: '#16a34a', active: '#2563eb', pending: '#94a3b8', error: '#dc2626' };

/**
 * By the time this widget exists, rank_hospitals has already run — so the
 * first several stages are inferred complete from the data we already have
 * (a ranked hospital list implies triage, search, and ranking happened),
 * not independently timed. Only route calculation and reservation are
 * stages this widget actually drives live. That distinction is intentional,
 * not hidden — MCP gives a widget no visibility into upstream tool timing.
 */
export default function WorkflowTimeline({ routeStatus, reservationStatus, isDark }: WorkflowTimelineProps) {
  const stages: Stage[] = [
    { label: 'Symptoms Analysed', status: 'done' },
    { label: 'Severity Classified', status: 'done' },
    { label: 'Nearby Hospitals Found', status: 'done' },
    { label: 'Capabilities Checked', status: 'done', note: 'from hospital data' },
    { label: 'Resource Availability Verified', status: 'done', note: 'live bed counts' },
    {
      label: 'Route Calculated',
      status: routeStatus === 'loading' ? 'active' : routeStatus === 'error' ? 'error' : routeStatus === 'done' ? 'done' : 'pending',
    },
    { label: 'Hospital Ranking Complete', status: 'done' },
    {
      label: 'Reservation Requested',
      status: reservationStatus === 'pending' ? 'active' : reservationStatus === 'idle' ? 'pending' : 'done',
    },
    {
      label: 'Reservation Confirmed',
      status: reservationStatus === 'done' ? 'done' : reservationStatus === 'error' ? 'error' : 'pending',
    },
  ];

  const mutedColor = isDark ? 'rgba(241,245,249,0.55)' : 'rgba(15,23,42,0.5)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';

  return (
    <div style={{ margin: '10px 16px 0', overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 6, minWidth: 'max-content', paddingBottom: 2 }}>
        {stages.map((stage) => (
          <div
            key={stage.label}
            title={stage.note}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 10.5,
              fontWeight: 700,
              color: stage.status === 'pending' ? mutedColor : textColor,
              background: `${STATUS_COLOR[stage.status]}14`,
              border: `1px solid ${STATUS_COLOR[stage.status]}40`,
              borderRadius: 999,
              padding: '4px 9px',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: STATUS_COLOR[stage.status] }}>{STATUS_ICON[stage.status]}</span>
            {stage.label}
          </div>
        ))}
      </div>
    </div>
  );
}
