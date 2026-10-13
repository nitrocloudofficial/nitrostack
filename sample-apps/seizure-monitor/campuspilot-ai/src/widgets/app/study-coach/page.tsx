'use client';

import { useWidgetSDK, useWidgetState, useTheme } from '@nitrostack/widgets';

interface StudyBlock {
  time: string;
  subject: string;
  task: string;
  duration: string;
  priority: string;
}

interface TodayClass {
  time: string;
  subject: string;
  room: string;
  type: string;
  attendanceStatus: string;
}

interface AssignmentItem {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  priority: string;
  type: string;
}

interface AttendanceSubject {
  code: string;
  name: string;
  percentage: number;
  status: string;
  attended: number;
  totalClasses: number;
}

interface StudyCoachData {
  greeting: string;
  date: string;
  dayOfWeek: string;
  student: { name: string; rollNumber: string; semester: string };
  summary: {
    pendingAssignments: number;
    urgentDeadlines: number;
    atRiskSubjects: number;
    upcomingExams: number;
    classesToday: number;
    overallAttendance: string;
  };
  alerts: string[];
  todayClasses: TodayClass[];
  studyPlan: StudyBlock[];
  assignments?: AssignmentItem[];
  attendanceSubjects?: AttendanceSubject[];
  totalStudyTime: string;
  insights: {
    topPriority: string;
    attendanceRisk: string[];
    upcomingExams: Array<{ subject: string; date: string }>;
  };
  motivationalQuote: string;
}

const PRIORITY_STYLE: Record<string, { bg: string; border: string; accent: string; icon: string }> = {
  critical: { bg: 'rgba(255,71,87,0.12)',   border: '#ff4757', accent: '#ff4757', icon: '🔴' },
  high:     { bg: 'rgba(255,107,53,0.12)',  border: '#ff6b35', accent: '#ff6b35', icon: '🟠' },
  medium:   { bg: 'rgba(255,165,2,0.12)',   border: '#ffa502', accent: '#ffa502', icon: '🟡' },
  low:      { bg: 'rgba(46,213,115,0.12)',  border: '#2ed573', accent: '#2ed573', icon: '🟢' },
  break:    { bg: 'rgba(120,120,120,0.08)', border: '#666',    accent: '#888',    icon: '☕' },
};

const STATUS_COLOR: Record<string, string> = {
  danger: '#ff4757', 'at-risk': '#ff6b35', borderline: '#ffa502', good: '#2ed573',
};

