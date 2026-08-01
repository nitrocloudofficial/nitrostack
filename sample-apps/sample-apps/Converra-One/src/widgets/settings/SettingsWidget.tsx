'use client';

import React, { useState, useEffect } from 'react';

export interface SettingsWidgetProps {
  initialTab?: 'theme' | 'platforms' | 'notifications' | 'account';
  currentTheme?: 'dark' | 'light' | 'system';
  onThemeChange?: (theme: 'dark' | 'light' | 'system') => void;
}

export const SettingsWidget: React.FC<SettingsWidgetProps> = ({
  initialTab = 'theme',
  currentTheme: propTheme,
  onThemeChange
}) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'platforms' | 'notifications' | 'account'>(initialTab);
  const [themeMode, setThemeMode] = useState<'dark' | 'light' | 'system'>('dark');

  useEffect(() => {
    if (propTheme) {
      setThemeMode(propTheme);
    } else {
      const saved = localStorage.getItem('converra_theme') as 'dark' | 'light' | 'system' | null;
      if (saved) setThemeMode(saved);
    }
  }, [propTheme]);

  const handleSelectTheme = (newTheme: 'dark' | 'light' | 'system') => {
    setThemeMode(newTheme);
    localStorage.setItem('converra_theme', newTheme);
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  };

  return (
    <div
      style={{
        background: 'rgba(19, 25, 39, 0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <span style={{ fontSize: '24px' }}>⚙️</span>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
            System & Platform Settings
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Manage themes, connected platform credentials, notification triggers, and user profile
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px', marginBottom: '20px' }}>
        {[
          { id: 'theme', label: '🎨 Visual Theme' },
          { id: 'platforms', label: '🔌 Connected Platforms' },
          { id: 'notifications', label: '🔔 Notifications' },
          { id: 'account', label: '👤 Account Info' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            style={{
              background: activeTab === t.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              border: activeTab === t.id ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
              color: activeTab === t.id ? '#38bdf8' : '#94a3b8',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: activeTab === t.id ? 600 : 500,
              cursor: 'pointer'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'theme' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', color: '#f1f5f9' }}>Theme Customization</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div
              onClick={() => handleSelectTheme('dark')}
              style={{
                background: themeMode === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: themeMode === 'dark' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>🌙 Dark Glassmorphism</div>
              <div style={{ fontSize: '11px', color: themeMode === 'dark' ? '#38bdf8' : '#64748b', marginTop: '4px' }}>
                {themeMode === 'dark' ? 'Enterprise Dark Mode (Active)' : 'Enterprise Dark Mode'}
              </div>
            </div>

            <div
              onClick={() => handleSelectTheme('light')}
              style={{
                background: themeMode === 'light' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: themeMode === 'light' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>☀️ Light Mode</div>
              <div style={{ fontSize: '11px', color: themeMode === 'light' ? '#38bdf8' : '#64748b', marginTop: '4px' }}>
                {themeMode === 'light' ? 'Clean Day Theme (Active)' : 'Clean Day Theme'}
              </div>
            </div>

            <div
              onClick={() => handleSelectTheme('system')}
              style={{
                background: themeMode === 'system' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: themeMode === 'system' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>🖥️ System Default</div>
              <div style={{ fontSize: '11px', color: themeMode === 'system' ? '#38bdf8' : '#64748b', marginTop: '4px' }}>
                {themeMode === 'system' ? 'Match OS Appearance (Active)' : 'Match OS Appearance'}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'platforms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', color: '#f1f5f9' }}>Platform Connectors</h4>
          {['Gmail', 'Slack', 'Discord', 'GitHub', 'Notion', 'Google Calendar'].map((p) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{p} Integration</span>
              <span style={{ fontSize: '11px', color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>Connected</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', color: '#f1f5f9' }}>Notification Preferences</h4>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#cbd5e1' }}>
            <input type="checkbox" defaultChecked style={{ accentColor: '#38bdf8' }} /> Enable AI Priority Desktop Toasts
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#cbd5e1' }}>
            <input type="checkbox" defaultChecked style={{ accentColor: '#38bdf8' }} /> Send Morning AI Daily Briefing Summary
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#cbd5e1' }}>
            <input type="checkbox" defaultChecked style={{ accentColor: '#38bdf8' }} /> Sound Alerts on Urgent Messages (Score &gt; 0.90)
          </label>
        </div>
      )}

      {activeTab === 'account' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', color: '#f1f5f9' }}>Account Information</h4>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
            User: <strong style={{ color: '#f1f5f9' }}>Alex Mercer</strong> (alex.mercer@converra.io)
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
            Workspace: <strong style={{ color: '#f1f5f9' }}>Converra AI Workspace</strong>
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
            NitroStack Version: <strong style={{ color: '#38bdf8' }}>v1.0.0 Enterprise AI Studio</strong>
          </div>
        </div>
      )}
    </div>
  );
};
