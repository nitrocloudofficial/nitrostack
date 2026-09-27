'use client';

import { useState, useEffect } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

interface QuizData {
  chapterId: number;
  quiz: {
    question: string;
    options: string[];
    correctAnswer: string;
  };
}

export default function QuizCard() {
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<QuizData>();
  const [selected, setSelected] = useState<string | null>(null);

  if (!data) return null;

  const { quiz } = data;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      padding: '32px',
      background: 'rgba(42, 36, 32, 0.95)',
      backdropFilter: 'blur(16px)',
      borderRadius: '16px',
      border: '2px solid var(--gold-500)',
      fontFamily: 'var(--font-body)',
      color: 'var(--stone-100)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
      width: '90%',
      maxWidth: '500px',
      zIndex: 200, // Highest z-index to stay above everything
    }}>
      <h3 style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--gold-500)',
        fontSize: '22px',
        margin: '0 0 20px 0',
        textAlign: 'center'
      }}>
        Chapter {data.chapterId} Challenge
      </h3>
      
      <p style={{ fontSize: '16px', marginBottom: '20px', lineHeight: 1.5 }}>
        {quiz.question}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {quiz.options.map((opt, idx) => {
          const isSelected = selected === opt;
          return (
            <button
              key={idx}
              onClick={() => setSelected(opt)}
              style={{
                padding: '12px 16px',
                background: isSelected ? 'rgba(200, 155, 60, 0.2)' : 'rgba(232, 223, 206, 0.05)',
                border: `1px solid ${isSelected ? 'var(--gold-500)' : 'rgba(232, 223, 206, 0.2)'}`,
                borderRadius: '8px',
                color: 'var(--stone-100)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                fontFamily: 'var(--font-body)',
                transition: 'all 0.2s ease',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <button
        disabled={!selected}
        style={{
          marginTop: '24px',
          width: '100%',
          padding: '12px',
          background: selected ? 'var(--gold-500)' : 'rgba(200, 155, 60, 0.3)',
          color: 'var(--stone-900)',
          border: 'none',
          borderRadius: '8px',
          fontFamily: 'var(--font-body)',
          fontWeight: 'bold',
          fontSize: '16px',
          cursor: selected ? 'pointer' : 'not-allowed',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}
      >
        Submit Answer
      </button>
    </div>
  );
}
