'use client';

import React from 'react';

interface LoadingWidgetProps {
  message?: string;
  height?: string;
}

export const LoadingWidget: React.FC<LoadingWidgetProps> = ({
  message = 'Converra AI Agents Syncing Workspace...',
  height = '200px'
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height,
        width: '100%',
        background: 'rgba(19, 25, 39, 0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '24px',
        color: '#94a3b8',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ position: 'relative', width: '48px', height: '48px', marginBottom: '16px' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid rgba(56, 189, 248, 0.2)',
            borderTopColor: '#38bdf8',
            animation: 'converraSpin 1s linear infinite'
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '6px',
            borderRadius: '50%',
            border: '3px solid rgba(99, 102, 241, 0.2)',
            borderBottomColor: '#6366f1',
            animation: 'converraSpinReverse 1.4s linear infinite'
          }}
        />
      </div>
      <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>{message}</p>
      <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
        <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>🤖 Priority Agent</span>
        <span style={{ fontSize: '11px', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>⚡ MCP Pipeline</span>
      </div>

      <style>{`
        @keyframes converraSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes converraSpinReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};
