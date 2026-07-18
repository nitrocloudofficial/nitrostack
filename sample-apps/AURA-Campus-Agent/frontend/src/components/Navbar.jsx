import React, { useState, useEffect } from 'react';
import { UserCheck, RefreshCw, Wifi, Shield, ChevronDown } from 'lucide-react';

const PAGES = {
  agent:      { title: 'AURA Agent Console',       sub: 'Natural Language · MCP Orchestrator', neon: '#00f0ff' },
  dashboard:  { title: 'Campus Dashboard',          sub: 'Real-time academic overview',         neon: '#00ff9f' },
  attendance: { title: 'Attendance Monitor',         sub: 'Course-wise attendance tracker',      neon: '#00f0ff' },
  timetable:  { title: 'Class Schedule',            sub: 'Weekly timetable & conflict scanner', neon: '#bf00ff' },
  complaints: { title: 'Grievance System',          sub: 'Complaint filing & resolution',       neon: '#ff2d55' },
  hostel:     { title: 'Hostel Management',         sub: 'Outpass requests & room info',        neon: '#ffb700' },
  library:    { title: 'Library & Dues',            sub: 'Book checkout & fine tracker',        neon: '#00ff9f' },
  finance:    { title: 'Financial Records',         sub: 'Fee statements & transactions',       neon: '#ffb700' },
  placements: { title: 'Placement Drives',          sub: 'Eligibility & job registrations',     neon: '#bf00ff' },
  events:     { title: 'Events & Activities',       sub: 'Campus events & hackathons',          neon: '#ff006e' },
  profile:    { title: 'Student Profile',           sub: 'Official academic identity',          neon: '#00f0ff' },
};

const STUDENTS = [
  { id: 'S1001', name: 'Arjun Sharma', roll: 'CS23B1042', prog: 'B.Tech CS · S6', neon: '#00f0ff' },
  { id: 'S1002', name: 'Sneha Reddy',  roll: 'EC23B2011', prog: 'B.Tech ECE · S6', neon: '#ff006e' },
];

const CSS = `
@keyframes ping-green {
  0%   { box-shadow: 0 0 0 0 rgba(0,255,159,0.5); }
  70%  { box-shadow: 0 0 0 7px rgba(0,255,159,0); }
  100% { box-shadow: 0 0 0 0 rgba(0,255,159,0); }
}
@keyframes nav-drop {
  from { opacity:0; transform: translateY(-16px) perspective(600px) rotateX(-10deg); }
  to   { opacity:1; transform: translateY(0)     perspective(600px) rotateX(0); }
}
@keyframes bar-glow {
  0%,100% { box-shadow: 0 0 8px rgba(0,240,255,0.5); }
  50%     { box-shadow: 0 0 20px rgba(0,240,255,0.9), 0 0 40px rgba(191,0,255,0.4); }
}
@keyframes refresh-spin { to { transform: rotate(360deg); } }
.nav-root { animation: nav-drop 0.4s cubic-bezier(0.16,1,0.3,1) both; }
.refresh-active { animation: refresh-spin 0.55s ease-out; }
.stud-sel option { background: #030510; color: #e0e7ff; }
`;

export default function Navbar({ activeStudent, setActiveStudent, currentPage }) {
  const [spinning, setSpinning] = useState(false);
  const [uptime,   setUptime]   = useState(0);

  useEffect(() => {
    const t = setInterval(() => setUptime(u => u + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const page    = PAGES[currentPage] || PAGES.agent;
  const student = STUDENTS.find(s => s.id === activeStudent) || STUDENTS[0];

  const fmtUptime = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const handleRefresh = () => {
    setSpinning(true);
    setTimeout(() => { setSpinning(false); window.location.reload(); }, 550);
  };

  return (
    <>
      <style>{CSS}</style>
      <header className="nav-root" style={S.header}>

        {/* Bottom neon border line */}
        <div style={{ ...S.bottomLine, background: `linear-gradient(90deg, transparent, ${page.neon}66 40%, rgba(191,0,255,0.5) 60%, transparent)` }} />

        {/* Left: page info */}
        <div style={S.left}>
          <div style={{ ...S.pageBar, background: `linear-gradient(180deg, ${page.neon}, rgba(191,0,255,0.8))`, boxShadow: `0 0 12px ${page.neon}88`, animation: 'bar-glow 2.5s ease-in-out infinite' }} />
          <div>
            <h2 style={{ ...S.title, color: page.neon, textShadow: `0 0 20px ${page.neon}88` }}>
              {page.title}
            </h2>
            <p style={S.sub}>{page.sub}</p>
          </div>
        </div>

        {/* Right: controls */}
        <div style={S.right}>

          {/* Uptime counter */}
          <div style={S.statPill}>
            <Wifi size={10} color="#00ff9f" />
            <span style={S.statLabel}>UPTIME</span>
            <span style={S.statVal}>{fmtUptime(uptime)}</span>
          </div>

          {/* MCP status */}
          <div style={S.mcsPill}>
            <div style={S.pingDot} />
            <Shield size={10} color="#00f0ff" />
            <span style={S.mcsLabel}>MCP LIVE</span>
          </div>

          {/* Student selector */}
          <div style={{ ...S.studentCard, borderColor: `${student.neon}33`, boxShadow: `0 0 16px ${student.neon}18` }}>
            <div style={{ ...S.avatar, background: `${student.neon}1a`, border: `1px solid ${student.neon}44`, boxShadow: `0 0 10px ${student.neon}44` }}>
              <UserCheck size={14} color={student.neon} />
            </div>
            <div style={S.studentInfo}>
              <span style={S.stuLabel}>ACTIVE CONTEXT</span>
              <span style={{ ...S.stuName, color: student.neon, textShadow: `0 0 10px ${student.neon}88` }}>
                {student.name}
              </span>
              <span style={S.stuProg}>{student.prog} · {student.roll}</span>
            </div>
            <ChevronDown size={13} color={student.neon} style={{ opacity: 0.6 }} />
            <select
              value={activeStudent}
              onChange={e => setActiveStudent(e.target.value)}
              className="stud-sel"
              style={S.hiddenSelect}
            >
              {STUDENTS.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.roll})</option>
              ))}
            </select>
          </div>

          {/* Refresh button */}
          <button onClick={handleRefresh} style={S.refreshBtn} title="Refresh Data">
            <RefreshCw
              size={15}
              color="#00f0ff"
              className={spinning ? 'refresh-active' : ''}
              style={{ filter: 'drop-shadow(0 0 5px rgba(0,240,255,0.6))' }}
            />
          </button>
        </div>
      </header>
    </>
  );
}

