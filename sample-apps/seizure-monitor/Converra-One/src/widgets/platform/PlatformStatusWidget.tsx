'use client';

import React from 'react';
import { MOCK_PLATFORM_CONNECTIONS, PlatformConnection } from '../mockData';

export interface PlatformStatusWidgetProps {
  connections?: PlatformConnection[];
  onRefreshPlatform?: (platformName: string) => void;
}

export const PlatformStatusWidget: React.FC<PlatformStatusWidgetProps> = ({
  connections = MOCK_PLATFORM_CONNECTIONS,
  onRefreshPlatform
}) => {
  const getStatusBadge = (status: PlatformConnection['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
            ● Connected
          </span>
        );
      case 'syncing':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
            🔄 Syncing...
          </span>
        );
      case 'disconnected':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
            ○ Disconnected
          </span>
        );
    }
  };

  return (
    <div
      style={{
        background: 'rgba(19, 25, 39, 0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '20px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🌐</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
              Platform Connection Status
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Real-time MCP connector bridge status across integrated communication platforms
            </p>
          </div>
        </div>
        <span style={{ fontSize: '11px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          6 Connectors Active
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px'
        }}
      >
        {connections.map((item) => (
          <div
            key={item.name}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease, border-color 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  {item.account}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              {getStatusBadge(item.status)}
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                Synced {item.lastSync}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
