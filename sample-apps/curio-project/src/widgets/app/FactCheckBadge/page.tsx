'use client';

import { useEffect } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

interface FactCheckData {
  claim: string;
  status: string;
  verified: boolean;
  message: string;
}

export default function FactCheckBadge() {
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<FactCheckData>();

  if (!data) return null;

  const isMyth = !data.verified;
  const color = isMyth ? 'var(--terracotta-600)' : 'var(--verified-green)';

  return (
    <div style={{
      position: 'fixed',
      bottom: '180px', // Just above the NPC panel
      right: '24px',
      padding: '16px',
      background: 'rgba(25, 20, 18, 0.95)',
      backdropFilter: 'blur(10px)',
      borderLeft: `4px solid ${color}`,
      borderRadius: '8px',
      fontFamily: 'var(--font-body)',
      color: 'var(--stone-100)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
      animation: 'slideIn 0.3s ease-out',
      zIndex: 101, // Above the NPC panel
      maxWidth: '300px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: color,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        fontSize: '12px'
      }}>
        <span>{isMyth ? '⚠️ Myth Flagged' : '✅ Fact Verified'}</span>
      </div>
      
      <div style={{ fontSize: '14px', fontStyle: 'italic', opacity: 0.8 }}>
        "{data.claim}"
      </div>
      
      <div style={{ fontSize: '14px', fontWeight: 500 }}>
        {data.message}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </div>
  );
}
