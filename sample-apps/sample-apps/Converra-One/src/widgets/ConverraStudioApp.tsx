'use client';

import React, { useState, useEffect } from 'react';
import { SidebarWidget, NavTab } from './sidebar/SidebarWidget';
import { TopNavWidget } from './topnav/TopNavWidget';
import { DashboardWidget } from './dashboard/DashboardWidget';
import { UnifiedInboxWidget } from './inbox/UnifiedInboxWidget';
import { TaskWidget } from './tasks/TaskWidget';
import { CalendarWidget } from './calendar/CalendarWidget';
import { SearchWidget } from './search/SearchWidget';
import { NotificationsWidget } from './notifications/NotificationsWidget';
import { SettingsWidget } from './settings/SettingsWidget';
import { ProfileWidget } from './profile/ProfileWidget';
import { MessageDetailsWidget } from './details/MessageDetailsWidget';
import { ReplyWidget } from './reply/ReplyWidget';
import { MOCK_MESSAGES } from './mockData';
import { Message } from '../shared/interfaces/Message.interface';

import { MessageStatus } from '../shared/enums/message.enum';

export const ConverraStudioApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [draftReplyMessage, setDraftReplyMessage] = useState<Message | null>(null);
  const [suggestedText, setSuggestedText] = useState<string>('');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');

  const unreadCount = messages.filter((m) => m.status === MessageStatus.UNREAD).length;

  useEffect(() => {
    const saved = localStorage.getItem('converra_theme') as 'dark' | 'light' | 'system' | null;
    if (saved) {
      setTheme(saved);
    }
  }, []);

  const getEffectiveTheme = (): 'dark' | 'light' => {
    if (theme === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
      return 'dark';
    }
    return theme;
  };

  const effectiveTheme = getEffectiveTheme();

  const handleOpenMessage = (msg: Message) => {
    const readMsg = { ...msg, status: MessageStatus.READ };
    setSelectedMessage(readMsg);

    if (msg.status === MessageStatus.UNREAD) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, status: MessageStatus.READ } : m))
      );
    }
  };

  const handleDraftReply = (msg: Message) => {
    setDraftReplyMessage(msg);
  };

  const handleSendSuccess = (replyText: string, messageId?: string) => {
    if (messageId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, status: MessageStatus.READ, tags: [...(m.tags || []), 'Replied'] }
            : m
        )
      );
    }
  };

  const handleQuickAction = (actionName: string) => {
    if (actionName === 'search') setActiveTab('search');
    else if (actionName === 'task') setActiveTab('tasks');
    else if (actionName === 'meeting') setActiveTab('calendar');
    else if (actionName === 'reply') {
      setDraftReplyMessage(messages[0] || MOCK_MESSAGES[0]);
    } else if (actionName === 'refresh') {
      alert('⚡ Collector Agent triggered channel refresh across 6 platforms.');
    }
  };

  const handleThemeChange = (newTheme: 'dark' | 'light' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('converra_theme', newTheme);
  };

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        background: effectiveTheme === 'light' ? '#f1f5f9' : '#080c16',
        color: effectiveTheme === 'light' ? '#0f172a' : '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        transition: 'background 0.3s ease, color 0.3s ease'
      }}
    >
      {/* 1. Sidebar Navigation Widget */}
      <SidebarWidget
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadCount={unreadCount}
        taskCount={3}
        notificationCount={2}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Workspace Column */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          height: '100vh',
          overflow: 'hidden'
        }}
      >
        {/* 2. Top Navigation Widget */}
        <TopNavWidget
          workspaceName="Converra AI Workspace"
          onSearchClick={() => setActiveTab('search')}
          onNotificationsClick={() => setActiveTab('notifications')}
          onProfileClick={() => setShowProfileModal(!showProfileModal)}
          notificationCount={unreadCount}
        />

        {/* Dynamic View Area */}
        <main
          style={{
            flexGrow: 1,
            overflowY: 'auto',
            padding: '24px',
            boxSizing: 'border-box'
          }}
        >
          {activeTab === 'dashboard' && (
            <DashboardWidget
              onOpenMessage={handleOpenMessage}
              onDraftReply={handleDraftReply}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
              onQuickAction={handleQuickAction}
            />
          )}

          {activeTab === 'inbox' && (
            <UnifiedInboxWidget
              messages={messages}
              onOpenMessage={handleOpenMessage}
              onQuickReply={handleDraftReply}
            />
          )}

          {activeTab === 'tasks' && <TaskWidget />}

          {activeTab === 'calendar' && <CalendarWidget />}

          {activeTab === 'search' && (
            <SearchWidget
              onOpenMessage={(id) => {
                const found = MOCK_MESSAGES.find((m) => m.id === id) || MOCK_MESSAGES[0];
                handleOpenMessage(found);
              }}
            />
          )}

          {activeTab === 'notifications' && <NotificationsWidget />}

          {activeTab === 'settings' && (
            <SettingsWidget
              currentTheme={theme}
              onThemeChange={handleThemeChange}
            />
          )}
        </main>
      </div>

      {/* Modal Overlay: Message Details Inspector */}
      {selectedMessage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px'
          }}
        >
          <div style={{ maxWidth: '840px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <MessageDetailsWidget
              message={selectedMessage}
              onClose={() => setSelectedMessage(null)}
              onSelectSuggestedReply={(text) => {
                setSuggestedText(text);
                setDraftReplyMessage(selectedMessage);
                setSelectedMessage(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal Overlay: Smart Reply Composer */}
      {draftReplyMessage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '24px'
          }}
        >
          <div style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <ReplyWidget
              originalMessage={draftReplyMessage}
              initialReplyText={suggestedText}
              onSendSuccess={handleSendSuccess}
              onClose={() => {
                setDraftReplyMessage(null);
                setSuggestedText('');
              }}
            />
          </div>
        </div>
      )}

      {/* Modal Overlay: User Profile Menu */}
      {showProfileModal && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            right: '24px',
            width: '360px',
            zIndex: 990
          }}
        >
          <ProfileWidget
            onOpenSettings={() => {
              setActiveTab('settings');
              setShowProfileModal(false);
            }}
          />
        </div>
      )}
    </div>
  );
};
