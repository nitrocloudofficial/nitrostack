'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';


interface DashboardData {
  recentMeetings: Array<{
    id: string;
    title: string;
    date: string;
    attendees: string[];
  }>;
  pendingTasks: Array<{
    id: string;
    title: string;
    owner: string;
    deadline: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }>;
  completedTasks: Array<{
    id: string;
    title: string;
    owner: string;
    completedAt?: string;
  }>;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    owner: string;
    deadline: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    daysUntilDue: number;
  }>;
  stats: {
    totalMeetings: number;
    totalPendingTasks: number;
    totalCompletedTasks: number;
    upcomingDeadlineCount: number;
  };
}

export default function DashboardWidget() {
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
  const bgColor = isDark ? '#1f2937' : '#ffffff';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const textColor = isDark ? '#ffffff' : '#000000';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';
  const cardBg = isDark ? '#111827' : '#f9fafb';

  const stats = data.stats ?? {
    totalMeetings: 0,
    totalPendingTasks: 0,
    totalCompletedTasks: 0,
    upcomingDeadlineCount: 0
  };

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '12px',
      maxWidth: '1000px',
      boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '24px',
        borderBottom: `1px solid ${borderColor}`,
        paddingBottom: '16px',
      }}>
        <h1 style={{
          margin: '0 0 4px 0',
          fontSize: '24px',
          fontWeight: '700',
          color: textColor,
        }}>
          📊 Dashboard
        </h1>
        <p style={{
          margin: 0,
          fontSize: '13px',
          color: mutedColor,
        }}>
          Meeting & task overview
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        {/* Meetings Stat */}
        <div style={{
          padding: '16px',
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📋</div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#06b6d4',
            marginBottom: '4px',
          }}>
            {stats.totalMeetings}
          </div>
          <div style={{
            fontSize: '12px',
            color: mutedColor,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Meetings
          </div>
        </div>

        {/* Pending Tasks Stat */}
        <div style={{
          padding: '16px',
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#f59e0b',
            marginBottom: '4px',
          }}>
            {stats.totalPendingTasks}
          </div>
          <div style={{
            fontSize: '12px',
            color: mutedColor,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Pending Tasks
          </div>
        </div>

        {/* Completed Stat */}
        <div style={{
          padding: '16px',
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#10b981',
            marginBottom: '4px',
          }}>
            {stats.totalCompletedTasks}
          </div>
          <div style={{
            fontSize: '12px',
            color: mutedColor,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Completed
          </div>
        </div>

        {/* Upcoming Stat */}
        <div style={{
          padding: '16px',
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔔</div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#ef4444',
            marginBottom: '4px',
          }}>
            {stats.upcomingDeadlineCount}
          </div>
          <div style={{
            fontSize: '12px',
            color: mutedColor,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Upcoming
          </div>
        </div>
      </div>

      {/* Recent Meetings */}
      {(data.recentMeetings ?? []).length > 0 && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
        }}>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: textColor,
          }}>
            📅 Recent Meetings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(data.recentMeetings ?? []).slice(0, 3).map((meeting, idx) => (
              <div
                key={idx}
                title={`${meeting.title} — ${meeting.attendees?.length ?? 0} attendees`}
                style={{
                  padding: '8px',
                  background: isDark ? '#1f2937' : '#ffffff',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div style={{ fontWeight: '500', color: textColor }}>
                  {meeting.title}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: mutedColor,
                  marginTop: '4px',
                }}>
                  {new Date(meeting.date).toLocaleDateString()} • {meeting.attendees?.length ?? 0} attendees
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Deadlines */}
      {(data.upcomingDeadlines ?? []).length > 0 && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
        }}>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: textColor,
          }}>
            ⏰ Upcoming Deadlines
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(data.upcomingDeadlines ?? []).slice(0, 5).map((deadline, idx) => {
              const priorityColors: Record<string, string> = {
                critical: isDark ? '#fca5a5' : '#dc2626',
                high: isDark ? '#fdba74' : '#ea580c',
                medium: isDark ? '#facc15' : '#d97706',
                low: isDark ? '#86efac' : '#16a34a'
              };

              return (
                <div
                  key={idx}
                  style={{
                    padding: '8px',
                    background: isDark ? '#1f2937' : '#ffffff',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '500', color: textColor }}>
                      {deadline.title}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: mutedColor,
                      marginTop: '2px',
                    }}>
                      {deadline.owner} • {deadline.daysUntilDue} day{deadline.daysUntilDue !== 1 ? 's' : ''} left
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    background: priorityColors[deadline.priority],
                    color: isDark ? '#000' : '#fff',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    marginLeft: '8px',
                  }}>
                    {deadline.priority}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Tasks Summary */}
      {(data.pendingTasks ?? []).length > 0 && (
        <div style={{
          padding: '16px',
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
        }}>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: textColor,
          }}>
            📝 Pending Tasks
          </h3>
          <div style={{
            fontSize: '13px',
            color: mutedColor,
          }}>
            {(data.pendingTasks ?? []).length} task{(data.pendingTasks ?? []).length !== 1 ? 's' : ''} awaiting completion
          </div>
          <div style={{
            marginTop: '8px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
          }}>
            {(data.pendingTasks ?? []).slice(0, 5).map((task, idx) => (
              <span
                key={idx}
                title={`${task.title} — assigned to ${task.owner}`}
                style={{
                  padding: '4px 8px',
                  background: isDark ? '#1f2937' : '#ffffff',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: textColor,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
              >
                {task.title}...
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: `1px solid ${borderColor}`,
        fontSize: '12px',
        color: mutedColor,
        textAlign: 'center',
      }}>
        ✨ MeetingMind AI Dashboard
      </div>
    </div>
  );
}