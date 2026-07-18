import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, LayoutDashboard, CheckSquare, Calendar,
  AlertCircle, Home, BookOpen, DollarSign, Briefcase, Sparkles,
  User, UserCheck, RefreshCw, ChevronDown, GraduationCap,
  Building2, TrendingUp, Info, Menu, X
} from 'lucide-react';

const NAV = [
  { id: 'agent',     label: 'Agent',     icon: MessageSquare,   accent: '#0284c7', direct: true },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, accent: '#0284c7', direct: true },
  { id: 'about',     label: 'About',     icon: Info,            accent: '#0284c7', direct: true },
  {
    id: 'academics', label: 'Academics', icon: GraduationCap, accent: '#4f46e5', direct: false,
    children: [
      { id: 'attendance', label: 'Attendance', icon: CheckSquare, accent: '#0284c7', desc: 'Course attendance logs' },
      { id: 'timetable',  label: 'Timetable',  icon: Calendar,    accent: '#4f46e5', desc: 'Weekly schedule' },
      { id: 'complaints', label: 'Complaints', icon: AlertCircle, accent: '#ef4444', desc: 'Grievance tracker' },
    ],
  },
  {
    id: 'campus', label: 'Campus Life', icon: Building2, accent: '#10b981', direct: false,
    children: [
      { id: 'hostel',  label: 'Hostel',  icon: Home,     accent: '#f59e0b', desc: 'Room & outpass requests' },
      { id: 'library', label: 'Library', icon: BookOpen, accent: '#10b981', desc: 'Books & checkouts' },
      { id: 'events',  label: 'Events',  icon: Sparkles, accent: '#db2777', desc: 'Activities & registration' },
    ],
  },
  {
    id: 'career', label: 'Career & Finance', icon: TrendingUp, accent: '#db2777', direct: false,
    children: [
      { id: 'finance',    label: 'Finance',    icon: DollarSign, accent: '#f59e0b', desc: 'Dues & fee payments' },
      { id: 'placements', label: 'Placements', icon: Briefcase,  accent: '#4f46e5', desc: 'Drives & cutoffs' },
    ],
  },
];

const STUDENTS = [
  { id: 'S1001', name: 'Arjun Sharma', prog: 'B.Tech CS · S6', accent: '#0284c7' },
  { id: 'S1002', name: 'Sneha Reddy',  prog: 'B.Tech ECE · S6', accent: '#db2777' },
];

