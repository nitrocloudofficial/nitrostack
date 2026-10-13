'use client';

import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { Lightbulb, ChevronRight, CheckCircle2 } from 'lucide-react';

interface HintData {
  problemId: string;
  problemTitle: string;
  hintLevel: number;
  totalHints: number;
  hint: string;
  isFinalHint: boolean;
}

export default function HintCardWidget() {
  const { getToolOutput, sendFollowUpMessage, isReady } = useWidgetSDK();
  const data = getToolOutput<HintData>();

  if (!isReady || !data) {
    return <div style={{ padding: '16px', color: '#fff', textAlign: 'center' }}>Loading hint...</div>;
  }

  return (
    <div style={{
      padding: '20px',
      background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.1)',
      color: 'white',
      width: '100%',
      maxWidth: '600px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Lightbulb size={18} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#e2e8f0' }}>Hint {data.hintLevel} of {data.totalHints}</h3>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>{data.problemTitle}</p>
        </div>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.03)',
        padding: '16px',
        borderRadius: '12px',
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#f8fafc',
        marginBottom: '20px',
        borderLeft: '2px solid #fbbf24'
      }}>
        {data.hint}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        {!data.isFinalHint ? (
          <button
            onClick={() => sendFollowUpMessage(`Give me hint ${data.hintLevel + 1} for ${data.problemId}`).catch(err => console.warn(err))}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '500', fontSize: '13px'
            }}
          >
            Next Hint <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={() => sendFollowUpMessage(`Show me the solution approach for ${data.problemId}`).catch(err => console.warn(err))}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '500', fontSize: '13px'
            }}
          >
            <CheckCircle2 size={14} /> Show Solution Approach
          </button>
        )}
      </div>
    </div>
  );
}
