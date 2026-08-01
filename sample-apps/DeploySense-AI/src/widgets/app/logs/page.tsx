'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export default function LogsWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#f3f4f6' : '#1f2937';
  const borderColor = isDark ? '#4a5568' : '#e5e7eb';

  if (!rawData) {
    return <div style={{ padding: '16px', color: '#888' }}>Loading Logs Data...</div>;
  }

  const logs = rawData.data || [];

  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'ERROR': return { color: '#ef4444', fontWeight: 'bold' };
      case 'FATAL': return { color: '#f87171', fontWeight: 'bold', textDecoration: 'underline' };
      case 'WARN': return { color: '#fbbf24', fontWeight: 'bold' };
      case 'INFO': return { color: '#34d399' };
      default: return { color: '#9ca3af' };
    }
  };

  return (
    <div style={{
      padding: '20px',
      background: bgColor,
      color: textColor,
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '12px',
      border: `1px solid ${borderColor}`,
      maxWidth: '700px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '24px' }}>📋</span>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>System Logs Output</h3>
      </div>

      <div style={{
        background: '#0d1117',
        color: '#c9d1d9',
        padding: '16px',
        borderRadius: '8px',
        fontFamily: 'Courier New, Courier, monospace',
        fontSize: '13px',
        lineHeight: '1.6',
        maxHeight: '400px',
        overflowY: 'auto',
        border: '1px solid #30363d'
      }}>
        {logs.length === 0 ? (
          <div style={{ color: '#8b949e', textAlign: 'center', padding: '20px' }}>No logs match the query.</div>
        ) : (
          logs.map((log: any, idx: number) => (
            <div key={idx} style={{ 
              marginBottom: '10px',
              borderBottom: '1px solid #21262d',
              paddingBottom: '8px',
              wordBreak: 'break-word'
            }}>
              <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>
                <span>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span style={{ color: '#58a6ff' }}>{log.service}</span>
                <span style={getLevelStyle(log.level)}>{log.level}</span>
                {log.traceId && <span style={{ color: '#8b949e' }}>({log.traceId})</span>}
              </div>
              <div style={{ color: log.level === 'FATAL' || log.level === 'ERROR' ? '#f85149' : '#e6edf2' }}>
                {log.message}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
