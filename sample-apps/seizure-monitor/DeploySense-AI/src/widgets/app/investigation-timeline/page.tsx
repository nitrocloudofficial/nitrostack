'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export default function InvestigationTimeline() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#f3f4f6' : '#1f2937';
  const cardColor = isDark ? '#2d3748' : '#f9fafb';
  const borderColor = isDark ? '#4a5568' : '#e5e7eb';

  // Fallback default timeline events if tool hasn't run yet
  const defaultEvents = [
    { time: '10:00 AM', text: 'Deployment Completed', status: 'success' },
    { time: '10:05 AM', text: 'Users Report Problems', status: 'error' },
    { time: '10:10 AM', text: 'Incident Commander Receives Goal: "What information do I need?"', status: 'info' },
  ];

  const events = rawData?.reasoningSteps || defaultEvents;
  const confidence = rawData?.confidence || null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'error': return '#ef4444';
      case 'success': return '#10b981';
      case 'warning': return '#fbbf24';
      case 'info':
      default: return '#3b82f6';
    }
  };

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      color: textColor,
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '12px',
      border: `1px solid ${borderColor}`,
      maxWidth: '650px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>⏳</span>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Incident Investigation Timeline</h2>
        </div>

        {confidence !== null && (
          <div style={{
            background: confidence >= 90 ? '#d1fae5' : '#fef3c7',
            color: confidence >= 90 ? '#065f46' : '#92400e',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 700
          }}>
            Confidence: {confidence}%
          </div>
        )}
      </div>

      <div style={{ position: 'relative', paddingLeft: '16px' }}>
        {/* Central Timeline Line */}
        <div style={{
          position: 'absolute',
          left: '23px',
          top: '8px',
          bottom: '8px',
          width: '2px',
          background: borderColor,
          zIndex: 1
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {events.map((event: any, index: number) => (
            <div key={index} style={{
              display: 'flex',
              gap: '16px',
              position: 'relative',
              zIndex: 2
            }}>
              {/* Timeline Indicator Dot */}
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: getStatusColor(event.status),
                border: `3px solid ${bgColor}`,
                marginTop: '4px',
                boxShadow: '0 0 0 2px rgba(0,0,0,0.05)'
              }} />

              {/* Event Content */}
              <div style={{
                flex: 1,
                background: cardColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{ fontSize: '14px', lineHeight: '1.4', fontWeight: event.status === 'success' || event.status === 'error' ? 600 : 500 }}>
                  {event.text}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#888',
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap'
                }}>
                  {event.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
