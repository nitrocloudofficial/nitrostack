'use client';

import { useEffect } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

interface CurriculumData {
  theme: string;
  chapters: Array<{ id: number; title: string; status: string }>;
}

export default function ProgressTrail() {
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<CurriculumData>();

  if (!data) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '800px',
      padding: '16px',
      background: 'rgba(42, 36, 32, 0.4)',
      backdropFilter: 'blur(8px)',
      borderRadius: '32px',
      fontFamily: 'var(--font-body)',
      color: 'var(--stone-100)',
      zIndex: 100, // On top of the backdrop
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        position: 'relative'
      }}>
        {/* Connector line */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '10%',
          right: '10%',
          height: '2px',
          background: 'rgba(232, 223, 206, 0.2)',
          zIndex: 0,
          transform: 'translateY(-50%)'
        }} />

        {data.chapters.map((chap, idx) => {
          const isActive = chap.status === 'pending';
          const isCompleted = chap.status === 'completed';
          
          return (
            <div key={idx} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              zIndex: 1
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isCompleted ? 'var(--gold-500)' : isActive ? 'var(--stone-900)' : 'var(--stone-900)',
                border: `2px solid ${isActive || isCompleted ? 'var(--gold-500)' : 'rgba(232, 223, 206, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isCompleted ? 'var(--stone-900)' : isActive ? 'var(--gold-500)' : 'rgba(232, 223, 206, 0.5)',
                fontFamily: 'var(--font-display)',
                fontWeight: 'bold',
                boxShadow: isActive ? '0 0 15px rgba(200, 155, 60, 0.4)' : 'none',
                transition: 'all 0.3s'
              }}>
                {isCompleted ? '✓' : ['I', 'II', 'III'][idx]}
              </div>
              <div style={{
                fontSize: '12px',
                color: isActive || isCompleted ? 'var(--stone-100)' : 'rgba(232, 223, 206, 0.5)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                whiteSpace: 'nowrap'
              }}>
                {chap.title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
