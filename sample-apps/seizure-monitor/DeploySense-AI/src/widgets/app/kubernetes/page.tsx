'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export default function KubernetesWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#f3f4f6' : '#1f2937';
  const cardColor = isDark ? '#2d3748' : '#f9fafb';
  const borderColor = isDark ? '#4a5568' : '#e5e7eb';

  if (!rawData) {
    return <div style={{ padding: '16px', color: '#888' }}>Loading Kubernetes Data...</div>;
  }

  const data = rawData.data;

  // Render pod status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running': return { bg: '#d1fae5', text: '#047857' };
      case 'CrashLoopBackOff': return { bg: '#fee2e2', text: '#b91c1c' };
      case 'OOMKilled': return { bg: '#ffedd5', text: '#c2410c' };
      default: return { bg: '#f3f4f6', text: '#4b5563' };
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
      maxWidth: '600px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '24px' }}>☸️</span>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Kubernetes Operations Output</h3>
      </div>

      {data && 'status' in data && (
        <div>
          <h4 style={{ fontSize: '14px', color: '#3b82f6', margin: '0 0 10px 0' }}>Pod Status</h4>
          <div style={{
            background: cardColor,
            padding: '16px',
            borderRadius: '8px',
            border: `1px solid ${borderColor}`
          }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'monospace' }}>
              {data.name}
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
              <div style={{ flex: '1 1 120px' }}>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>Status</div>
                <div style={{ display: 'inline-block', marginTop: '4px' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: getStatusColor(data.status).bg,
                    color: getStatusColor(data.status).text
                  }}>
                    {data.status}
                  </span>
                </div>
              </div>

              <div style={{ flex: '1 1 120px' }}>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>Restarts</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px', color: data.restarts > 0 ? '#ef4444' : textColor }}>
                  {data.restarts}
                </div>
              </div>

              <div style={{ flex: '1 1 120px' }}>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>Worker Node</div>
                <div style={{ fontSize: '14px', marginTop: '4px', fontFamily: 'monospace' }}>
                  {data.node}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {data && 'replicas' in data && (
        <div>
          <h4 style={{ fontSize: '14px', color: '#10b981', margin: '0 0 10px 0' }}>Deployment Status</h4>
          <div style={{
            background: cardColor,
            padding: '16px',
            borderRadius: '8px',
            border: `1px solid ${borderColor}`
          }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'monospace' }}>
              {data.name}
            </div>

            <div style={{ display: 'flex', gap: '24px', marginTop: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>Replicas</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>{data.replicas}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>Available</div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  marginTop: '4px',
                  color: data.availableReplicas < data.replicas ? '#ef4444' : '#10b981'
                }}>
                  {data.availableReplicas} / {data.replicas}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {data && typeof data === 'number' && (
        <div style={{
          background: cardColor,
          padding: '16px',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>Restart Count</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: data > 0 ? '#ef4444' : '#10b981', marginTop: '8px' }}>
            {data}
          </div>
        </div>
      )}

      {!data && (
        <div style={{
          background: cardColor,
          padding: '16px',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
          textAlign: 'center',
          color: '#ef4444'
        }}>
          No Kubernetes Resources Found for this query.
        </div>
      )}
    </div>
  );
}
