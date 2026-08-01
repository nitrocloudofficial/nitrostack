'use client';

import { useWidgetSDK, useWidgetState, useTheme } from '@nitrostack/widgets';

interface SubjectAttendance {
  code: string;
  name: string;
  faculty: string;
  totalClasses: number;
  attended: number;
  percentage: number;
  status: string;
  safeToMiss: number;
  classesNeeded: number;
  recommendation: string;
  minimumRequired: number;
}

interface AttendanceData {
  student: { name: string; rollNumber: string; semester: string };
  minimumRequired: number;
  subjects: SubjectAttendance[];
  overall: { totalClasses: number; totalAttended: number; overallPercentage: number; status: string };
  summary: { atRiskSubjects: number; borderlineSubjects: number; goodSubjects: number; alert: string };
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; ring: string; label: string; emoji: string }> = {
  good:       { color: '#2ed573', bg: 'rgba(46,213,115,0.15)',  ring: '#2ed573', label: 'Good',       emoji: '✅' },
  borderline: { color: '#ffa502', bg: 'rgba(255,165,2,0.15)',   ring: '#ffa502', label: 'Borderline', emoji: '⚡' },
  'at-risk':  { color: '#ff6b35', bg: 'rgba(255,107,53,0.15)', ring: '#ff6b35', label: 'At Risk',    emoji: '⚠️' },
  danger:     { color: '#ff4757', bg: 'rgba(255,71,87,0.15)',   ring: '#ff4757', label: 'Danger!',    emoji: '🚨' },
};

function CircleProgress({ percentage, status, size = 72 }: { percentage: number; status: string; size?: number }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.good;
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (percentage / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={cfg.ring} strokeWidth={8}
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}>
        <span style={{ fontSize: size < 80 ? 13 : 16, fontWeight: 800, color: cfg.color }}>{percentage.toFixed(0)}%</span>
      </div>
    </div>
  );
}

const DEMO_DATA: AttendanceData = {
  student: { name: 'Alex Sharma', rollNumber: '22CS045', semester: '5th Semester' },
  minimumRequired: 75,
  subjects: [
    { code: 'CS501', name: 'Database Management Systems', faculty: 'Dr. Ramaiah',      totalClasses: 52, attended: 38, percentage: 73.08, status: 'at-risk',   safeToMiss: 0, classesNeeded: 3,  recommendation: '⚠️ At risk! Attend the next 3 consecutive classes.', minimumRequired: 75 },
    { code: 'CS502', name: 'Operating Systems',           faculty: 'Prof. Lakshmi',    totalClasses: 50, attended: 44, percentage: 88.0,  status: 'good',      safeToMiss: 6, classesNeeded: 0,  recommendation: '✅ Good attendance. You can safely miss 6 more.', minimumRequired: 75 },
    { code: 'CS503', name: 'Computer Networks',           faculty: 'Dr. Suresh Kumar', totalClasses: 48, attended: 36, percentage: 75.0,  status: 'borderline',safeToMiss: 0, classesNeeded: 0,  recommendation: '⚡ Borderline. Cannot miss any more classes.', minimumRequired: 75 },
    { code: 'CS504', name: 'Software Engineering',        faculty: 'Prof. Anitha',     totalClasses: 45, attended: 40, percentage: 88.89, status: 'good',      safeToMiss: 5, classesNeeded: 0,  recommendation: '✅ Good attendance. 5 safe bunk(s) remaining.', minimumRequired: 75 },
    { code: 'CS505', name: 'Theory of Computation',      faculty: 'Dr. Venkat',       totalClasses: 46, attended: 32, percentage: 69.57, status: 'danger',    safeToMiss: 0, classesNeeded: 10, recommendation: '🚨 Danger zone! Need 10 consecutive attendances.', minimumRequired: 75 },
  ],
  overall: { totalClasses: 241, totalAttended: 190, overallPercentage: 78.84, status: 'satisfactory' },
  summary: { atRiskSubjects: 2, borderlineSubjects: 1, goodSubjects: 2, alert: '⚠️ You have 2 subject(s) below the minimum attendance requirement!' },
};

