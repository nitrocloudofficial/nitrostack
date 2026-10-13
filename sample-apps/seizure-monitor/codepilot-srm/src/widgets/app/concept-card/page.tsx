'use client';

import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { BookOpen, AlertTriangle, Zap, Clock, Terminal, ChevronRight } from 'lucide-react';

interface ConceptData {
  title: string;
  topic: string;
  intuition: string;
  whenToUse: string;
  complexity: {
    time: string;
    space: string;
  };
  commonMistakes: string[];
  interviewTips: string;
  relatedProblemTitle: string | null;
}

export default function ConceptCardWidget() {
  const { getToolOutput, sendFollowUpMessage, isReady } = useWidgetSDK();
  const data = getToolOutput<ConceptData>();

  if (!isReady || !data) {
    return <div style={{ padding: '16px', color: '#fff', textAlign: 'center' }}>Loading concept...</div>;
  }

  return (
    <div style={{
      padding: '0',
      background: '#0f172a',
      borderRadius: '16px',
      border: '1px solid #1e293b',
      color: 'white',
      width: '100%',
      maxWidth: '700px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Pattern</span>
          <span style={{ fontSize: '12px', color: '#64748b' }}>• {data.topic}</span>
        </div>
        <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px' }}>{data.title}</h2>
      </div>

      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Zap size={16} color="#fbbf24" /> Intuition
          </h3>
          <p style={{ margin: 0, color: '#94a3b8', lineHeight: '1.6', fontSize: '14px' }}>{data.intuition}</p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <BookOpen size={16} color="#34d399" /> When to use
          </h3>
          <div style={{ background: 'rgba(52, 211, 153, 0.05)', borderLeft: '3px solid #34d399', padding: '12px', borderRadius: '0 8px 8px 0', color: '#cbd5e1', fontSize: '14px' }}>
            {data.whenToUse}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', textTransform: 'uppercase' }}><Clock size={12} /> Time Complexity</div>
            <div style={{ fontSize: '14px', color: '#e2e8f0' }}>{data.complexity.time}</div>
          </div>
          <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', textTransform: 'uppercase' }}><Terminal size={12} /> Space Complexity</div>
            <div style={{ fontSize: '14px', color: '#e2e8f0' }}>{data.complexity.space}</div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle size={16} color="#f87171" /> Common Mistakes
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
            {data.commonMistakes.map((mistake, i) => <li key={i}>{mistake}</li>)}
          </ul>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '15px', color: '#e2e8f0', marginBottom: '8px' }}>Interview Tip</h3>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' }}>"{data.interviewTips}"</p>
        </div>

        <button
          onClick={() => sendFollowUpMessage(`Give me a problem to practice ${data.title}`).catch(err => console.warn(err))}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600', fontSize: '15px', transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Practice This Pattern <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
