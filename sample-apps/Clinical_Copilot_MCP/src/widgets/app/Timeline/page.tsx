'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface TimelineEvent {
  eventId: string;
  timestamp: string;
  category: string;
  title: string;
  description: string;
  provider?: string;
  code?: string;
}

interface TimelineData {
  patientId: string;
  events: TimelineEvent[];
}

/**
 * Clinical Copilot - Timeline Widget
 *
 * Renders an interactive chronological timeline of medical diagnoses, procedures, and lab events.
 */
export default function TimelineWidget() {
  const theme = useTheme();
  const { getToolOutput, isReady } = useWidgetSDK();
  const data = getToolOutput<TimelineData>();

  if (!isReady) {
    return <div style={{ padding: '16px', textAlign: 'center' }}>Connecting to host...</div>;
  }

  if (!data || !data.events) {
    return <div style={{ padding: '16px', textAlign: 'center' }}>No timeline events found.</div>;
  }

  const isDark = theme === 'dark';

  return (
    <div style={{
      padding: '20px',
      borderRadius: '12px',
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f8fafc' : '#0f172a',
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '480px',
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
        📅 Clinical History Timeline (Patient {data.patientId})
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.events.map((evt) => (
          <div key={evt.eventId} style={{
            padding: '12px',
            borderRadius: '8px',
            background: isDark ? '#0f172a' : '#f8fafc',
            borderLeft: `4px solid ${
              evt.category === 'DIAGNOSIS' ? '#ef4444' :
              evt.category === 'MEDICATION' ? '#3b82f6' :
              evt.category === 'LAB_RESULT' ? '#10b981' : '#8b5cf6'
            }`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
              <span>{new Date(evt.timestamp).toLocaleDateString()}</span>
              <span>{evt.category}</span>
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{evt.title}</div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>{evt.description}</div>
            {evt.provider && <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>By: {evt.provider}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
