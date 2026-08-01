'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export default function JiraWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#f3f4f6' : '#1f2937';
  const cardColor = isDark ? '#2d3748' : '#f4f5f7';
  const borderColor = isDark ? '#4a5568' : '#e5e7eb';

  if (!rawData) {
    return <div style={{ padding: '16px', color: '#888' }}>Loading Jira Ticket Data...</div>;
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
      maxWidth: '450px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '24px' }}>🎫</span>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Jira Operations Output</h3>
      </div>

      <div style={{
        background: cardColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '16px',
        position: 'relative'
      }}>
        {/* Ticket Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#0052cc',
            fontFamily: 'monospace'
          }}>
            {data.ticketId}
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 8px',
            background: data.status === 'To Do' ? '#deebff' : '#e3fcef',
            color: data.status === 'To Do' ? '#0747a6' : '#006644',
            borderRadius: '3px'
          }}>
            {data.status}
          </span>
        </div>

        {/* Ticket Title */}
        <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
          {data.title || 'Incident Ticket Created'}
        </div>

        {/* Ticket Details */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>Severity:</span>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 6px',
              background: data.severity === 'SEV-1' ? '#ffebe6' : '#fffae6',
              color: data.severity === 'SEV-1' ? '#bf2600' : '#8f7700',
              borderRadius: '3px'
            }}>
              {data.severity || 'SEV-2'}
            </span>
          </div>

          {data.url && (
            <a href={data.url} target="_blank" rel="noreferrer" style={{
              fontSize: '12px',
              color: '#0052cc',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              View Ticket ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
