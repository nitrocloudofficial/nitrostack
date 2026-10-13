'use client';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

/**
 * Task List Widget
 *
 * Renders the output of the `generate_tasks` tool: an interactive,
 * filterable list of assigned tasks with status and priority.
 */

interface Task {
  id: string;
  title: string;
  requirement: string;
  assignee: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
}

interface TaskListData {
  project_name: string;
  team_members: string[];
  tasks: Task[];
  summary: {
    total: number;
    completed: number;
    pending: number;
    completionPercentage: number;
  };
  error?: string;
}

function isTaskListData(value: unknown): value is TaskListData {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as TaskListData).tasks) &&
    !!(value as TaskListData).summary &&
    typeof (value as TaskListData).summary === 'object'
  );
}

type Filter = 'all' | 'pending' | 'in_progress' | 'completed';

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981'
};

const STATUS_LABEL: Record<Task['status'], string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed'
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function TaskListWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ filter: Filter }>(() => ({ filter: 'all' }));

  const rawData = getToolOutput<unknown>();

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
  const textColor = isDark ? '#ffffff' : '#111827';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  // No response has arrived from the host yet — genuinely still loading.
  if (rawData == null) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: textColor, background: bgColor }}>
        Loading tasks...
      </div>
    );
  }

  // A response arrived but isn't the shape this widget expects (e.g. the
  // host handed back a plain error string because the tool call failed
  // before returning structuredContent). Show that explicitly instead of
  // rendering "Loading tasks..." forever.
  if (!isTaskListData(rawData)) {
    const message = typeof rawData === 'string' ? rawData : 'The tool response was missing the expected task data.';
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444', background: bgColor }}>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>Unable to load tasks</div>
        <div style={{ fontSize: '12px', color: mutedColor }}>{message}</div>
      </div>
    );
  }

  const data = rawData;
  const filter = state?.filter ?? 'all';
  const filteredTasks = data.tasks.filter((t) => filter === 'all' || t.status === filter);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${data.tasks.length})` },
    { key: 'pending', label: `Pending (${data.tasks.filter((t) => t.status === 'pending').length})` },
    { key: 'in_progress', label: `In Progress (${data.tasks.filter((t) => t.status === 'in_progress').length})` },
    { key: 'completed', label: `Completed (${data.tasks.filter((t) => t.status === 'completed').length})` }
  ];

  return (
    <div
      style={{
        padding: '24px',
        background: bgColor,
        color: textColor,
        borderRadius: '16px',
        maxWidth: '520px',
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        border: `1px solid ${borderColor}`
      }}
    >
      {data.error && (
        <div
          style={{
            marginBottom: '14px',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#ef4444',
            background: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)'
          }}
        >
          {data.error}
        </div>
      )}

      <div style={{ marginBottom: '14px' }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>{data.project_name}</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: mutedColor }}>
          {data.summary.completed}/{data.summary.total} tasks complete ({data.summary.completionPercentage}%)
        </p>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setState({ filter: f.key })}
            style={{
              padding: '6px 10px',
              borderRadius: '999px',
              border: `1px solid ${filter === f.key ? '#764ba2' : borderColor}`,
              background: filter === f.key ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)' : 'transparent',
              color: filter === f.key ? '#fff' : textColor,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredTasks.length === 0 && (
          <div style={{ fontSize: '13px', color: mutedColor, textAlign: 'center', padding: '16px 0' }}>
            No tasks in this filter.
          </div>
        )}
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: cardBg,
              border: `1px solid ${borderColor}`
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              {initials(task.assignee)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.title}
              </div>
              <div style={{ fontSize: '11px', color: mutedColor }}>
                {task.assignee} · {STATUS_LABEL[task.status]} · Due {formatDate(task.dueDate)}
              </div>
            </div>

            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: PRIORITY_COLOR[task.priority],
                border: `1px solid ${PRIORITY_COLOR[task.priority]}`,
                borderRadius: '6px',
                padding: '3px 6px',
                flexShrink: 0
              }}
            >
              {task.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
