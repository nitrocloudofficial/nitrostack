import React, { useState } from 'react';
import {
  MessageSquare, LayoutDashboard, CheckSquare, Calendar,
  AlertCircle, Home, BookOpen, DollarSign, Briefcase, Sparkles, User, 
  Zap, Radio, ChevronRight
} from 'lucide-react';

const SECTIONS = [
  {
    group: 'AI',
    items: [
      { id: 'agent', label: 'AURA Agent', desc: 'Chat & Orchestrate', icon: MessageSquare, neon: '#00f0ff', glow: 'rgba(0,240,255,0.5)' },
      { id: 'dashboard', label: 'Overview', desc: 'Campus snapshot', icon: LayoutDashboard, neon: '#00ff9f', glow: 'rgba(0,255,159,0.5)' },
    ]
  },
  {
    group: 'ACADEMICS',
    items: [
      { id: 'attendance', label: 'Attendance', desc: 'Course logs', icon: CheckSquare, neon: '#00f0ff', glow: 'rgba(0,240,255,0.45)' },
      { id: 'timetable', label: 'Timetable', desc: 'Weekly schedule', icon: Calendar, neon: '#bf00ff', glow: 'rgba(191,0,255,0.5)' },
      { id: 'complaints', label: 'Complaints', desc: 'Grievances', icon: AlertCircle, neon: '#ff2d55', glow: 'rgba(255,45,85,0.5)' },
    ]
  },
  {
    group: 'CAMPUS LIFE',
    items: [
      { id: 'hostel', label: 'Hostel', desc: 'Room & outpass', icon: Home, neon: '#ffb700', glow: 'rgba(255,183,0,0.5)' },
      { id: 'library', label: 'Library', desc: 'Books & fines', icon: BookOpen, neon: '#00ff9f', glow: 'rgba(0,255,159,0.45)' },
      { id: 'events', label: 'Events', desc: 'Activities', icon: Sparkles, neon: '#ff006e', glow: 'rgba(255,0,110,0.5)' },
    ]
  },
  {
    group: 'CAREER & FINANCE',
    items: [
      { id: 'finance', label: 'Finance', desc: 'Fees & dues', icon: DollarSign, neon: '#ffb700', glow: 'rgba(255,183,0,0.45)' },
      { id: 'placements', label: 'Placements', desc: 'Drives & cutoffs', icon: Briefcase, neon: '#bf00ff', glow: 'rgba(191,0,255,0.45)' },
      { id: 'profile', label: 'Profile', desc: 'Student record', icon: User, neon: '#00f0ff', glow: 'rgba(0,240,255,0.4)' },
    ]
  }
];

const CSS = `
@keyframes orb-flicker {
  0%,100% { box-shadow:0 0 14px 3px rgba(0,240,255,0.5),0 0 40px 8px rgba(191,0,255,0.2); }
  50%      { box-shadow:0 0 28px 7px rgba(0,240,255,0.8),0 0 60px 14px rgba(191,0,255,0.4); }
}
@keyframes scan {
  0%  { top: -80px; opacity: 0; }
  8%  { opacity: 0.8; }
  92% { opacity: 0.8; }
  100%{ top: 100%;   opacity: 0; }
}
@keyframes badge-glow {
  0%,100%{ box-shadow:0 0 8px rgba(0,240,255,0.25); }
  50%    { box-shadow:0 0 20px rgba(0,240,255,0.6),0 0 40px rgba(191,0,255,0.3); }
}
@keyframes item-in {
  from { opacity:0; transform:translateX(-16px) scale(0.96); }
  to   { opacity:1; transform:translateX(0)     scale(1); }
}
.sb-item { animation: item-in 0.38s cubic-bezier(0.16,1,0.3,1) both; }
.sb-item:nth-child(1)  { animation-delay:0.05s }
.sb-item:nth-child(2)  { animation-delay:0.09s }
.sb-item:nth-child(3)  { animation-delay:0.13s }
.sb-item:nth-child(4)  { animation-delay:0.17s }
.sb-item:nth-child(5)  { animation-delay:0.21s }
.sb-item:nth-child(6)  { animation-delay:0.25s }
.sb-item:nth-child(7)  { animation-delay:0.29s }
.sb-item:nth-child(8)  { animation-delay:0.33s }
.sb-item:nth-child(9)  { animation-delay:0.37s }
.sb-item:nth-child(10) { animation-delay:0.41s }
.sb-item:nth-child(11) { animation-delay:0.45s }
.sb-btn:hover .sb-chevron { opacity:1 !important; transform:translateX(2px) !important; }
`;

