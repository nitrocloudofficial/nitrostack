'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export default function MetricsWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#f3f4f6' : '#1f2937';
  const cardColor = isDark ? '#2d3748' : '#f9fafb';
  const borderColor = isDark ? '#4a5568' : '#e5e7eb';

  if (!rawData) {
    return <div style={{ padding: '16px', color: '#888' }}>Loading Metrics Data...</div>;
  }

  const data = rawData.data;

  // Helper to determine status color based on usage percent
  const getStatusColor = (val: number, isPercent = true) => {
    const limit = isPercent ? 80 : 1000;
    if (val >= limit) return '#ef4444'; // Red (Danger)
    if (val >= limit * 0.7) return '#fbbf24'; // Yellow (Warning)
    return '#10b981'; // Green (Healthy)
  };

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <span style={{ fontSize: '24px' }}>📊</span>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Metrics Operations Output</h3>
      </div>

      {data && typeof data === 'object' && (
        <div style={{
          background: cardColor,
          padding: '20px',
          borderRadius: '10px',
          border: `1px solid ${borderColor}`,
          textAlign: 'center'
        }}>
          {'usagePercent' in data && (
            <div>
              <div style={{ fontSize: '14px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Resource Utilization
              </div>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                margin: '12px 0',
                color: getStatusColor(data.usagePercent)
              }}>
                {data.usagePercent}%
              </div>
              <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'center', gap: '8px', opacity: 0.8 }}>
                <span>Trend:</span>
                <span style={{ fontWeight: 600, color: data.trend === 'increasing' ? '#ef4444' : '#10b981' }}>
                  {data.trend}
                </span>
              </div>
            </div>
          )}

          {'ratePercent' in data && (
            <div>
              <div style={{ fontSize: '14px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Transaction Error Rate
              </div>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                margin: '12px 0',
                color: getStatusColor(data.ratePercent)
              }}>
                {data.ratePercent}%
              </div>
              <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'center', gap: '8px', opacity: 0.8 }}>
                <span>Trend:</span>
                <span style={{ fontWeight: 600, color: data.trend === 'spiking' || data.trend === 'increasing' ? '#ef4444' : '#10b981' }}>
                  {data.trend}
                </span>
              </div>
            </div>
          )}

          {'p95Ms' in data && (
            <div>
              <div style={{ fontSize: '14px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Latency (p95 Response Time)
              </div>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                margin: '12px 0',
                color: getStatusColor(data.p95Ms, false)
              }}>
                {data.p95Ms} ms
              </div>
              <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'center', gap: '8px', opacity: 0.8 }}>
                <span>Trend:</span>
                <span style={{ fontWeight: 600, color: data.trend === 'degrading' ? '#ef4444' : '#10b981' }}>
                  {data.trend}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {data && typeof data !== 'object' && (
        <div style={{
          background: cardColor,
          padding: '16px',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
          textAlign: 'center',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          {String(data)}
        </div>
      )}
    </div>
  );
}
