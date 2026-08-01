'use client';

import { useWidgetSDK, useWidgetState, useTheme } from '@nitrostack/widgets';

interface Period {
  period: number;
  time: string;
  subject: string;
  code: string;
  room: string;
  faculty: string;
  type: string;
}

interface TimetableData {
  student: { name: string; semester: string };
  day: string;
  date: string;
  isToday: boolean;
  totalPeriods: number;
  totalLectures: number;
  totalLabs: number;
  schedule: Period[];
  firstClass: Period | null;
  lastClass: Period | null;
  subjects: string[];
  message: string;
}

const TYPE_STYLE: Record<string, { bg: string; color: string; icon: string; border: string }> = {
  lecture: { bg: 'rgba(102,126,234,0.12)', color: '#667eea', icon: '📖', border: '#667eea' },
  lab:     { bg: 'rgba(46,213,115,0.12)',  color: '#2ed573', icon: '🧪', border: '#2ed573' },
  break:   { bg: 'rgba(120,120,120,0.08)', color: '#888',    icon: '🍽️', border: '#555' },
};

const DEMO_DATA: TimetableData = {
  student: { name: 'Alex Sharma', semester: '5th Semester' },
  day: 'Saturday',
  date: '2026-07-26',
  isToday: true,
  totalPeriods: 3,
  totalLectures: 2,
  totalLabs: 1,
  schedule: [
    { period: 1, time: '9:00-9:55',   subject: 'Theory of Computation', code: 'CS505', room: 'LH-305', faculty: 'Dr. Venkat',    type: 'lecture' },
    { period: 2, time: '10:00-10:55', subject: 'Operating Systems',     code: 'CS502', room: 'LH-302', faculty: 'Prof. Lakshmi', type: 'lecture' },
    { period: 3, time: '11:00-12:55', subject: 'TOC Lab',              code: 'CS505L', room: 'Lab-205', faculty: 'Dr. Venkat',   type: 'lab'     },
  ],
  firstClass: { period: 1, time: '9:00-9:55', subject: 'Theory of Computation', code: 'CS505', room: 'LH-305', faculty: 'Dr. Venkat', type: 'lecture' },
  lastClass:  { period: 3, time: '11:00-12:55', subject: 'TOC Lab', code: 'CS505L', room: 'Lab-205', faculty: 'Dr. Venkat', type: 'lab' },
  subjects: ['Theory of Computation', 'Operating Systems', 'TOC Lab'],
  message: 'You have 3 classes today (Saturday).',
};

export default function TimetableView() {
  const theme = useTheme();
  const { getToolOutput, sendFollowUpMessage } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ showOnlyLectures: boolean }>(() => ({
    showOnlyLectures: false,
  }));

  const data = getToolOutput<TimetableData>() ?? DEMO_DATA;

  const isDark = theme === 'dark';
  const bg       = isDark ? '#0f0f1a' : '#f8f9ff';
  const card     = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)';
  const text     = isDark ? '#e8eaf6' : '#1a1a2e';
  const muted    = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(26,26,46,0.5)';
  const border   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)';

  const schedule = state?.showOnlyLectures
    ? data.schedule.filter(p => p.type === 'lecture')
    : data.schedule;

  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  function isCurrentPeriod(time: string): boolean {
    if (!data.isToday) return false;
    const [start] = time.split('-');
    const [sh, sm] = start.split(':').map(Number);
    const startDecimal = sh + sm / 60;
    return Math.abs(currentHour - startDecimal) < 1;
  }

  return (
    <div style={{ background: bg, borderRadius: 20, overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif", color: text }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', padding: '18px 22px 14px' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>📅 Class Schedule</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{data.day}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{data.date} · {data.student.semester}</div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          {[
            { label: 'Lectures', value: data.totalLectures, icon: '📖' },
            { label: 'Labs',     value: data.totalLabs,     icon: '🧪' },
            { label: 'Total',    value: data.totalPeriods,  icon: '⏱️' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '6px 12px', textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{s.icon} {s.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Message banner */}
      <div style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', borderBottom: `1px solid ${border}`, padding: '10px 16px', fontSize: 12, color: muted, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{data.message}</span>
        <button
          onClick={() => setState({ showOnlyLectures: !state?.showOnlyLectures })}
          style={{ background: state?.showOnlyLectures ? 'linear-gradient(135deg,#f093fb,#f5576c)' : card, color: state?.showOnlyLectures ? '#fff' : muted, border: `1px solid ${border}`, borderRadius: 14, padding: '3px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
        >
          {state?.showOnlyLectures ? '📖 Lectures only' : '📋 All periods'}
        </button>
      </div>

      {/* Schedule list */}
      <div style={{ padding: '10px 14px', maxHeight: 360, overflowY: 'auto' }}>
        {schedule.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: muted }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏖️</div>
            <div style={{ fontWeight: 600 }}>No classes scheduled!</div>
          </div>
        ) : (
          schedule.map((period, i) => {
            const s = TYPE_STYLE[period.type] || TYPE_STYLE.lecture;
            const isCurrent = isCurrentPeriod(period.time);
            return (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'center',
                background: isCurrent ? s.bg : (i % 2 === 0 ? card : 'transparent'),
                border: isCurrent ? `2px solid ${s.border}` : `1px solid ${border}`,
                borderRadius: 10, padding: '10px 14px', marginBottom: 8,
                position: 'relative', transition: 'all 0.2s',
              }}>
                {isCurrent && (
                  <div style={{ position: 'absolute', left: -1, top: '50%', transform: 'translateY(-50%)', width: 4, height: '60%', background: s.color, borderRadius: '0 3px 3px 0' }} />
                )}
                <div style={{ fontSize: 22, flexShrink: 0 }}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: period.type === 'break' ? muted : text }}>{period.subject}</div>
                  {period.type !== 'break' && (
                    <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>{period.faculty} · {period.room}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? s.color : muted }}>{period.time}</div>
                  {isCurrent && <div style={{ fontSize: 9, color: s.color, fontWeight: 700 }}>NOW ●</div>}
                </div>
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
              try { sendFollowUpMessage("Show me tomorrow's timetable"); } catch (err) { console.log(err); }
            }
          }}
          style={{ background: 'none', border: 'none', color: '#f5576c', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
        >
          Tomorrow →
        </button>
      </div>
    </div>
  );
}