const DEMO_DATA: StudyCoachData = {
  greeting: 'Good afternoon, Alex Sharma! 👋',
  date: '2026-07-25',
  dayOfWeek: 'Saturday',
  student: { name: 'Alex Sharma', rollNumber: '22CS045', semester: '5th Semester' },
  summary: { pendingAssignments: 5, urgentDeadlines: 2, atRiskSubjects: 2, upcomingExams: 3, classesToday: 3, overallAttendance: '78.8%' },
  alerts: [
    '🟠 DBMS: "ER Diagram" is due TOMORROW!',
    '⚠️ Theory of Computation attendance is 69.6% — DANGER ZONE!',
    '📝 DBMS Unit Test 2 is in 16 days. Revise: Normalization, Transactions.',
  ],
  todayClasses: [
    { time: '9:00-9:55',   subject: 'Theory of Computation', room: 'LH-305', type: 'lecture', attendanceStatus: 'danger' },
    { time: '10:00-10:55', subject: 'Operating Systems',     room: 'LH-302', type: 'lecture', attendanceStatus: 'good'   },
    { time: '11:00-12:55', subject: 'TOC Lab',              room: 'Lab-205', type: 'lab',     attendanceStatus: 'danger' },
  ],
  assignments: [
    { id: 'A001', subject: 'Database Management Systems', title: 'ER Diagram for Hospital Management System', dueDate: '2026-07-26', priority: 'high', type: 'diagram' },
    { id: 'A002', subject: 'Operating Systems', title: 'Process Scheduling Algorithms Implementation', dueDate: '2026-07-27', priority: 'high', type: 'coding' },
    { id: 'A003', subject: 'Computer Networks', title: 'TCP/IP Protocol Analysis Report', dueDate: '2026-07-30', priority: 'medium', type: 'report' },
    { id: 'A004', subject: 'Software Engineering', title: 'Software Requirements Specification (SRS)', dueDate: '2026-08-02', priority: 'medium', type: 'document' },
    { id: 'A005', subject: 'Theory of Computation', title: 'DFA and NFA Construction Problems', dueDate: '2026-08-05', priority: 'low', type: 'problems' },
  ],
  attendanceSubjects: [
    { code: 'CS501', name: 'Database Management Systems', percentage: 73.08, status: 'at-risk',   attended: 38, totalClasses: 52 },
    { code: 'CS502', name: 'Operating Systems',           percentage: 88.0,  status: 'good',      attended: 44, totalClasses: 50 },
    { code: 'CS503', name: 'Computer Networks',           percentage: 75.0,  status: 'borderline',attended: 36, totalClasses: 48 },
    { code: 'CS504', name: 'Software Engineering',        percentage: 88.89, status: 'good',      attended: 40, totalClasses: 45 },
    { code: 'CS505', name: 'Theory of Computation',      percentage: 69.57, status: 'danger',    attended: 32, totalClasses: 46 },
  ],
  studyPlan: [
    { time: '2:00–3:30', subject: 'Database Management Systems', task: 'Complete: ER Diagram for Hospital Management System', duration: '90 min', priority: 'critical' },
    { time: '3:30–3:45', subject: '☕ Break', task: 'Rest, hydrate, and relax.', duration: '15 min', priority: 'break' },
    { time: '3:45–4:45', subject: 'Theory of Computation', task: 'Revision: Focus on DFA, NFA, and Pumping Lemma.', duration: '60 min', priority: 'high' },
    { time: '4:45–6:00', subject: 'Database Management Systems', task: 'Exam Prep: Normalization, Transactions, Concurrency Control', duration: '75 min', priority: 'high' },
    { time: '6:00–7:00', subject: 'Operating Systems', task: 'Work on: Process Scheduling Algorithms implementation', duration: '60 min', priority: 'medium' },
  ],
  totalStudyTime: '4h 45m',
  insights: {
    topPriority: 'DBMS — ER Diagram due tomorrow!',
    attendanceRisk: ['Database Management Systems', 'Theory of Computation'],
    upcomingExams: [{ subject: 'DBMS', date: '2026-08-10' }, { subject: 'OS', date: '2026-08-12' }],
  },
  motivationalQuote: '"The secret of getting ahead is getting started." – Mark Twain',
};

