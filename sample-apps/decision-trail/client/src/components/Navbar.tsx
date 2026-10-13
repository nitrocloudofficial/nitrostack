import React from 'react';
import { Compass, Cpu, Database, Activity, Cloud } from 'lucide-react';

interface NavbarProps {
  activeTab: 'chat' | 'graph';
  setActiveTab: (tab: 'chat' | 'graph') => void;
  serverStatus: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, serverStatus }) => {
  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 32px',
      borderBottom: '1px solid var(--border-color)',
      background: 'rgba(10, 13, 20, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(0, 242, 254, 0.4)'
        }}>
          <Compass size={22} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            DECISION<span style={{ color: 'var(--accent-cyan)' }}>TRAIL</span>
          </h1>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
            Agentic Decision Intelligence Platform • NitroStack SDK
          </p>
        </div>
      </div>

      {/* Center Navigation Tabs */}
      <div style={{
        display: 'flex',
        background: 'var(--bg-secondary)',
        padding: '4px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'chat' ? 'var(--bg-card-hover)' : 'transparent',
            color: activeTab === 'chat' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === 'chat' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
          }}
        >
          <Cpu size={16} />
          Agentic Chat & Investigation
        </button>

        <button
          onClick={() => setActiveTab('graph')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'graph' ? 'var(--bg-card-hover)' : 'transparent',
            color: activeTab === 'graph' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === 'graph' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
          }}
        >
          <Database size={16} />
          Interactive Decision Graph
        </button>
      </div>

      {/* Status Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          background: 'rgba(255,255,255,0.04)',
          padding: '6px 12px',
          borderRadius: '20px',
          border: '1px solid var(--border-color)'
        }}>
          <Activity size={14} color="var(--accent-green)" />
          <span>7 Atomic MCP Tools Active</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          background: 'rgba(79, 172, 254, 0.08)',
          padding: '6px 12px',
          borderRadius: '20px',
          border: '1px solid var(--border-color-glow)'
        }}>
          <Cloud size={14} color="var(--accent-blue)" />
          <span>Postgres + pgvector</span>
        </div>
      </div>
    </nav>
  );
};
