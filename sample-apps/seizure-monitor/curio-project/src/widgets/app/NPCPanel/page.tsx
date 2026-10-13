'use client';

import { useEffect } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

interface NPCData {
  npcId: string;
  chapterId: number;
  dialogue: string;
  hintMode: boolean;
}

export default function NPCPanel() {
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<NPCData>();

  if (!data) return null;

  const getNPCName = (id: string) => {
    const names: Record<string, string> = {
      chronicler: 'The Court Chronicler',
      sculptor: 'The Temple Sculptor',
      merchant: 'The Persian Merchant',
      krishnadevaraya: 'Emperor Krishnadevaraya'
    };
    return names[id] || id;
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 48px)',
      maxWidth: '800px',
      padding: '24px',
      background: 'rgba(42, 36, 32, 0.85)',
      backdropFilter: 'blur(12px)',
      borderTop: '2px solid var(--gold-500)',
      borderRadius: '16px',
      color: 'var(--stone-100)',
      fontFamily: 'var(--font-body)',
      boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
      zIndex: 100, // Ensure it sits on top of the backdrop
      transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <h3 style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--gold-500)',
        fontSize: '24px',
        margin: '0 0 16px 0',
        letterSpacing: '1px'
      }}>
        {getNPCName(data.npcId)}
      </h3>
      
      {data.hintMode && (
        <div style={{
          fontSize: '12px',
          color: 'var(--dusk-700)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '8px',
          fontWeight: 'bold'
        }}>
          Offering a Hint
        </div>
      )}

      <p style={{
        fontSize: '16px',
        lineHeight: 1.6,
        margin: 0,
        opacity: 0.9
      }}>
        "{data.dialogue}"
      </p>
    </div>
  );
}