export default function AttendanceTracker() {
  const theme = useTheme();
  const { getToolOutput, sendFollowUpMessage } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ view: 'cards' | 'list'; selectedSubject: string | null }>(() => ({
    view: 'cards',
    selectedSubject: null,
  }));

  const data = getToolOutput<AttendanceData>() ?? DEMO_DATA;

  const isDark = theme === 'dark';
  const bg = isDark ? '#0f0f1a' : '#f8f9ff';
  const card = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)';
  const text = isDark ? '#e8eaf6' : '#1a1a2e';
  const muted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(26,26,46,0.5)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,0.08)';

  const selected = state?.selectedSubject
    ? data.subjects.find(s => s.code === state.selectedSubject)
    : null;

  return (
    <div style={{ background: bg, borderRadius: 20, overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif", color: text }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        padding: '20px 24px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>📊 Attendance Tracker</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{data.student.name}</div>
          </div>
          {/* Overall percentage circle */}
          <div style={{ textAlign: 'center' }}>
            <CircleProgress
              percentage={data.overall.overallPercentage}
              status={data.overall.overallPercentage >= 85 ? 'good' : data.overall.overallPercentage >= 75 ? 'borderline' : 'at-risk'}
              size={64}
            />
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Overall</div>
          </div>
        </div>

        {/* Alert banner */}
        <div style={{ marginTop: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
          {data.summary.alert}
        </div>
      </div>

      {/* View Toggle */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${border}` }}>
        {(['cards', 'list'] as const).map(v => (
          <button key={v} onClick={() => setState({ ...state, view: v })} style={{
            padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: state?.view === v ? 'linear-gradient(135deg, #11998e, #38ef7d)' : card,
            color: state?.view === v ? '#fff' : muted,
            transition: 'all 0.2s',
          }}>
            {v === 'cards' ? '🔵 Cards' : '📋 List'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: muted, alignSelf: 'center' }}>Min: {data.minimumRequired}%</span>
      </div>

      {/* Subject Detail Overlay */}
      {selected && (
        <div style={{ margin: '12px 16px', background: STATUS_CONFIG[selected.status]?.bg || card, border: `1px solid ${STATUS_CONFIG[selected.status]?.ring || border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{selected.name}</div>
              <div style={{ fontSize: 11, color: muted }}>{selected.faculty}</div>
            </div>
            <button onClick={() => setState({ ...state, selectedSubject: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: muted }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <CircleProgress percentage={selected.percentage} status={selected.status} size={80} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>
                {selected.attended}/{selected.totalClasses} classes attended
              </div>
              {selected.safeToMiss > 0 ? (
                <div style={{ fontSize: 12, color: STATUS_CONFIG.good.color }}>
                  ✅ Can safely miss {selected.safeToMiss} more class(es)
                </div>
              ) : (
                <div style={{ fontSize: 12, color: STATUS_CONFIG.danger.color }}>
                  🚫 Cannot miss any more classes!
                  {selected.classesNeeded > 0 && <span> Need {selected.classesNeeded} consecutive attendances.</span>}
                </div>
              )}
            </div>
          </div>
          <div style={{ fontSize: 11, color: muted, marginBottom: 10, lineHeight: 1.5 }}>{selected.recommendation}</div>
          <button
            onClick={() => {
              if (typeof sendFollowUpMessage === 'function') {
                try { sendFollowUpMessage(`What is my attendance for ${selected.name} and can I safely miss a class?`); } catch (err) { console.log(err); }
              }
            }}
            style={{ background: 'linear-gradient(135deg, #11998e, #38ef7d)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', width: '100%' }}
          >
            🤖 Get Detailed Attendance Advice
          </button>
        </div>
      )}

      {/* Subject Grid / List */}
      <div style={{ padding: '8px 16px 12px', maxHeight: 380, overflowY: 'auto' }}>
        {state?.view === 'cards' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {data.subjects.map(subject => {
              const cfg = STATUS_CONFIG[subject.status] || STATUS_CONFIG.good;
              return (
                <div
                  key={subject.code}
                  onClick={() => setState({ ...state, selectedSubject: subject.code === state?.selectedSubject ? null : subject.code })}
                  style={{
                    background: state?.selectedSubject === subject.code ? cfg.bg : card,
                    border: `1px solid ${state?.selectedSubject === subject.code ? cfg.ring : border}`,
                    borderRadius: 14, padding: 14, cursor: 'pointer',
                    transition: 'all 0.2s', textAlign: 'center',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                    <CircleProgress percentage={subject.percentage} status={subject.status} size={64} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>
                    {subject.name.split(' ').slice(0, 2).join(' ')}
                  </div>
                  <div style={{ fontSize: 10, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.ring}`, borderRadius: 10, padding: '2px 6px', display: 'inline-block', fontWeight: 600 }}>
                    {cfg.emoji} {cfg.label}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            {data.subjects.map(subject => {
              const cfg = STATUS_CONFIG[subject.status] || STATUS_CONFIG.good;
              return (
                <div
                  key={subject.code}
                  onClick={() => setState({ ...state, selectedSubject: subject.code === state?.selectedSubject ? null : subject.code })}
                  style={{
                    background: state?.selectedSubject === subject.code ? cfg.bg : card,
                    border: `1px solid ${state?.selectedSubject === subject.code ? cfg.ring : border}`,
                    borderRadius: 10, padding: '10px 14px', marginBottom: 8,
                    display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <CircleProgress percentage={subject.percentage} status={subject.status} size={52} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{subject.name}</div>
                    <div style={{ fontSize: 11, color: muted }}>{subject.attended}/{subject.totalClasses} · {subject.faculty}</div>
                  </div>
                  <div style={{ fontSize: 10, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.ring}`, borderRadius: 10, padding: '2px 6px', fontWeight: 600 }}>
                    {cfg.emoji} {cfg.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted }}>
        <span>🎓 CampusPilot AI</span>
        <button
          onClick={() => {
            if (typeof sendFollowUpMessage === 'function') {
              try { sendFollowUpMessage('Check my attendance for all subjects and tell me which ones I need to be careful about.'); } catch (err) { console.log(err); }
            }
          }}
          style={{ background: 'none', border: 'none', color: '#11998e', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
        >
          Full Analysis →
        </button>
      </div>
    </div>
  );
}
