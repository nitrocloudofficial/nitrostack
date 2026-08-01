'use client';

import React from 'react';

export type NavTab = 'dashboard' | 'inbox' | 'tasks' | 'calendar' | 'search' | 'notifications' | 'settings';

export interface SidebarWidgetProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  unreadCount?: number;
  taskCount?: number;
  notificationCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const SidebarWidget: React.FC<SidebarWidgetProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 4,
  taskCount = 3,
  notificationCount = 2,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const navItems: { id: NavTab; label: string; icon: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '⚡' },
    { id: 'inbox', label: 'Unified Inbox', icon: '📥', badge: unreadCount },
    { id: 'tasks', label: 'Tasks', icon: '📋', badge: taskCount },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside
      style={{
        width: isCollapsed ? '72px' : '260px',
        height: '100vh',
        background: 'linear-gradient(180deg, #0d1322 0%, #080c16 100%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: isCollapsed ? '20px 10px' : '20px 16px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxSizing: 'border-box',
        userSelect: 'none',
        zIndex: 100
      }}
    >
      {/* Brand Header & Futuristic Toggle */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            paddingBottom: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '18px',
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
                flexShrink: 0
              }}
            >
              C
            </div>
            {!isCollapsed && (
              <div>
                <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                  Converra One
                </h1>
                <span style={{ fontSize: '10px', color: '#06b6d4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  NitroStack AI Studio
                </span>
              </div>
            )}
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              style={{
                position: 'relative',
                background: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                borderRadius: '8px',
                width: '28px',
                height: '28px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.25)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.25)';
                e.currentTarget.style.boxShadow = '0 0 18px rgba(56, 189, 248, 0.5)';
                e.currentTarget.style.borderColor = '#38bdf8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.25)';
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                ◀
              </span>
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'space-between',
                  width: '100%',
                  padding: isCollapsed ? '12px' : '10px 14px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(56, 189, 248, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)'
                    : 'transparent',
                  color: isActive ? '#f8fafc' : '#94a3b8',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
                {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    style={{
                      background: isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                      color: isActive ? '#0f172a' : '#cbd5e1',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Workspace Status Footer */}
      <div
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: '10px'
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 10px #10b981',
            flexShrink: 0
          }}
        />
        {!isCollapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap' }}>
              Converra One Studio
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>
              Connected to MCP Engine
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
