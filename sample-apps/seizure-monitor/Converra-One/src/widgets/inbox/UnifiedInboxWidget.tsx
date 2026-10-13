'use client';

import React, { useState } from 'react';
import { MOCK_MESSAGES } from '../mockData';
import { Message } from '../../shared/interfaces/Message.interface';
import { PlatformType } from '../../shared/enums/platform.enum';
import { MessageStatus } from '../../shared/enums/message.enum';

function formatTimeString(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export interface UnifiedInboxWidgetProps {
  messages?: Message[];
  onOpenMessage?: (message: Message) => void;
  onQuickReply?: (message: Message) => void;
}

export const UnifiedInboxWidget: React.FC<UnifiedInboxWidgetProps> = ({
  messages = MOCK_MESSAGES,
  onOpenMessage,
  onQuickReply
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredMessages = messages.filter((msg) => {
    let matchesCategory = true;
    if (selectedFilter === 'UNREAD') {
      matchesCategory = msg.status === MessageStatus.UNREAD;
    } else if (selectedFilter === 'READ') {
      matchesCategory = msg.status === MessageStatus.READ;
    } else if (selectedFilter === 'ARCHIVED') {
      matchesCategory = msg.status === MessageStatus.ARCHIVED;
    } else if (selectedFilter !== 'ALL') {
      matchesCategory = msg.platform === selectedFilter;
    }

    const matchesSearch =
      msg.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.sender.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case PlatformType.GMAIL: return '✉️';
      case PlatformType.SLACK: return '💬';
      case PlatformType.DISCORD: return '🎮';
      case PlatformType.GITHUB: return '🐙';
      case PlatformType.NOTION: return '📝';
      default: return '📨';
    }
  };

  const getPriorityTag = (priority: string) => {
    switch (priority) {
      case 'URGENT': return { label: 'URGENT', bg: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' };
      case 'HIGH': return { label: 'HIGH', bg: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d' };
      case 'MEDIUM': return { label: 'MED', bg: 'rgba(56, 189, 248, 0.15)', color: '#7dd3fc' };
      default: return { label: 'LOW', bg: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1' };
    }
  };

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
      {/* Header & Category Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📥</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
                Unified Inbox Stream
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Aggregated cross-platform messaging harvested by Collector Agent
              </p>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Filter inbox messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '6px 12px',
                color: '#f8fafc',
                fontSize: '12px',
                outline: 'none',
                width: '180px'
              }}
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['ALL', 'UNREAD', 'READ', 'ARCHIVED', 'GMAIL', 'SLACK', 'GITHUB', 'NOTION'].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedFilter(p)}
              style={{
                background: selectedFilter === p ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: selectedFilter === p ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                color: selectedFilter === p ? '#38bdf8' : '#94a3b8',
                borderRadius: '8px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: selectedFilter === p ? 600 : 500,
                cursor: 'pointer'
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Message List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredMessages.map((msg) => {
          const priority = getPriorityTag(msg.priority);
          const isUnread = msg.status === MessageStatus.UNREAD;

          return (
            <div
              key={msg.id}
              style={{
                background: isUnread ? 'rgba(56, 189, 248, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                border: isUnread ? '1px solid rgba(56, 189, 248, 0.15)' : '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1, minWidth: 0 }}>
                {/* Platform Icon & Unread Indicator */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px'
                    }}
                  >
                    {getPlatformIcon(msg.platform)}
                  </div>
                  {isUnread && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#38bdf8',
                        boxShadow: '0 0 6px #38bdf8'
                      }}
                    />
                  )}
                </div>

                {/* Message Meta & Content */}
                <div style={{ overflow: 'hidden', flexGrow: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: isUnread ? 700 : 600, color: '#f1f5f9' }}>
                      {msg.sender.name}
                    </span>
                    <span style={{ fontSize: '10px', background: priority.bg, color: priority.color, padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      {priority.label}
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748b', marginLeft: 'auto' }}>
                      {formatTimeString(msg.timestamp)}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: isUnread ? 600 : 400, color: '#e2e8f0', margin: '2px 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {msg.subject || 'Direct Message'}
                  </div>

                  <div style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {msg.content}
                  </div>
                </div>
              </div>

              {/* Action Triggers */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={() => onQuickReply && onQuickReply(msg)}
                  style={{
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    color: '#38bdf8',
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Quick Reply
                </button>
                <button
                  onClick={() => onOpenMessage && onOpenMessage(msg)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#cbd5e1',
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Expand
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
