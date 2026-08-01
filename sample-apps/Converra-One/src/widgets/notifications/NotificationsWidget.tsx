'use client';

import React, { useState } from 'react';
import { MOCK_NOTIFICATIONS } from '../mockData';
import { Notification } from '../../shared/interfaces/Notification.interface';


function formatTimeString(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export interface NotificationsWidgetProps {
  notifications?: Notification[];
  onMarkAllRead?: () => void;
}

export const NotificationsWidget: React.FC<NotificationsWidgetProps> = ({
  notifications = MOCK_NOTIFICATIONS,
  onMarkAllRead
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = notifications.filter(n => filter === 'all' || !n.isRead);

  return (
    <div
      style={{
        background: 'rgba(19, 25, 39, 0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '20px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🔔</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
              Notifications & System Alerts
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Real-time workspace alerts and AI agent notification triggers
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Filter: {filter.toUpperCase()}
          </button>
          {onMarkAllRead && (
            <button
              onClick={onMarkAllRead}
              style={{
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: '#38bdf8',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Mark All Read
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map((n) => (
          <div
            key={n.id}
            style={{
              background: n.isRead ? 'rgba(255, 255, 255, 0.02)' : 'rgba(56, 189, 248, 0.05)',
              border: n.isRead ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>
                {n.priority === 'URGENT' ? '🚨' : n.priority === 'HIGH' ? '⚠️' : 'ℹ️'}
              </span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: n.isRead ? 600 : 700, color: '#f1f5f9' }}>
                  {n.title}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  {n.body}
                </div>
              </div>
            </div>

            <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>
              {formatTimeString(n.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
