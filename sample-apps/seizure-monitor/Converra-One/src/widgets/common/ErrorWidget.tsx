'use client';

import React from 'react';

interface ErrorWidgetProps {
  title?: string;
  message?: string;
  errorCode?: string;
  onRetry?: () => void;
  height?: string;
}

export const ErrorWidget: React.FC<ErrorWidgetProps> = ({
  title = 'System Boundary Error',
  message = 'An unexpected issue occurred while executing the MCP tool pipeline.',
  errorCode = 'ERR_MCP_WIDGET_TIMEOUT',
  onRetry,
  height = '220px'
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height,
        width: '100%',
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: '16px',
        padding: '24px',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          fontSize: '28px',
          marginBottom: '10px'
        }}
      >
        ⚠️
      </div>
      <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 600, color: '#fca5a5' }}>
        {title}
      </h4>
      <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#cbd5e1', maxWidth: '400px' }}>
        {message}
      </p>
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          background: 'rgba(0, 0, 0, 0.4)',
          color: '#f87171',
          padding: '4px 10px',
          borderRadius: '6px',
          marginBottom: '14px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}
      >
        Code: {errorCode}
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#fef2f2',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          🔄 Retry MCP Workflow
        </button>
      )}
    </div>
  );
};
