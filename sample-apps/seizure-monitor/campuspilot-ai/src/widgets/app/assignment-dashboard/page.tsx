'use client';

import { useWidgetSDK, useWidgetState, useTheme } from '@nitrostack/widgets';

interface Assignment {
  id: string;
  subject: string;
  subjectCode: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  priority: string;
  type: string;
  faculty: string;
  daysUntilDue: number;
  urgency: string;
}

interface AssignmentData {
  student: { name: string; rollNumber: string; semester: string };
  totalAssignments: number;
  filterApplied: { status: string; subject: string };
  assignments: Assignment[];
  summary: {
    overdue: number;
    dueToday: number;
    dueSoon: number;
    thisWeek: number;
    upcoming: number;
  };
}

const URGENCY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  overdue:   { label: 'OVERDUE',    color: '#ff4757', bg: 'rgba(255,71,87,0.15)',   border: '#ff4757' },
  'due-today': { label: 'DUE TODAY', color: '#ff6b35', bg: 'rgba(255,107,53,0.15)', border: '#ff6b35' },
  'due-soon':  { label: 'DUE SOON',  color: '#ffa502', bg: 'rgba(255,165,2,0.15)',  border: '#ffa502' },
  'this-week': { label: 'THIS WEEK', color: '#eccc68', bg: 'rgba(236,204,104,0.12)', border: '#eccc68' },
  upcoming:  { label: 'UPCOMING',   color: '#2ed573', bg: 'rgba(46,213,115,0.12)',  border: '#2ed573' },
};

const PRIORITY_DOT: Record<string, string> = {
  high:   '#ff4757',
  medium: '#ffa502',
  low:    '#2ed573',
};

const TYPE_ICON: Record<string, string> = {
  diagram: '📐', coding: '💻', report: '📝', document: '📄', problems: '🔢', lab: '🧪',
};

const DEMO_DATA: AssignmentData = {
  student: { name: 'Alex Sharma', rollNumber: '22CS045', semester: '5th Semester' },
  totalAssignments: 5,
  filterApplied: { status: 'pending', subject: 'all' },
  assignments: [
    { id: 'A001', subject: 'Database Management Systems', subjectCode: 'CS501', title: 'ER Diagram for Hospital Management System', description: 'Design a complete ER diagram for a hospital management system including all entities, relationships, and cardinalities.', dueDate: '2026-07-26', status: 'pending', priority: 'high', type: 'diagram', faculty: 'Dr. Ramaiah', daysUntilDue: 1, urgency: 'due-soon' },
    { id: 'A002', subject: 'Operating Systems', subjectCode: 'CS502', title: 'Process Scheduling Algorithms', description: 'Implement FCFS, SJF, and Round Robin scheduling algorithms in Python with Gantt chart output.', dueDate: '2026-07-27', status: 'pending', priority: 'high', type: 'coding', faculty: 'Prof. Lakshmi', daysUntilDue: 2, urgency: 'due-soon' },
    { id: 'A003', subject: 'Computer Networks', subjectCode: 'CS503', title: 'TCP/IP Protocol Analysis Report', description: 'Analyze TCP/IP protocol stack layers using Wireshark. Include packet captures and analysis.', dueDate: '2026-07-30', status: 'pending', priority: 'medium', type: 'report', faculty: 'Dr. Suresh Kumar', daysUntilDue: 5, urgency: 'this-week' },
    { id: 'A004', subject: 'Software Engineering', subjectCode: 'CS504', title: 'Software Requirements Specification', description: 'Write a complete SRS document following IEEE 830 standard for a library management system.', dueDate: '2026-08-02', status: 'in-progress', priority: 'medium', type: 'document', faculty: 'Prof. Anitha', daysUntilDue: 8, urgency: 'upcoming' },
    { id: 'A005', subject: 'Theory of Computation', subjectCode: 'CS505', title: 'DFA and NFA Construction Problems', description: 'Construct DFA and NFA for 10 given regular expressions, convert NFA to DFA, and minimize DFAs.', dueDate: '2026-08-05', status: 'pending', priority: 'low', type: 'problems', faculty: 'Dr. Venkat', daysUntilDue: 11, urgency: 'upcoming' },
  ],
  summary: { overdue: 0, dueToday: 0, dueSoon: 2, thisWeek: 1, upcoming: 2 },
};

