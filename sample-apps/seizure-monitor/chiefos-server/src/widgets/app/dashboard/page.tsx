'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface DashboardData {
  emailsTriaged: number;
  tasksPending: number;
  meetingsScheduled: number;
  approvalsNeeded: number;
  recentActions: Array<{
    id: string;
    action: string;
    timestamp: string;
    status: string;
  }>;
}

export default function Dashboard() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<DashboardData>();

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

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      color: textColor,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <h1 style={{ margin: '0 0 24px 0', fontSize: '28px', fontWeight: 'bold' }}>
        Chief of Staff Dashboard
      </h1>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {/* Emails Triaged */}
        <div style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📧</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px' }}>
            {data.emailsTriaged}
          </div>
          <div style={{ fontSize: '12px', color: mutedColor }}>Emails Triaged</div>
        </div>

        {/* Tasks Pending */}
        <div style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>✓</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}>
            {data.tasksPending}
          </div>
          <div style={{ fontSize: '12px', color: mutedColor }}>Tasks Pending</div>
        </div>

        {/* Meetings */}
        <div style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📅</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '4px' }}>
            {data.meetingsScheduled}
          </div>
          <div style={{ fontSize: '12px', color: mutedColor }}>Meetings</div>
        </div>

        {/* Approvals Needed */}
        <div style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>👤</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444', marginBottom: '4px' }}>
            {data.approvalsNeeded}
          </div>
          <div style={{ fontSize: '12px', color: mutedColor }}>Approvals Needed</div>
        </div>
      </div>

      {/* Recent Actions */}
      <div style={{
        background: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '20px',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>
          Recent Actions
        </h2>

        {data.recentActions && data.recentActions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.recentActions.map((action) => (
              <div
                key={action.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: isDark ? '#1a1a1a' : '#ffffff',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>{action.action}</div>
                  <div style={{ fontSize: '12px', color: mutedColor }}>
                    {new Date(action.timestamp).toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: action.status === 'completed' ? '#d1fae5' : '#fef3c7',
                    color: action.status === 'completed' ? '#065f46' : '#92400e',
                  }}
                >
                  {action.status}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: mutedColor, padding: '20px' }}>
            No recent actions
          </div>
        )}
      </div>
    </div>
  );
}
