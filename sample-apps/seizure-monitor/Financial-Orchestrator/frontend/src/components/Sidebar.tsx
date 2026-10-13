import React from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  user?: any;
  onSignOut?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, onSignOut }) => {
  const navItems = [
    { path: '/', label: 'Overview', icon: '◱' },
    { path: '/profile', label: 'User Profile', icon: '👤' },
    { path: '/accounts', label: 'Bank Aggregation', icon: '🏦' },
    { path: '/taxonomy', label: 'Data Taxonomy', icon: '📑' },
    { path: '/dna', label: 'Health Score', icon: '🧬' },
    { path: '/monitoring', label: 'Data Monitoring', icon: '📡' },
    { path: '/market', label: 'Market Reactions', icon: '📉' },
    { path: '/credit', label: 'Credit & Loans', icon: '💳' },
    { path: '/journey', label: 'Omni-Channel', icon: '🧵' },
    { path: '/execution', label: 'HITL Approvals', icon: '🛡️' },
  ];

  const userName = user?.name || 'Priya Sharma';

  return (
    <div style={{
      width: '260px',
      height: '100vh',
      background: 'rgba(5, 5, 10, 0.95)',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      padding: '32px 20px',
      position: 'fixed',
      top: 0,
      left: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
      <div style={{ marginBottom: '40px', padding: '0 12px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, background: 'linear-gradient(45deg, #00F0FF, #7000FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.2 }}>
          Financial<br/>Orchestrator
        </h1>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              textDecoration: 'none',
              color: isActive ? '#fff' : '#8B949E',
              background: isActive ? 'rgba(0, 240, 255, 0.05)' : 'transparent',
              border: `1px solid ${isActive ? 'rgba(0, 240, 255, 0.1)' : 'transparent'}`,
              fontWeight: isActive ? 600 : 500,
              transition: 'all 0.2s',
            })}
          >
            <span style={{ fontSize: '18px' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#8B949E', marginBottom: '4px' }}>Active User</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00F0FF', boxShadow: '0 0 8px #00F0FF' }} />
            <strong style={{ fontSize: '13px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</strong>
          </div>
        </div>

        {onSignOut && (
          <button
            onClick={onSignOut}
            style={{
              padding: '8px 12px',
              background: 'rgba(255, 69, 58, 0.1)',
              border: '1px solid rgba(255, 69, 58, 0.25)',
              borderRadius: '8px',
              color: '#FF453A',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
};
