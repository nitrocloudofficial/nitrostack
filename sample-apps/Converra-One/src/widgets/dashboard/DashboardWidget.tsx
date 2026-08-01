'use client';

import React from 'react';
import { BriefingWidget } from '../briefing/BriefingWidget';
import { PriorityMessagesWidget } from '../priority/PriorityMessagesWidget';
import { TaskWidget } from '../tasks/TaskWidget';
import { CalendarWidget } from '../calendar/CalendarWidget';
import { UnifiedInboxWidget } from '../inbox/UnifiedInboxWidget';
import { AgentActivityWidget } from '../agent/AgentActivityWidget';
import { PlatformStatusWidget } from '../platform/PlatformStatusWidget';
import { Message } from '../../shared/interfaces/Message.interface';


export interface DashboardWidgetProps {
  onOpenMessage?: (message: Message) => void;
  onDraftReply?: (message: Message) => void;
  onNavigateTab?: (tab: string) => void;
  onQuickAction?: (actionName: string) => void;
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  onOpenMessage,
  onDraftReply,
  onNavigateTab,
  onQuickAction
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. Daily AI Briefing Banner */}
      <BriefingWidget
        userName="Alex"
        onViewPriority={() => onNavigateTab && onNavigateTab('inbox')}
      />

      {/* 2. Priority Messages Grid */}
      <PriorityMessagesWidget
        onOpenMessage={onOpenMessage}
        onDraftReply={onDraftReply}
      />

      {/* 3 & 4. Tasks and Calendar 2-Column Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        <TaskWidget />
        <CalendarWidget />
      </div>

      {/* 5. Unified Inbox Preview */}
      <UnifiedInboxWidget
        onOpenMessage={onOpenMessage}
        onQuickReply={onDraftReply}
      />

      {/* 6 & 7. Agent Activity Execution Timeline & Platform Status */}
      <AgentActivityWidget />
      <PlatformStatusWidget />
    </div>
  );
};
