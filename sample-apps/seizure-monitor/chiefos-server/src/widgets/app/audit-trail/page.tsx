'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface AuditRecord {
  logId: string;
  type: string;
  action: string;
  actor: string;
  resourceId: string;
  resourceType: string;
  timestamp: string;
}

interface AuditTrailData {
  total: number;
  records: AuditRecord[];
  filters: {
    resourceId?: string;
    resourceType?: string;
    actor?: string;
  };
}

export default function AuditTrailWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<AuditTrailData>();

  if (!isReady || !data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Loading…
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const cardBg = isDark ? '#2d2d2d' : '#f9fafb';
  const textColor = isDark ? '#ffffff' : '#000000';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const borderColor = isDark ? '#404040' : '#e5e7eb';

  const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
      email_triaged: '📧',
      task_created: '✨',
      task_updated: '✏️',
      meeting_scheduled: '📅',
      meeting_rescheduled: '🔄',
      approval_requested: '👤',
      approval_granted: '✅',
    };
    return icons[action] || '📝';
  };

  const getActionColor = (action: string) => {
    if (action.includes('approval')) return '#8b5cf6';
    if (action.includes('email')) return '#3b82f6';
    if (action.includes('task')) return '#10b981';
    if (action.includes('meeting')) return '#f59e0b';
    return '#6b7280';
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const records = data.records ?? [];

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      color: textColor,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <h1 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 'bold' }}>
        Audit Trail
      </h1>

      {/* Summary */}
      <div style={{
        background: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
      }}>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
          Total Events: {data.total ?? 0}
        </div>
        {data.filters && (
          <div style={{ fontSize: '12px', color: mutedColor }}>
            {data.filters.resourceType && `Resource Type: ${data.filters.resourceType} • `}
            {data.filters.actor && `Actor: ${data.filters.actor}`}
          </div>
        )}
      </div>

      {/* Audit Records */}
      <div style={{
        background: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '16px',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>
          Recent Activity
        </h2>

        {records && records.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {records.map((record) => (
              <div
                key={record.logId}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px',
                  background: isDark ? '#1a1a1a' : '#ffffff',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  borderLeft: `4px solid ${getActionColor(record.action)}`,
                }}
              >
                <div style={{ fontSize: '18px', marginTop: '2px' }}>
                  {getActionIcon(record.action)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                    <span style={{ textTransform: 'capitalize' }}>
                      {record.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '4px' }}>
                    by {record.actor}
                  </div>
                  <div style={{ fontSize: '11px', color: mutedColor }}>
                    {record.resourceType}: {record.resourceId}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: mutedColor,
                    whiteSpace: 'nowrap',
                    textAlign: 'right',
                  }}
                >
                  {formatTime(record.timestamp)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: mutedColor, padding: '20px' }}>
            No audit records found
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        fontSize: '12px',
        color: mutedColor,
        textAlign: 'center',
        paddingTop: '16px',
        borderTop: `1px solid ${borderColor}`,
        marginTop: '16px',
      }}>
        All actions are logged and tracked for compliance
      </div>
    </div>
  );
}
