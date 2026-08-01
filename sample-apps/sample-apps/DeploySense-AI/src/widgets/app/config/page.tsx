'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export default function ConfigWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#f3f4f6' : '#1f2937';
  const cardColor = isDark ? '#2d3748' : '#f9fafb';
  const borderColor = isDark ? '#4a5568' : '#e5e7eb';

  if (!rawData) {
    return <div style={{ padding: '16px', color: '#888' }}>Loading Configuration Data...</div>;
  }

  // Handle getActiveScenario payload vs getEnvVariables payload
  const isScenarioInfo = rawData.data && 'activeScenario' in rawData.data;

  if (isScenarioInfo) {
    return (
      <div style={{
        padding: '20px',
        background: bgColor,
        color: textColor,
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '12px',
        border: `1px solid ${borderColor}`,
        maxWidth: '500px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '24px' }}>⚙️</span>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Active Simulation Scenario</h3>
        </div>
        <div style={{
          background: cardColor,
          padding: '16px',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
          fontSize: '16px',
          fontWeight: 600,
          color: '#3b82f6',
          textAlign: 'center'
        }}>
          {rawData.data.activeScenario.toUpperCase()}
        </div>
      </div>
    );
  }

  const configData = rawData.data || {};
  const variables = configData.variables || {};
  const missingVariables = configData.missingVariables || [];

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
        <span style={{ fontSize: '24px' }}>⚙️</span>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Configuration MCP Output</h3>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '13px' }}>
        <div><strong>Service:</strong> <span style={{ fontFamily: 'monospace' }}>{configData.serviceName}</span></div>
        <div><strong>Environment:</strong> <span style={{ textTransform: 'capitalize' }}>{configData.environment}</span></div>
      </div>

      {missingVariables.length > 0 && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          color: '#b91c1c',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px',
          fontWeight: 500
        }}>
          ⚠️ Warning: Missing required variables: {missingVariables.join(', ')}
        </div>
      )}

      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px',
        textAlign: 'left'
      }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${borderColor}`, opacity: 0.8 }}>
            <th style={{ padding: '8px 12px' }}>Variable Key</th>
            <th style={{ padding: '8px 12px' }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(variables).map(([key, val]: any, idx: number) => {
            const isMissing = val === null || val === undefined;
            return (
              <tr key={idx} style={{ 
                borderBottom: `1px solid ${borderColor}`,
                background: isMissing ? '#fee2e2' : 'transparent',
                color: isMissing ? '#b91c1c' : textColor
              }}>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{key}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>
                  {isMissing ? 'NULL (Missing)' : val}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
