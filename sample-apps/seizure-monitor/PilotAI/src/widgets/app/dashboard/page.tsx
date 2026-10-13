'use client';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

/**
 * Progress Dashboard Widget
 *
 * Renders the output of the `generate_project_plan` tool: overall
 * completion, completed vs pending task counts, milestones, and upcoming
 * deadlines.
 */

interface Task {
  id: string;
  title: string;
  assignee: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
}

interface Milestone {
  id: string;
  title: string;
  weekRange: string;
  tasks: Task[];
}

interface DashboardSummary {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionPercentage: number;
  upcomingDeadlines: { milestone: string; dueDate: string; taskCount: number }[];
}

interface ProjectPlanData {
  project_name: string;
  project_description: string;
  team_size: number;
  team_members: string[];
  duration_weeks: number;
  milestones: Milestone[];
  dashboard: DashboardSummary;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function DashboardWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ expandedMilestone: string | null }>(() => ({
    expandedMilestone: null
  }));

  const data = getToolOutput<ProjectPlanData>();

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
  const textColor = isDark ? '#ffffff' : '#111827';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  if (!data || !data.dashboard) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: textColor, background: bgColor }}>
        Loading project plan...
      </div>
    );
  }

  const { dashboard, milestones = [] } = data;
  const upcomingDeadlines = dashboard.upcomingDeadlines ?? [];
  const percentage = Math.max(0, Math.min(100, dashboard.completionPercentage ?? 0));

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
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>{data.project_name}</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: mutedColor }}>
          {data.team_size} team member{data.team_size === 1 ? '' : 's'} · {data.duration_weeks} week
          {data.duration_weeks === 1 ? '' : 's'}
        </p>
      </div>

      {/* Progress ring / bar */}
      <div
        style={{
          background: cardBg,
          borderRadius: '12px',
          padding: '18px',
          marginBottom: '16px',
          border: `1px solid ${borderColor}`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: mutedColor }}>Overall completion</span>
          <span style={{ fontSize: '22px', fontWeight: 700 }}>{percentage}%</span>
        </div>
        <div
          style={{
            height: '10px',
            borderRadius: '999px',
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
              transition: 'width 0.4s ease'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{dashboard.completedTasks}</div>
            <div style={{ fontSize: '11px', color: mutedColor }}>Completed</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>{dashboard.pendingTasks}</div>
            <div style={{ fontSize: '11px', color: mutedColor }}>Pending</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{dashboard.totalTasks}</div>
            <div style={{ fontSize: '11px', color: mutedColor }}>Total tasks</div>
          </div>
        </div>
      </div>

      {/* Upcoming deadlines */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em', color: mutedColor, margin: '0 0 8px 0' }}>
          Upcoming Deadlines
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {upcomingDeadlines.map((d) => (
            <div
              key={d.milestone}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px',
                padding: '8px 10px',
                borderRadius: '8px',
                background: cardBg
              }}
            >
              <span>{d.milestone}</span>
              <span style={{ color: mutedColor }}>
                {formatDate(d.dueDate)} · {d.taskCount} task{d.taskCount === 1 ? '' : 's'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div>
        <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em', color: mutedColor, margin: '0 0 8px 0' }}>
          Milestones
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {milestones.map((m) => {
            const expanded = state?.expandedMilestone === m.id;
            return (
              <div key={m.id} style={{ border: `1px solid ${borderColor}`, borderRadius: '10px', overflow: 'hidden' }}>
                <button
                  onClick={() => setState({ expandedMilestone: expanded ? null : m.id })}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: textColor,
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{m.title}</span>
                  <span style={{ color: mutedColor, fontSize: '12px' }}>
                    {m.weekRange} · {m.tasks.length} tasks {expanded ? '▲' : '▼'}
                  </span>
                </button>
                {expanded && (
                  <div style={{ padding: '0 12px 10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {m.tasks.map((t) => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: mutedColor }}>
                        <span>{t.title}</span>
                        <span>{t.assignee}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