export default function AssignmentDashboard() {
  const theme = useTheme();
  const { getToolOutput, sendFollowUpMessage, requestFullscreen, requestInline, displayMode } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ selectedFilter: string; expandedId: string | null }>(() => ({
    selectedFilter: 'all',
    expandedId: null,
  }));

  // Falls back to demo data in browser preview; NitroStudio provides real MCP data
  const data = getToolOutput<AssignmentData>() ?? DEMO_DATA;
  const selectedFilter = state?.selectedFilter || 'all';

  const isDark = theme === 'dark';
  const bg = isDark ? '#0f0f1a' : '#f8f9ff';
  const card = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)';
  const text = isDark ? '#e8eaf6' : '#1a1a2e';
  const muted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(26,26,46,0.5)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)';

  const filters = ['all', 'overdue', 'due-today', 'due-soon', 'this-week'];
  const filtered = selectedFilter === 'all'
    ? data.assignments
    : data.assignments.filter(a => a.urgency === selectedFilter);

  return (
    <div style={{ background: bg, borderRadius: 20, overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif", color: text }}>
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: '20px 24px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(102,126,234,0.15)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(102,126,234,0.9)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>📋 ASSIGNMENT DASHBOARD</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{data.student.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
              {data.student.semester} · {data.student.rollNumber}
            </div>
          </div>
        </div>

        {/* Summary Badges */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {data.summary.overdue > 0 && (
            <span style={{ background: 'rgba(255,71,87,0.3)', color: '#ffcdd2', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              🔴 {data.summary.overdue} Overdue
            </span>
          )}
          {data.summary.dueToday > 0 && (
            <span style={{ background: 'rgba(255,107,53,0.3)', color: '#ffe0cc', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              🟠 {data.summary.dueToday} Due Today
            </span>
          )}
          {data.summary.dueSoon > 0 && (
            <span style={{ background: 'rgba(255,165,2,0.3)', color: '#fff3cc', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              🟡 {data.summary.dueSoon} Due Soon
            </span>
          )}
          <span style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', padding: '3px 10px', borderRadius: 20, fontSize: 11 }}>
            {data.totalAssignments} Total
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', borderBottom: `1px solid ${border}` }}>
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setState({ ...state, selectedFilter: f })}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              background: selectedFilter === f
                ? 'linear-gradient(135deg, #667eea, #764ba2)'
                : card,
              color: selectedFilter === f ? '#fff' : muted,
              transition: 'all 0.2s',
            }}
          >
            {f === 'all' ? '📋 All' : (URGENCY_CONFIG[f]?.label || f)}
          </button>
        ))}
      </div>

      {/* Assignment Cards */}
      <div style={{ padding: '12px 16px', maxHeight: 420, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: muted }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 600 }}>No assignments in this category</div>
          </div>
        ) : (
          filtered.map((assignment) => {
            const urgencyCfg = URGENCY_CONFIG[assignment.urgency] || URGENCY_CONFIG.upcoming;
            const isExpanded = state?.expandedId === assignment.id;
            return (
              <div
                key={assignment.id}
                onClick={() => setState({ ...state, expandedId: isExpanded ? null : assignment.id })}
                style={{
                  background: card,
                  border: `1px solid ${isExpanded ? urgencyCfg.border : border}`,
                  borderLeft: `4px solid ${urgencyCfg.border}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 10,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 16 }}>{TYPE_ICON[assignment.type] || '📌'}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: text }}>{assignment.title}</span>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: PRIORITY_DOT[assignment.priority] || '#aaa',
                        display: 'inline-block',
                        flexShrink: 0,
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: muted }}>{assignment.subject} · {assignment.faculty}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <div style={{
                      background: urgencyCfg.bg,
                      color: urgencyCfg.color,
                      border: `1px solid ${urgencyCfg.border}`,
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: 700,
                    }}>
                      {urgencyCfg.label}
                    </div>
                    <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>
                      {assignment.daysUntilDue < 0
                        ? `${Math.abs(assignment.daysUntilDue)}d overdue`
                        : assignment.daysUntilDue === 0
                        ? 'Today'
                        : `${assignment.daysUntilDue}d left`}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${border}` }}>
                    <div style={{ fontSize: 12, color: muted, marginBottom: 10, lineHeight: 1.5 }}>
                      {assignment.description}
                    </div>
                    <div style={{ display: 'flex', gap: 8, fontSize: 11, color: muted, marginBottom: 10 }}>
                      <span>📅 Due: {assignment.dueDate}</span>
                      <span>🎯 Priority: {assignment.priority}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof sendFollowUpMessage === 'function') {
                          try {
                            sendFollowUpMessage(`Help me plan how to complete the ${assignment.subject} assignment: "${assignment.title}" due on ${assignment.dueDate}`);
                          } catch (err) { console.log(err); }
                        }
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 14px',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      🤖 Ask AI to Help Plan This
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted }}>
        <span>🎓 CampusPilot AI</span>
        <button
          onClick={() => {
            if (typeof sendFollowUpMessage === 'function') {
              try { sendFollowUpMessage('Show me all pending assignments and help me prioritize them'); } catch (err) { console.log(err); }
            }
          }}
          style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
        >
          Refresh ↻
        </button>
      </div>
    </div>
  );
}
