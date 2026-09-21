'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface Approval {
  approvalId: string;
  resourceId: string;
  resourceType: string;
  title: string;
  priority: string;
  approvers: string[];
  createdAt: string;
}

interface PendingApprovalsData {
  total: number;
  approvals: Approval[];
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  oldestPending: Approval | null;
}

export default function ApprovalPendingWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<PendingApprovalsData>();

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getResourceIcon = (resourceType: string) => {
    const icons: Record<string, string> = {
      email: '📧',
      task: '✓',
      meeting: '📅',
      approval: '👤',
    };
    return icons[resourceType] || '📋';
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return 'less than 1h ago';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const approvals = data.approvals ?? [];

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      color: textColor,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <h1 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 'bold' }}>
        Pending Approvals
      </h1>

      {/* Priority Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <div style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
            {data.byPriority?.critical ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: mutedColor }}>Critical</div>
        </div>
        <div style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ea580c' }}>
            {data.byPriority?.high ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: mutedColor }}>High</div>
        </div>
        <div style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>
            {data.byPriority?.medium ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: mutedColor }}>Medium</div>
        </div>
        <div style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
            {data.byPriority?.low ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: mutedColor }}>Low</div>
        </div>
      </div>

      {/* Oldest Pending */}
      {data.oldestPending && (
        <div style={{
          background: cardBg,
          border: `2px solid ${getPriorityColor(data.oldestPending.priority)}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '8px', textTransform: 'uppercase' }}>
            ⏰ Oldest Pending
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
            {data.oldestPending.title}
          </div>
          <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '8px' }}>
            Waiting for {data.oldestPending.approvers.length} approver(s)
          </div>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              background: getPriorityColor(data.oldestPending.priority),
              color: '#ffffff',
              textTransform: 'uppercase',
            }}
          >
            {data.oldestPending.priority}
          </div>
        </div>
      )}

      {/* Approvals List */}
      <div style={{
        background: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '16px',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>
          All Pending ({data.total ?? 0})
        </h2>

        {approvals && approvals.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {approvals.map((approval) => (
              <div
                key={approval.approvalId}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px',
                  background: isDark ? '#1a1a1a' : '#ffffff',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  borderLeft: `4px solid ${getPriorityColor(approval.priority)}`,
                }}
              >
                <div style={{ fontSize: '18px', marginTop: '2px' }}>
                  {getResourceIcon(approval.resourceType)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>{approval.title}</div>
                  <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '4px' }}>
                    {approval.resourceType} • {approval.approvers.length} approver(s)
                  </div>
                  <div style={{ fontSize: '11px', color: mutedColor }}>
                    Requested {formatTime(approval.createdAt)}
                  </div>
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: getPriorityColor(approval.priority),
                    color: '#ffffff',
                    textTransform: 'uppercase',
                  }}
                >
                  {approval.priority}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: mutedColor, padding: '20px' }}>
            No pending approvals
          </div>
        )}
      </div>
    </div>
  );
}
