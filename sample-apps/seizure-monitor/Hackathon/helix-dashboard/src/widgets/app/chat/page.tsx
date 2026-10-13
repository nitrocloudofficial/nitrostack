'use client';

import React from 'react';
import { ChatBotUI } from '../components/ChatBotUI';
import { useTheme } from '@nitrostack/widgets';

export default function ChatWidgetPage() {
  const theme = useTheme();
  return (
    <div style={{
      width: '100%',
      minHeight: '650px',
      backgroundColor: theme === 'dark' ? '#050505' : '#0F172A',
      color: '#FFFFFF',
      padding: '24px',
      borderRadius: '16px',
      border: '1px solid rgba(0, 229, 255, 0.2)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="live-pulse" style={{ backgroundColor: '#00E5FF' }} />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#00E5FF', letterSpacing: '-0.5px' }}>
            HELIX AI Assistant &amp; Drift Inspector
          </h2>
        </div>
        <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 700 }}>
          [CONNECTED] Nitro Studio Connected
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <ChatBotUI />
      </div>
    </div>
  );
}