const S = {
  header: {
    position: 'sticky', top: 0, zIndex: 20,
    background: 'rgba(2,3,10,0.88)',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
    borderBottom: '1px solid rgba(0,240,255,0.08)',
    padding: '12px 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
    minHeight: '64px',
  },
  bottomLine: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '1px', pointerEvents: 'none',
    transition: 'background 0.4s ease',
  },
  left: { display: 'flex', alignItems: 'center', gap: '14px' },
  pageBar: {
    width: '3px', height: '38px', borderRadius: '9999px',
    transition: 'all 0.4s ease', flexShrink: 0,
  },
  title: {
    fontSize: '1.1rem', fontWeight: '800',
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: '-0.02em',
    transition: 'color 0.4s, text-shadow 0.4s',
  },
  sub: {
    fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)',
    marginTop: '2px', fontWeight: '400',
  },
  right: { display: 'flex', alignItems: 'center', gap: '10px' },
  statPill: {
    display: 'flex', alignItems: 'center', gap: '5px',
    background: 'rgba(0,255,159,0.06)',
    border: '1px solid rgba(0,255,159,0.15)',
    borderRadius: '9999px', padding: '5px 12px',
  },
  statLabel: {
    fontSize: '0.58rem', fontWeight: '800', letterSpacing: '1.5px',
    color: 'rgba(0,255,159,0.5)',
  },
  statVal: {
    fontSize: '0.68rem', fontWeight: '700',
    fontFamily: "'JetBrains Mono', monospace",
    color: '#00ff9f', textShadow: '0 0 8px rgba(0,255,159,0.5)',
  },
  mcsPill: {
    display: 'flex', alignItems: 'center', gap: '5px',
    background: 'rgba(0,240,255,0.06)',
    border: '1px solid rgba(0,240,255,0.15)',
    borderRadius: '9999px', padding: '5px 12px',
  },
  pingDot: {
    width: '7px', height: '7px', borderRadius: '50%',
    background: '#00f0ff', marginRight: '2px',
    animation: 'ping-green 1.8s ease-in-out infinite',
  },
  mcsLabel: {
    fontSize: '0.62rem', fontWeight: '800', letterSpacing: '1px',
    color: '#00f0ff', textShadow: '0 0 8px rgba(0,240,255,0.5)',
  },
  studentCard: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px', padding: '8px 14px',
    position: 'relative', cursor: 'pointer',
    transition: 'all 0.25s ease',
  },
  avatar: {
    width: '32px', height: '32px', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'all 0.3s',
  },
  studentInfo: { display: 'flex', flexDirection: 'column', gap: '1px' },
  stuLabel: {
    fontSize: '0.55rem', fontWeight: '800', letterSpacing: '1.2px',
    color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase',
  },
  stuName: {
    fontSize: '0.88rem', fontWeight: '800',
    fontFamily: "'Outfit', sans-serif",
    transition: 'color 0.3s, text-shadow 0.3s',
  },
  stuProg: { fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontWeight: '400' },
  hiddenSelect: {
    position: 'absolute', inset: 0, opacity: 0,
    width: '100%', height: '100%', cursor: 'pointer',
  },
  refreshBtn: {
    background: 'rgba(0,240,255,0.06)',
    border: '1px solid rgba(0,240,255,0.2)',
    borderRadius: '10px',
    width: '38px', height: '38px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.175,0.885,0.32,1.275)',
  },
};