/* ─────── Dropdown ─────── */
function Dropdown({ group, currentPage, onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isActive = group.children.some(c => c.id === currentPage);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
          border: `1px solid ${isActive || open ? 'rgba(15,23,42,0.12)' : 'transparent'}`,
          background: isActive || open ? 'rgba(15,23,42,0.05)' : 'transparent',
          color: isActive ? '#0f172a' : '#475569',
          fontSize: '0.82rem', fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!open && !isActive) { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; } }}
        onMouseLeave={e => { if (!open && !isActive) { e.currentTarget.style.background = 'transparent'; } }}
      >
        <group.icon size={13} color={isActive || open ? group.accent : '#64748b'} />
        <span>{group.label}</span>
        <ChevronDown size={11} color="#94a3b8"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)',
          minWidth: 220, borderRadius: 14,
          background: '#ffffff',
          border: '1px solid rgba(15,23,42,0.08)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.1)',
          overflow: 'hidden', zIndex: 1000,
          animation: 'dropIn 0.15s ease',
        }}>
          <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <group.icon size={12} color={group.accent} />
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{group.label}</span>
          </div>
          <div style={{ padding: '6px 8px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {group.children.map(item => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px', borderRadius: 10,
                    border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                    background: active ? `${item.accent}10` : 'transparent',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? `${item.accent}15` : 'rgba(15,23,42,0.04)',
                    border: `1px solid ${active ? `${item.accent}30` : 'rgba(15,23,42,0.07)'}`,
                  }}>
                    <Icon size={13} color={active ? item.accent : '#64748b'} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: active ? '#0f172a' : '#334155' }}>{item.label}</div>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 1 }}>{item.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────── Student Switcher ─────── */
function StudentSwitcher({ activeStudent, setActiveStudent }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const student = STUDENTS.find(s => s.id === activeStudent) || STUDENTS[0];

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '5px 10px', borderRadius: 20, cursor: 'pointer',
          border: '1px solid rgba(15,23,42,0.1)',
          background: 'rgba(15,23,42,0.02)',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(15,23,42,0.02)'}
      >
        <div style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${student.accent}15`, border: `1px solid ${student.accent}30`,
        }}>
          <UserCheck size={11} color={student.accent} />
        </div>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap' }}>
          {student.name}
        </span>
        <ChevronDown size={11} color="#94a3b8"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          minWidth: 200, borderRadius: 14,
          background: '#ffffff',
          border: '1px solid rgba(15,23,42,0.08)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.1)',
          overflow: 'hidden', zIndex: 1000,
          animation: 'dropIn 0.15s ease',
        }}>
          <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>Switch Student</span>
          </div>
          <div style={{ padding: '6px 8px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {STUDENTS.map(s => {
              const active = s.id === activeStudent;
              return (
                <button
                  key={s.id}
                  onClick={() => { setActiveStudent(s.id); setOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 10,
                    border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                    background: active ? `${s.accent}08` : 'transparent',
                    borderLeft: `3px solid ${active ? s.accent : 'transparent'}`,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? `${s.accent}08` : 'transparent'; }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${s.accent}12`, border: `1px solid ${s.accent}25`,
                  }}>
                    <UserCheck size={12} color={s.accent} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: active ? '#0f172a' : '#475569' }}>{s.name}</div>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{s.prog}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────── TopNav ─────── */
