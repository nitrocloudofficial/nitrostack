'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Activity, Dna, Siren, Zap, MessageSquare } from 'lucide-react';

interface SidebarProps {
  currentView: 'dashboard' | 'stream' | 'genome' | 'interventions';
  onNavigate: (view: 'dashboard' | 'stream' | 'genome' | 'interventions') => void;
  activeAlertsCount: number;
  isStreaming: boolean;
  onToggleStreaming: () => void;
  onSimulateEvent: () => void;
  onToggleChat: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  activeAlertsCount,
  isStreaming,
  onToggleStreaming,
  onSimulateEvent,
  onToggleChat,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Executive Heatmap',
      icon: <LayoutDashboard size={18} />,
      badge: null,
    },
    {
      id: 'stream',
      label: 'Live Telemetry Stream',
      icon: <Activity size={18} />,
      badge: isStreaming ? 'LIVE' : 'PAUSED',
      badgeColor: isStreaming ? '#00E5FF' : '#3B82F6',
    },
    {
      id: 'genome',
      label: 'Genome Management',
      icon: <Dna size={18} />,
      badge: '5 OKRs',
    },
    {
      id: 'interventions',
      label: 'Nudge & Interventions',
      icon: <Siren size={18} />,
      badge: activeAlertsCount > 0 ? `${activeAlertsCount} Alert${activeAlertsCount > 1 ? 's' : ''}` : null,
      badgeColor: '#EF4444',
    },
  ];

  return (
    <motion.aside 
      initial={{ x: -260, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        width: '260px',
        minWidth: '260px',
        backgroundColor: '#050505',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        userSelect: 'none',
      }}
    >
      {/* Brand Header */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <motion.div 
          whileHover={{ scale: 1.05, rotate: 90 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00E5FF 0%, #38BDF8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 1 6.36 15.36" />
            <path d="M12 3a9 9 0 0 0-6.36 15.36" />
            <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
          </svg>
        </motion.div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '1px', color: '#FFFFFF' }}>HELIX</span>
            <span style={{
              fontSize: '9px',
              fontWeight: 700,
              padding: '2px 5px',
              borderRadius: '4px',
              backgroundColor: 'rgba(0, 229, 255, 0.15)',
              color: '#38BDF8',
              border: '1px solid rgba(0, 229, 255, 0.3)',
            }}>AI</span>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: '#A1A1AA', fontWeight: 500 }}>RedSun Intelligence</p>
        </div>
      </div>

      {/* Live Stream Telemetry Indicator */}
      <motion.div 
        whileHover={{ scale: 1.02 }}
        style={{
          margin: '16px 16px 8px 16px',
          padding: '12px 14px',
          borderRadius: '12px',
          backgroundColor: 'rgba(15, 15, 15, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="live-pulse" style={{ backgroundColor: isStreaming ? '#00E5FF' : '#3B82F6' }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF' }}>
            {isStreaming ? 'Telemetry Active' : 'Stream Paused'}
          </span>
        </div>
        <button
          onClick={onToggleStreaming}
          style={{
            background: 'none',
            border: 'none',
            color: '#38BDF8',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 229, 255, 0.1)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {isStreaming ? 'Pause' : 'Resume'}
        </button>
      </motion.div>

      {/* Navigation Menu */}
      <div style={{ padding: '12px 10px', flex: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 10px 12px 10px' }}>
          Menu
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item, i) => {
            const isActive = currentView === item.id;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 + 0.3 }}
                onClick={() => onNavigate(item.id as any)}
                whileHover={{ scale: 1.02, backgroundColor: isActive ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)' }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid transparent',
                  backgroundColor: isActive ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#A1A1AA',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: isActive ? '0 0 15px rgba(0, 229, 255, 0.1)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: isActive ? '#38BDF8' : '#52525B' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    backgroundColor: item.badgeColor ? `${item.badgeColor}22` : 'rgba(255, 255, 255, 0.05)',
                    color: item.badgeColor || '#A1A1AA',
                    border: `1px solid ${item.badgeColor ? `${item.badgeColor}44` : 'transparent'}`,
                  }}>
                    {item.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>
        
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: '1px', padding: '24px 10px 12px 10px' }}>
          AI Tools
        </div>
        <motion.button
          onClick={onToggleChat}
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(37, 99, 235, 0.15)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(37, 99, 235, 0.3)',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: '0 0 15px rgba(37, 99, 235, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#60A5FA' }}>
              <MessageSquare size={18} />
            </span>
            <span>Helix AI Inspector</span>
          </div>
        </motion.button>
      </div>

      {/* Simulator Quick Trigger Action */}
      <div style={{ padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.03)' }}>
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(0, 229, 255, 0.3)' }}
          whileTap={{ scale: 0.98 }}
          onClick={onSimulateEvent}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(255, 102, 51, 0.1) 100%)',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            color: '#38BDF8',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}
        >
          <Zap size={16} />
          Inject Signal Event
        </motion.button>
      </div>

      {/* Footer Info */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.03)',
        backgroundColor: '#030303',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: '#111',
          border: '1px solid #222',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 800,
          color: '#38BDF8',
        }}>
          CX
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            Executive Operations
          </div>
          <div style={{ fontSize: '11px', color: '#52525B', fontWeight: 500 }}>
            Enterprise Tenant #8402
          </div>
        </div>
      </div>
    </motion.aside>
  );
};
