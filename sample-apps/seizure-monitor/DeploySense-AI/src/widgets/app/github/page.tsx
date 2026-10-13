'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export default function GithubWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#f3f4f6' : '#1f2937';
  const cardColor = isDark ? '#2d3748' : '#f9fafb';
  const borderColor = isDark ? '#4a5568' : '#e5e7eb';

  if (!rawData) {
    return <div style={{ padding: '16px', color: '#888' }}>Loading GitHub Data...</div>;
  }

  const data = rawData.data;

  return (
    <div style={{
      padding: '20px',
      background: bgColor,
      color: textColor,
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '12px',
      border: `1px solid ${borderColor}`,
      maxWidth: '600px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '24px' }}>🐙</span>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>GitHub Operations Output</h3>
      </div>

      {Array.isArray(data) && data.length > 0 && 'hash' in data[0] && (
        <div>
          <h4 style={{ fontSize: '14px', color: '#4f46e5', margin: '0 0 10px 0' }}>Recent Commits</h4>
          {data.map((commit: any, idx: number) => (
            <div key={idx} style={{
              background: cardColor,
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${borderColor}`,
              marginBottom: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'monospace', background: '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                  {commit.hash.slice(0, 7)}
                </span>
                <span style={{ fontSize: '12px', opacity: 0.7 }}>
                  {new Date(commit.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{commit.message}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>By: {commit.author}</div>
            </div>
          ))}
        </div>
      )}

      {Array.isArray(data) && data.length > 0 && 'filename' in data[0] && (
        <div>
          <h4 style={{ fontSize: '14px', color: '#10b981', margin: '0 0 10px 0' }}>Changed Files</h4>
          {data.map((file: any, idx: number) => (
            <div key={idx} style={{
              background: cardColor,
              padding: '10px 14px',
              borderRadius: '8px',
              border: `1px solid ${borderColor}`,
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: '500', fontFamily: 'monospace' }}>{file.filename}</span>
                <span style={{ fontSize: '11px', marginLeft: '8px', padding: '2px 6px', borderRadius: '4px', background: file.status === 'modified' ? '#fef3c7' : '#d1fae5', color: file.status === 'modified' ? '#b45309' : '#047857' }}>
                  {file.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                <span style={{ color: '#10b981', fontWeight: 600 }}>+{file.additions}</span>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>-{file.deletions}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {(!Array.isArray(data) || data.length === 0) && (
        <div style={{ background: cardColor, padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
          <pre style={{ margin: 0, fontSize: '12px', overflowX: 'auto', fontFamily: 'monospace' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