export default function Sidebar({ currentPage, setCurrentPage }) {
  const [hovered, setHovered] = useState(null);

  return (
    <>
      <style>{CSS}</style>
      <aside style={S.sidebar}>

        {/* Animated scan line */}
        <div style={S.scanLine} />

        {/* ── Logo ───────────────────────────────── */}
        <div style={S.logo}>
          <div style={S.orbRing}>
            <div style={S.orb}>🔮</div>
          </div>
          <div>
            <h1 style={S.logoText}>AURA</h1>
            <p style={S.logoSub}>
              <Radio size={8} style={{ marginRight:3, verticalAlign:'middle' }} />
              CAMPUS INTELLIGENCE
            </p>
          </div>
        </div>

        <div style={S.divider} />

        {/* ── Nav sections ───────────────────────── */}
        <nav style={S.nav}>
          {SECTIONS.map(section => (
            <div key={section.group} style={S.section}>
              <p style={S.groupLabel}>{section.group}</p>
              {section.items.map(item => {
                const Icon   = item.icon;
                const active  = currentPage === item.id;
                const hover   = hovered === item.id;

                return (
                  <button
                    key={item.id}
                    className="sb-item sb-btn"
                    onClick={() => setCurrentPage(item.id)}
                    onMouseEnter={() => setHovered(item.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      ...S.btn,
                      background: active
                        ? `linear-gradient(135deg, ${item.neon}18, ${item.neon}08)`
                        : hover ? 'rgba(255,255,255,0.04)' : 'transparent',
                      borderLeft: `3px solid ${active ? item.neon : hover ? item.neon + '55' : 'transparent'}`,
                      boxShadow: active
                        ? `inset 0 0 20px ${item.neon}0d, 0 2px 16px ${item.neon}12`
                        : 'none',
                      transform: hover && !active
                        ? 'translateX(4px)'
                        : active ? 'translateX(3px)' : 'translateX(0)',
                    }}
                  >
                    {/* Icon box */}
                    <div style={{
                      ...S.iconBox,
                      background: active ? `${item.neon}20`
                        : hover ? `${item.neon}10` : 'rgba(255,255,255,0.04)',
                      boxShadow: active ? `0 0 10px ${item.neon}50` : 'none',
                      border: `1px solid ${active ? item.neon + '45' : 'rgba(255,255,255,0.05)'}`,
                    }}>
                      <Icon
                        size={14}
                        color={active ? item.neon : hover ? item.neon + 'cc' : '#3d4f70'}
                        style={{ filter: active ? `drop-shadow(0 0 4px ${item.neon})` : 'none', transition:'all 0.25s' }}
                      />
                    </div>

                    {/* Text */}
                    <div style={S.btnText}>
                      <span style={{
                        ...S.label,
                        color: active ? item.neon : hover ? '#8fa3c8' : '#4a5f80',
                        textShadow: active ? `0 0 10px ${item.neon}88` : 'none',
                      }}>
                        {item.label}
                      </span>
                      <span style={{ ...S.desc, color: active ? `${item.neon}77` : hover ? '#2e3a55' : '#1e2a3d' }}>
                        {item.desc}
                      </span>
                    </div>

                    {/* Chevron */}
                    <ChevronRight
                      className="sb-chevron"
                      size={12}
                      color={item.neon}
                      style={{ opacity: active ? 0.7 : 0, transform: 'translateX(0)', transition:'all 0.2s', flexShrink:0 }}
                    />
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={S.divider} />

        {/* ── Footer ─────────────────────────────── */}
        <div style={S.footer}>
          <div style={S.footerBadge}>
            <Zap size={8} color="#00f0ff" style={{ marginRight:4 }} />
            MCP HACKATHON · v1.0
          </div>
          <p style={S.footerSub}>FastMCP + Claude AI</p>
        </div>
      </aside>
    </>
  );
}

const S = {
  sidebar: {
    width: '230px', height:'100vh', flexShrink: 0,
    background: 'linear-gradient(180deg,rgba(2,3,10,0.98) 0%,rgba(3,4,14,0.99) 100%)',
    backdropFilter: 'blur(24px)',
    borderRight: '1px solid rgba(0,240,255,0.08)',
    display: 'flex', flexDirection: 'column',
    position: 'relative', overflow: 'hidden',
    boxShadow: '2px 0 32px rgba(0,0,0,0.8), inset -1px 0 0 rgba(0,240,255,0.04)',
  },
  scanLine: {
    position:'absolute', left:0, right:0, height:'80px',
    background:'linear-gradient(180deg,transparent,rgba(0,240,255,0.05),transparent)',
    animation:'scan 10s linear infinite', pointerEvents:'none', zIndex:0,
  },
  logo: {
    padding:'18px 16px',
    display:'flex', alignItems:'center', gap:'12px',
    position:'relative', zIndex:2,
  },
  orbRing: {
    padding:'2px', borderRadius:'12px', flexShrink:0,
    background:'linear-gradient(135deg,rgba(0,240,255,0.7),rgba(191,0,255,0.7))',
  },
  orb: {
    width:'40px', height:'40px', borderRadius:'10px',
    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px',
    background:'rgba(2,3,10,0.95)',
    animation:'orb-flicker 3s ease-in-out infinite',
  },
  logoText: {
    fontSize:'1.35rem', fontWeight:'900', letterSpacing:'4px',
    background:'linear-gradient(135deg,#00f0ff,#bf00ff)',
    WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
    fontFamily:"'Outfit',sans-serif",
  },
  logoSub: {
    fontSize:'0.55rem', fontWeight:'700', letterSpacing:'1.5px',
    color:'rgba(0,240,255,0.55)', display:'flex', alignItems:'center',
  },
  divider: {
    height:'1px', margin:'2px 14px',
    background:'linear-gradient(90deg,transparent,rgba(0,240,255,0.2) 40%,rgba(191,0,255,0.2) 60%,transparent)',
  },
  nav: {
    flex:1, padding:'8px 10px',
    display:'flex', flexDirection:'column', gap:'4px',
    overflowY:'auto', position:'relative', zIndex:2,
  },
  section: { marginBottom:'6px' },
  groupLabel: {
    fontSize:'0.55rem', fontWeight:'800', letterSpacing:'2px',
    color:'rgba(255,255,255,0.15)', textTransform:'uppercase',
    padding:'6px 10px 4px',
  },
  btn: {
    display:'flex', alignItems:'center', gap:'10px',
    padding:'8px 10px', borderRadius:'8px',
    border:'none', cursor:'pointer', textAlign:'left', width:'100%',
    transition:'all 0.22s cubic-bezier(0.16,1,0.3,1)',
    position:'relative',
  },
  iconBox: {
    width:'28px', height:'28px', borderRadius:'7px',
    display:'flex', alignItems:'center', justifyContent:'center',
    flexShrink:0, transition:'all 0.25s ease',
  },
  btnText: { display:'flex', flexDirection:'column', flex:1, minWidth:0 },
  label: {
    fontSize:'0.8rem', fontWeight:'600',
    fontFamily:"'Inter',sans-serif",
    transition:'color 0.2s, text-shadow 0.2s',
    letterSpacing:'0.1px',
  },
  desc: {
    fontSize:'0.62rem', marginTop:'1px',
    transition:'color 0.2s',
    fontWeight:'400',
  },
  footer: {
    padding:'10px 14px',
    display:'flex', flexDirection:'column', alignItems:'center', gap:'4px',
    position:'relative', zIndex:2,
  },
  footerBadge: {
    display:'flex', alignItems:'center',
    fontSize:'0.58rem', fontWeight:'800', letterSpacing:'0.8px',
    color:'#00f0ff',
    background:'rgba(0,240,255,0.07)',
    border:'1px solid rgba(0,240,255,0.18)',
    padding:'4px 12px', borderRadius:'9999px',
    animation:'badge-glow 2.5s ease-in-out infinite',
  },
  footerSub: { fontSize:'0.55rem', color:'rgba(255,255,255,0.12)', fontWeight:'400' },
};
