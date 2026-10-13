'use client';

import React from 'react';

export interface TopNavWidgetProps {
  workspaceName?: string;
  onSearchClick?: () => void;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
  notificationCount?: number;
}

export const TopNavWidget: React.FC<TopNavWidgetProps> = ({
  workspaceName = 'Converra AI Workspace',
  onSearchClick,
  onNotificationsClick,
  onProfileClick,
  notificationCount = 2
}) => {
  return (
    <header
      style={{
        height: '64px',
        width: '100%',
        background: 'rgba(13, 19, 34, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        boxSizing: 'border-box',
        zIndex: 90
      }}
    >
      {/* Workspace Name & AI Pulse */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <span style={{ fontSize: '14px' }}>🏢</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{workspaceName}</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#34d399'
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981'
            }}
          />
          Multi-Agent MCP Engine Online
        </div>
      </div>

      {/* Universal Search Bar */}
      <div
        onClick={onSearchClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          padding: '8px 16px',
          width: '380px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <span style={{ fontSize: '14px', color: '#64748b' }}>🔍</span>
        <span style={{ fontSize: '13px', color: '#94a3b8', flexGrow: 1 }}>
          Ask Converra AI... (e.g. &quot;What did my professor say?&quot;)
        </span>
        <kbd
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#cbd5e1',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '10px',
            fontFamily: 'monospace'
          }}
        >
          ⌘K
        </kbd>
      </div>

      {/* Action Controls & Profile Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Notification Bell */}
        <button
          onClick={onNotificationsClick}
          style={{
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#cbd5e1',
            borderRadius: '10px',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🔔
          {notificationCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {notificationCount}
            </span>
          )}
        </button>

        {/* Profile Avatar Button */}
        <button
          onClick={onProfileClick}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
            alt="Profile Menu"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '2px solid rgba(56, 189, 248, 0.5)'
            }}
          />
        </button>
      </div>
    </header>
  );
};
