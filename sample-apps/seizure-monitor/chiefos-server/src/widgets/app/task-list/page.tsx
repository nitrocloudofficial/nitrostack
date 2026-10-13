'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  urgency: 'immediate' | 'soon' | 'later';
  estimatedEffort: 'small' | 'medium' | 'large';
}

interface TaskListData {
  total: number;
  triaged: Task[];
  topPriority: Task | null;
  criticalCount: number;
  highCount: number;
}

export default function TaskListWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<TaskListData>();

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

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'immediate':
        return '🔴';
      case 'soon':
        return '🟡';
      case 'later':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const getEffortIcon = (effort: string) => {
    switch (effort) {
      case 'small':
        return '⚡';
      case 'medium':
        return '⚙️';
      case 'large':
        return '🏗️';
      default:
        return '📋';
    }
  };

  const tasks = data.triaged ?? [];

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      color: textColor,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <h1 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 'bold' }}>
        Task Triage
      </h1>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
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
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>
            {data.criticalCount ?? 0}
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
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ea580c' }}>
            {data.highCount ?? 0}
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
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
            {data.total ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: mutedColor }}>Total</div>
        </div>
      </div>

      {/* Top Priority Task */}
      {data.topPriority && (
        <div style={{
          background: cardBg,
          border: `2px solid ${getPriorityColor(data.topPriority.priority)}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '8px', textTransform: 'uppercase' }}>
            🎯 Top Priority
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
            {data.topPriority.title}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-block',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                background: getPriorityColor(data.topPriority.priority),
                color: '#ffffff',
                textTransform: 'uppercase',
              }}
            >
              {data.topPriority.priority}
            </div>
            <div style={{ fontSize: '14px' }}>{getUrgencyIcon(data.topPriority.urgency)}</div>
            <div style={{ fontSize: '14px' }}>{getEffortIcon(data.topPriority.estimatedEffort)}</div>
          </div>
        </div>
      )}

      {/* Task List */}
      <div style={{
        background: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '16px',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>
          All Tasks
        </h2>

        {tasks && tasks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: isDark ? '#1a1a1a' : '#ffffff',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                }}
              >
                <div style={{ fontSize: '16px' }}>{getUrgencyIcon(task.urgency)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>{task.title}</div>
                  <div style={{ fontSize: '12px', color: mutedColor }}>
                    {task.priority} • {task.estimatedEffort} effort
                  </div>
                </div>
                <div style={{ fontSize: '14px' }}>{getEffortIcon(task.estimatedEffort)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: mutedColor, padding: '20px' }}>
            No tasks to display
          </div>
        )}
      </div>
    </div>
  );
}