export default function StudyCoach() {
  const theme = useTheme();
  const { getToolOutput, sendFollowUpMessage } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ activeTab: 'plan' | 'assignments' | 'attendance' | 'classes' | 'alerts'; collapsed: boolean }>(() => ({
    activeTab: 'plan',
    collapsed: false,
  }));

  // Falls back to demo data in browser preview; NitroStudio provides real MCP data
  const data = getToolOutput<StudyCoachData>() ?? DEMO_DATA;
  const activeTab = state?.activeTab || 'plan';

  const isDark = theme === 'dark';
  const bg = isDark ? '#0f0f1a' : '#f0f4ff';
  const card = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.95)';
  const text = isDark ? '#e8eaf6' : '#1a1a2e';
  const muted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(26,26,46,0.5)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)';

  const criticalAlerts = data.alerts.filter(a => a.startsWith('🔴') || a.startsWith('🟠') || a.startsWith('⚠️') || a.startsWith('🚫'));
  const infoAlerts = data.alerts.filter(a => !criticalAlerts.includes(a));

  const assignmentsList = data.assignments || DEMO_DATA.assignments || [];
  const attendanceList = data.attendanceSubjects || DEMO_DATA.attendanceSubjects || [];

  const tabs: Array<{ key: 'plan' | 'assignments' | 'attendance' | 'classes' | 'alerts'; label: string; count?: number }> = [
    { key: 'plan', label: '📚 Study Plan' },
    { key: 'assignments', label: '📋 Assignments', count: assignmentsList.length },
    { key: 'attendance', label: '📊 Attendance', count: data.summary.atRiskSubjects },
    { key: 'classes', label: '🏫 Classes', count: data.todayClasses.length },
    { key: 'alerts', label: '🔔 Alerts', count: criticalAlerts.length },
  ];

  return (
    <div style={{ background: bg, borderRadius: 20, overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif", color: text }}>
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: '20px 24px 0',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(102,126,234,0.15)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 10, right: 60, width: 60, height: 60, borderRadius: '50%', background: 'rgba(118,75,162,0.2)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(102,126,234,0.9)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>🧠 CAMPUSPILOT AI · ACADEMIC DASHBOARD</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 2 }}>{data.greeting}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{data.dayOfWeek}, {data.date} · {data.student.semester}</div>
          </div>
        </div>

        {/* Metric Row */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, paddingBottom: 16, overflowX: 'auto' }}>
          {[
            { label: 'Pending', value: data.summary.pendingAssignments, color: '#667eea', icon: '📋' },
            { label: 'Urgent', value: data.summary.urgentDeadlines, color: '#ff4757', icon: '⚡' },
            { label: 'At Risk', value: data.summary.atRiskSubjects, color: '#ff6b35', icon: '⚠️' },
            { label: 'Exams', value: data.summary.upcomingExams, color: '#ffa502', icon: '📝' },
            { label: 'Attendance', value: data.summary.overallAttendance, color: '#2ed573', icon: '📊' },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 16px', textAlign: 'center', minWidth: 72, flexShrink: 0 }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{m.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Motivational Quote */}
        <div style={{ background: 'rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 16px', margin: '0 -24px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
          {data.motivationalQuote}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${border}`, background: isDark ? 'rgba(255,255,255,0.02)' : '#fff', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setState({ ...state, activeTab: tab.key })}
            style={{
              flex: 1, padding: '11px 8px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: 'none', color: activeTab === tab.key ? '#667eea' : muted,
              borderBottom: activeTab === tab.key ? '2px solid #667eea' : '2px solid transparent',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span style={{
                marginLeft: 4, background: tab.key === 'alerts' ? '#ff4757' : '#667eea',
                color: '#fff', borderRadius: 10, padding: '1px 5px', fontSize: 9, fontWeight: 800,
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ maxHeight: 420, overflowY: 'auto', padding: '14px 18px' }}>
        {/* 1. Study Plan Tab */}
        {activeTab === 'plan' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: muted }}>⏱️ Total study time: <strong style={{ color: text }}>{data.totalStudyTime}</strong></div>
              <div style={{ fontSize: 11, color: '#667eea', fontWeight: 600 }}>🎯 {data.insights.topPriority.split(' ').slice(0, 4).join(' ')}...</div>
            </div>

            {data.studyPlan.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: muted }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                <div>No urgent study items. Keep up the great work!</div>
              </div>
            ) : (
              data.studyPlan.map((block, i) => {
                const style = PRIORITY_STYLE[block.priority] || PRIORITY_STYLE.low;
                return (
                  <div key={i} style={{
                    background: style.bg, border: `1px solid ${style.border}`,
                    borderLeft: `4px solid ${style.border}`, borderRadius: 10,
                    padding: '10px 14px', marginBottom: 8,
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                  }}>
                    <div style={{ flexShrink: 0 }}>
                      <span style={{ fontSize: 18 }}>{style.icon}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: style.accent }}>{block.subject}</span>
                        <span style={{ fontSize: 10, color: muted }}>{block.time}</span>
                      </div>
                      <div style={{ fontSize: 11, color: muted, lineHeight: 1.4 }}>{block.task}</div>
                      <div style={{ fontSize: 10, color: style.accent, marginTop: 4, fontWeight: 600 }}>⏱️ {block.duration}</div>
                    </div>
                  </div>
                );
              })
            )}

            <button
              onClick={() => {
                if (typeof sendFollowUpMessage === 'function') {
                  try { sendFollowUpMessage('Generate my complete daily study plan with time allocations for today'); } catch (e) { console.log(e); }
                }
              }}
              style={{ width: '100%', marginTop: 8, background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              🔄 Regenerate Today's Plan
            </button>
          </div>
        )}

        {/* 2. Assignments Tab */}
        {activeTab === 'assignments' && (
          <div>
            <div style={{ fontSize: 12, color: muted, marginBottom: 10 }}>
              📋 You have <strong>{assignmentsList.length}</strong> pending assignment(s):
            </div>
            {assignmentsList.map((a, i) => (
              <div key={i} style={{ background: card, border: `1px solid ${border}`, borderLeft: `4px solid ${a.priority === 'high' ? '#ff4757' : a.priority === 'medium' ? '#ffa502' : '#2ed573'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{a.title}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: a.priority === 'high' ? 'rgba(255,71,87,0.15)' : 'rgba(255,165,2,0.15)', color: a.priority === 'high' ? '#ff4757' : '#ffa502', fontWeight: 700 }}>
                    {a.priority.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: muted, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{a.subject}</span>
                  <span>📅 Due: {a.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. Attendance Tab */}
        {activeTab === 'attendance' && (
          <div>
            <div style={{ fontSize: 12, color: muted, marginBottom: 10 }}>
              📊 Subject-wise Attendance Records (Overall: <strong>{data.summary.overallAttendance}</strong>):
            </div>
            {attendanceList.map((sub, i) => {
              const color = STATUS_COLOR[sub.status] || '#2ed573';
              return (
                <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{sub.name}</div>
                    <div style={{ fontSize: 11, color: muted }}>{sub.attended}/{sub.totalClasses} classes attended</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color }}>{sub.percentage.toFixed(1)}%</div>
                    <div style={{ fontSize: 10, color, fontWeight: 600 }}>{sub.status.toUpperCase()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Classes Tab */}
        {activeTab === 'classes' && (
          <div>
            {data.todayClasses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: muted }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🏖️</div>
                <div style={{ fontWeight: 600 }}>No classes today!</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Perfect day for self-study.</div>
              </div>
            ) : (
              data.todayClasses.map((cls, i) => {
                const attendanceColor = STATUS_COLOR[cls.attendanceStatus] || '#2ed573';
                return (
                  <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ background: cls.type === 'lab' ? 'rgba(46,213,115,0.15)' : 'rgba(102,126,234,0.15)', borderRadius: 8, padding: '8px', fontSize: 20, flexShrink: 0 }}>
                      {cls.type === 'lab' ? '🧪' : '📖'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{cls.subject}</div>
                      <div style={{ fontSize: 11, color: muted }}>{cls.time} · {cls.room}</div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: attendanceColor, flexShrink: 0 }} />
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 5. Alerts Tab */}
        {activeTab === 'alerts' && (
          <div>
            {criticalAlerts.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#ff4757', marginBottom: 6, letterSpacing: '0.05em' }}>🚨 URGENT</div>
                {criticalAlerts.map((alert, i) => (
                  <div key={i} style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 12, color: isDark ? '#ffcdd2' : '#c62828', lineHeight: 1.5 }}>
                    {alert}
                  </div>
                ))}
              </div>
            )}
            {infoAlerts.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#667eea', marginBottom: 6, letterSpacing: '0.05em' }}>ℹ️ INFO</div>
                {infoAlerts.map((alert, i) => (
                  <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 12, color: text, lineHeight: 1.5 }}>
                    {alert}
                  </div>
                ))}
              </div>
            )}
            {data.alerts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: muted }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 600 }}>All clear! No urgent alerts.</div>
              </div>
            )}
            <button
              onClick={() => {
                if (typeof sendFollowUpMessage === 'function') {
                  try { sendFollowUpMessage('Give me a complete status check: attendance, assignments, and upcoming exams'); } catch (e) { console.log(e); }
                }
              }}
              style={{ width: '100%', marginTop: 8, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              🧠 Full Academic Status Report
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted }}>
        <span>🧠 CampusPilot AI · All-in-One Dashboard</span>
        <span style={{ color: text }}>{data.student.semester}</span>
      </div>
    </div>
  );
}
