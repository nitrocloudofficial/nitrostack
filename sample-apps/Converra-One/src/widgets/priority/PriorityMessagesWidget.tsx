'use client';

import React from 'react';
import { MOCK_MESSAGES } from '../mockData';
import { Message } from '../../shared/interfaces/Message.interface';
import { PriorityLevel } from '../../shared/enums/priority.enum';

export interface PriorityMessagesWidgetProps {
  messages?: Message[];
  onOpenMessage?: (message: Message) => void;
  onDraftReply?: (message: Message) => void;
}

export const PriorityMessagesWidget: React.FC<PriorityMessagesWidgetProps> = ({
  messages = MOCK_MESSAGES.filter(m => m.priority === PriorityLevel.URGENT || m.priority === PriorityLevel.HIGH),
  onOpenMessage,
  onDraftReply
}) => {
  const getPlatformBadge = (platform: string) => {
    switch (platform) {
      case 'GMAIL': return { icon: '✉️', name: 'Gmail', color: '#ea4335' };
      case 'SLACK': return { icon: '💬', name: 'Slack', color: '#e01e5a' };
      case 'DISCORD': return { icon: '🎮', name: 'Discord', color: '#5865f2' };
      case 'GITHUB': return { icon: '🐙', name: 'GitHub', color: '#2da44e' };
      case 'NOTION': return { icon: '📝', name: 'Notion', color: '#ffffff' };
      default: return { icon: '📨', name: platform, color: '#38bdf8' };
    }
  };

  return (
    <div
      style={{
        background: 'rgba(19, 25, 39, 0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: '16px',
        padding: '20px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🚨</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
              AI Priority & Urgent Messages
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Scored by Priority Agent based on deadlines, sender authority, and NLP sentiment
            </p>
          </div>
        </div>

        <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          {messages.length} High Urgency Items
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg) => {
          const plat = getPlatformBadge(msg.platform);
          return (
            <div
              key={msg.id}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                transition: 'border-color 0.2s ease, transform 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>{plat.icon}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                    {msg.sender.name}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    ({plat.name})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    URGENT (0.96)
                  </span>
                  <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                    🤖 Priority Agent
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>
                {msg.subject}
              </div>

              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.4 }}>
                {msg.content}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {msg.tags?.map(t => (
                    <span key={t} style={{ fontSize: '10px', background: 'rgba(255, 255, 255, 0.06)', color: '#cbd5e1', padding: '2px 8px', borderRadius: '6px' }}>
                      #{t}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onDraftReply && onDraftReply(msg)}
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    ✏️ AI Draft Reply
                  </button>
                  <button
                    onClick={() => onOpenMessage && onOpenMessage(msg)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f8fafc',
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    🔍 Inspect Thread
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
