'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export default function SlackWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#f3f4f6' : '#1f2937';
  const cardColor = isDark ? '#222529' : '#f8f9fa';
  const borderColor = isDark ? '#4a5568' : '#e5e7eb';

  if (!rawData) {
    return <div style={{ padding: '16px', color: '#888' }}>Loading Slack Alert Data...</div>;
  }

  const data = rawData.data || {};

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
        <span style={{ fontSize: '24px' }}>💬</span>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Slack Operations Output</h3>
      </div>

      <div style={{
        background: cardColor,
        border: '1px solid #4a154b', // Slack aubergine color border accent
        borderLeft: '4px solid #4a154b',
        borderRadius: '8px',
        padding: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          {/* Mock Slack Avatar */}
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '4px',
            background: 'linear-gradient(135deg, #ecb22e 0%, #2eb67d 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            DS
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>DeploySense AI Bot</span>
              <span style={{ fontSize: '10px', padding: '1px 4px', background: '#e8e8e8', color: '#444', borderRadius: '3px', fontWeight: 600 }}>APP</span>
            </div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>
              Sent to: <span style={{ color: '#4a154b', fontWeight: 'bold' }}>{data.channel || '#incidents'}</span>
            </div>
          </div>
        </div>

        <div style={{
          fontSize: '13px',
          lineHeight: '1.5',
          fontStyle: 'italic',
          background: isDark ? '#111' : '#fff',
          padding: '10px',
          borderRadius: '6px',
          border: `1px solid ${borderColor}`,
          color: isDark ? '#d1d5db' : '#374151'
        }}>
          "Incident Commander alert sent successfully."
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '11px', opacity: 0.7 }}>
          <span>Status: <strong style={{ color: '#10b981' }}>SUCCESS</strong></span>
          <span>{data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
