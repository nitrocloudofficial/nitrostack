'use client';

import React from 'react';

interface EmptyStateWidgetProps {
  icon?: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  height?: string;
}

export const EmptyStateWidget: React.FC<EmptyStateWidgetProps> = ({
  icon = '✨',
  title,
  description,
  actionText,
  onAction,
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
        background: 'rgba(19, 25, 39, 0.5)',
        border: '1px dashed rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        padding: '32px 24px',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: 'rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '26px',
          marginBottom: '14px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {icon}
      </div>
      <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
        {title}
      </h4>
      <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#94a3b8', maxWidth: '380px', lineHeight: 1.5 }}>
        {description}
      </p>
      {actionText && (
        <button
          onClick={onAction}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            color: '#ffffff',
            border: 'none',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            transition: 'transform 0.2s ease, opacity 0.2s ease'
          }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