export default function TopNav({ currentPage, setCurrentPage, activeStudent, setActiveStudent }) {
  const [spinning,    setSpinning]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  const navigate = page => { setCurrentPage(page); setMobileOpen(false); };

  const handleRefresh = () => {
    setSpinning(true);
    setTimeout(() => { setSpinning(false); window.location.reload(); }, 550);
  };

  return (
    <>
      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes orbPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(2,132,199,0.25); }
          50%     { box-shadow: 0 0 0 5px rgba(2,132,199,0); }
        }
        @keyframes pingDot {
          0%   { box-shadow: 0 0 0 0 rgba(2,132,199,0.5); }
          70%  { box-shadow: 0 0 0 6px rgba(2,132,199,0); }
          100% { box-shadow: 0 0 0 0 rgba(2,132,199,0); }
        }
      `}</style>

      <header style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: '#ffffff',
        borderBottom: '1px solid rgba(15,23,42,0.08)',
        boxShadow: '0 1px 12px rgba(15,23,42,0.06)',
      }}>
        {/* ── Main nav row ── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px', height: 58,
          maxWidth: 1200, margin: '0 auto',
          gap: 16,
        }}>
          {/* Left: Logo */}
          <div
            onClick={() => navigate('dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #e0f2fe, #ddd6fe)',
              border: '1px solid rgba(2,132,199,0.2)',
              fontSize: 16,
              animation: 'orbPulse 3s ease-in-out infinite',
            }}>🔮</div>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.5px' }}>
              AURA.
            </span>
          </div>

          {/* Center: Desktop Nav */}
          <nav style={{
            display: 'flex', alignItems: 'center', gap: 2,
            flex: 1, justifyContent: 'center',
          }} className="desktop-nav">
            {NAV.map(item => {
              if (item.direct) {
                const Icon = item.icon;
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${active ? 'rgba(2,132,199,0.2)' : 'transparent'}`,
                      background: active ? 'rgba(2,132,199,0.06)' : 'transparent',
                      color: active ? '#0284c7' : '#475569',
                      fontSize: '0.82rem', fontWeight: active ? 700 : 600,
                      fontFamily: "'Inter', sans-serif",
                      transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; e.currentTarget.style.color = '#334155'; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; } }}
                  >
                    <Icon size={13} color={active ? '#0284c7' : '#64748b'} />
                    {item.label}
                  </button>
                );
              }
              return <Dropdown key={item.id} group={item} currentPage={currentPage} onNavigate={navigate} />;
            })}
          </nav>

          {/* Right: Status + Student + Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* MCP LIVE */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20,
              background: 'rgba(2,132,199,0.05)',
              border: '1px solid rgba(2,132,199,0.15)',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: '#0284c7',
                animation: 'pingDot 2s ease-in-out infinite',
              }} />
              <span style={{ fontSize: '0.67rem', fontWeight: 800, color: '#0284c7', letterSpacing: '0.4px' }}>MCP LIVE</span>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: 'rgba(15,23,42,0.1)' }} />

            {/* Student Switcher */}
            <StudentSwitcher activeStudent={activeStudent} setActiveStudent={setActiveStudent} />

            {/* Profile */}
            <button
              onClick={() => navigate('profile')}
              title="Profile"
              style={{
                width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${currentPage === 'profile' ? 'rgba(2,132,199,0.25)' : 'rgba(15,23,42,0.1)'}`,
                background: currentPage === 'profile' ? 'rgba(2,132,199,0.07)' : 'rgba(15,23,42,0.02)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = currentPage === 'profile' ? 'rgba(2,132,199,0.07)' : 'rgba(15,23,42,0.02)'}
            >
              <User size={14} color={currentPage === 'profile' ? '#0284c7' : '#475569'} />
            </button>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              title="Refresh"
              style={{
                width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(15,23,42,0.1)',
                background: 'rgba(15,23,42,0.02)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(15,23,42,0.02)'}
            >
              <RefreshCw size={13} color="#475569"
                style={{ transition: 'transform 0.5s', transform: spinning ? 'rotate(360deg)' : 'none' }} />
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              style={{
                display: 'none',
                width: 34, height: 34, borderRadius: 8, cursor: 'pointer',
                alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(15,23,42,0.1)',
                background: 'transparent',
              }}
              className="mobile-menu-btn"
            >
              {mobileOpen ? <X size={16} color="#475569" /> : <Menu size={16} color="#475569" />}
            </button>
          </div>
        </div>

        {/* ── Mobile nav drawer ── */}
        {mobileOpen && (
          <div style={{
            borderTop: '1px solid rgba(15,23,42,0.07)',
            padding: '8px 16px 12px',
            display: 'flex', flexDirection: 'column', gap: 2,
            background: '#fff',
          }}>
            {NAV.map(item => {
              if (item.direct) {
                const Icon = item.icon;
                const active = currentPage === item.id;
                return (
                  <button key={item.id} onClick={() => navigate(item.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: active ? 'rgba(2,132,199,0.07)' : 'transparent',
                    color: active ? '#0284c7' : '#475569',
                    fontSize: '0.85rem', fontWeight: 600, fontFamily: "'Inter', sans-serif",
                    textAlign: 'left',
                  }}>
                    <Icon size={15} color={active ? '#0284c7' : '#64748b'} />
                    {item.label}
                  </button>
                );
              }
              return item.children.map(child => {
                const Icon = child.icon;
                const active = currentPage === child.id;
                return (
                  <button key={child.id} onClick={() => navigate(child.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px 8px 28px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: active ? 'rgba(2,132,199,0.07)' : 'transparent',
                    color: active ? '#0284c7' : '#64748b',
                    fontSize: '0.8rem', fontWeight: 600, fontFamily: "'Inter', sans-serif",
                    textAlign: 'left',
                  }}>
                    <Icon size={13} color={active ? '#0284c7' : '#94a3b8'} />
                    {child.label}
                  </button>
                );
              });
            })}
          </div>
        )}
      </header>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (max-width: 640px) {
          header > div { padding: 0 16px !important; }
        }
      `}</style>
    </>
  );
}
