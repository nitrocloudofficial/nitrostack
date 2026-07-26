import React from 'react';
import { Cpu, Activity, Terminal, Zap, Layers } from 'lucide-react';

interface HeaderProps {
  activeTab: 'command' | 'investigation' | 'workorders' | 'demolab';
  setActiveTab: (tab: 'command' | 'investigation' | 'workorders' | 'demolab') => void;
  isBackendLive: boolean;
  setIsBackendLive: (live: boolean) => void;
  activeScenarioTitle?: string;
  onQuickSimulate: (scenarioId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isBackendLive,
  setIsBackendLive,
  activeScenarioTitle,
  onQuickSimulate,
}) => {
  return (
    <header className="header-bar">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand & SDK Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
              padding: '0.45rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(14, 116, 144, 0.25)'
            }}>
              <Cpu size={22} color="#ffffff" />
            </div>
            <div>
              <h1 className="logo-tag">ForgeMind</h1>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>Autonomous Factory Diagnostics</span>
              </div>
            </div>
          </div>

          <div style={{ height: '24px', width: '1px', background: 'var(--border-color)' }} />

          <span className="badge-nitro">
            <Zap size={13} />
            NitroStack SDK MCP
          </span>

          <div className="status-pill healthy" title="45s Correlation Windowing Active">
            <Activity size={12} />
            45s Windowing
          </div>
        </div>

        {/* Quick Scenario Triggers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Terminal size={12} color="var(--primary)" /> Demo Scenarios:
          </span>
          <button
            onClick={() => onQuickSimulate('bearing_fault')}
            className="btn-outline"
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderColor: 'rgba(255, 51, 102, 0.4)', color: '#ff6688' }}
          >
            🔴 Bearing Fault
          </button>
          <button
            onClick={() => onQuickSimulate('thermal_overheat')}
            className="btn-outline"
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderColor: 'rgba(255, 183, 0, 0.4)', color: '#ffcc00' }}
          >
            🟠 Overheat
          </button>
          <button
            onClick={() => onQuickSimulate('conveyor_jam')}
            className="btn-outline"
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderColor: 'rgba(168, 85, 247, 0.4)', color: '#c084fc' }}
          >
            🟡 Conveyor Jam
          </button>
        </div>

        {/* System Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div
            onClick={() => setIsBackendLive(!isBackendLive)}
            style={{
              cursor: 'pointer',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.7rem',
              borderRadius: '6px',
              background: isBackendLive ? 'rgba(0, 255, 157, 0.1)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${isBackendLive ? 'rgba(0, 255, 157, 0.3)' : 'var(--border-color)'}`,
            }}
            title="Click to toggle between Standalone Mock Engine and Live NitroStack MCP Backend Server"
          >
            <div className={`live-dot ${isBackendLive ? '' : 'warning'}`} />
            <span style={{ color: isBackendLive ? 'var(--emerald)' : 'var(--text-muted)', fontWeight: 600 }}>
              {isBackendLive ? 'NitroStack MCP: Connected' : 'Simulated Gateway (Offline Mode)'}
            </span>
          </div>
        </div>

      </div>

      {/* Main Tab Navigation Bar */}
      <nav style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
        <button
          className={`nav-tab-button ${activeTab === 'command' ? 'active' : ''}`}
          onClick={() => setActiveTab('command')}
        >
          <Activity size={16} />
          Command Center (Machine Radar)
        </button>

        <button
          className={`nav-tab-button ${activeTab === 'investigation' ? 'active' : ''}`}
          onClick={() => setActiveTab('investigation')}
        >
          <Cpu size={16} />
          AI Investigation & Verification Chain
          {activeScenarioTitle && (
            <span style={{
              fontSize: '0.65rem',
              background: 'var(--primary)',
              color: '#ffffff',
              padding: '0.1rem 0.4rem',
              borderRadius: '4px',
              fontWeight: 800,
              marginLeft: '0.3rem'
            }}>
              ACTIVE
            </span>
          )}
        </button>

        <button
          className={`nav-tab-button ${activeTab === 'workorders' ? 'active' : ''}`}
          onClick={() => setActiveTab('workorders')}
        >
          <Layers size={16} />
          Work Orders & Impact
        </button>

        <button
          className={`nav-tab-button ${activeTab === 'demolab' ? 'active' : ''}`}
          onClick={() => setActiveTab('demolab')}
        >
          <Terminal size={16} />
          Demo Lab & Fault Injection
        </button>
      </nav>
    </header>
  );
};
