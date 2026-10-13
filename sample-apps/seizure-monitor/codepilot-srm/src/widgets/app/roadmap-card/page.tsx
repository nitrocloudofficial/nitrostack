'use client';

import React from 'react';
import { useWidgetSDK, useWidgetState } from '@nitrostack/widgets';
import { Map, CheckCircle2, ChevronRight, Expand, Minimize2, Calendar } from 'lucide-react';

interface BlockPlan {
  id: number;
  label: string;
  topics: string[];
  focus: string;
  problemsTarget: number;
  reason: string;
}

interface RoadmapData {
  roadmapInfo: {
    totalDays: number;
    viewMode: 'daily' | 'weekly';
    targetCompany: string;
    dailyHours: number;
  };
  plan: BlockPlan[];
}

export default function RoadmapCardWidget() {
  const { getToolOutput, isReady, requestFullscreen, requestInline, displayMode, sendFollowUpMessage } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ currentBlock: number }>(() => ({ currentBlock: 1 }));
  const data = getToolOutput<RoadmapData>();

  if (!isReady || !data) {
    return <div style={{ padding: '24px', color: '#fff', textAlign: 'center' }}>Loading roadmap...</div>;
  }

  const isExpanded = displayMode === 'fullscreen';
  const toggleSize = () => (isExpanded ? requestInline() : requestFullscreen());

  return (
    <div style={{
      padding: '24px',
      background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: isExpanded ? '0' : '20px',
      color: 'white',
      width: '100%',
      maxWidth: isExpanded ? '100%' : '700px',
      minHeight: isExpanded ? '100vh' : 'auto',
      boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Map size={24} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', letterSpacing: '-0.5px' }}>
              {data.roadmapInfo.targetCompany} Prep Roadmap
            </h2>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={14} /> {data.roadmapInfo.totalDays} Days ({data.roadmapInfo.viewMode} view)
              </span>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>• {data.roadmapInfo.dailyHours} hrs/day</span>
            </div>
          </div>
        </div>
        <button onClick={toggleSize} style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8',
          width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }}>
          {isExpanded ? <Minimize2 size={18} /> : <Expand size={18} />}
        </button>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: '24px' }}>
        <div style={{ position: 'absolute', left: '35px', top: '24px', bottom: '24px', width: '2px', background: 'linear-gradient(to bottom, #4f46e5 0%, rgba(79, 70, 229, 0.2) 100%)', zIndex: 0 }} />

        {data.plan.map((block, idx) => {
          const isCompleted = block.id < (state?.currentBlock || 1);
          const isCurrent = block.id === (state?.currentBlock || 1);
          const isUpcoming = block.id > (state?.currentBlock || 1);

          return (
            <div key={block.id} style={{ display: 'flex', gap: '24px', marginBottom: idx === data.plan.length - 1 ? 0 : '32px', position: 'relative', zIndex: 1, opacity: isUpcoming ? 0.5 : 1, transition: 'opacity 0.3s' }}>
              
              <div style={{
                width: '24px', height: '24px', marginTop: '4px', borderRadius: '50%',
                background: isCompleted ? '#4f46e5' : (isCurrent ? '#0f172a' : '#1e293b'),
                border: `3px solid ${isCompleted ? '#4f46e5' : (isCurrent ? '#818cf8' : '#334155')}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isCurrent ? '0 0 0 4px rgba(99, 102, 241, 0.2)' : 'none'
              }}>
                {isCompleted && <CheckCircle2 size={14} color="white" />}
              </div>

              <div 
                style={{
                  flex: 1, background: isCurrent ? 'rgba(79, 70, 229, 0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isCurrent ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: '16px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onClick={() => setState({ currentBlock: block.id })}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ color: isCurrent ? '#818cf8' : '#94a3b8', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {block.label}
                  </span>
                  <span style={{ fontSize: '12px', color: '#cbd5e1', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '12px', fontWeight: '500' }}>
                    {block.problemsTarget} problems
                  </span>
                </div>

                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: isCurrent ? '#fff' : '#cbd5e1' }}>{block.focus}</h3>
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
                  {block.topics.map(t => (
                    <span key={t} style={{ fontSize: '12px', background: 'rgba(255,255,255,0.1)', color: '#e2e8f0', padding: '4px 12px', borderRadius: '12px' }}>{t}</span>
                  ))}
                </div>

                {isCurrent && (
                  <div style={{ marginTop: '20px' }}>
                    <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', borderLeft: '4px solid #6366f1', fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '16px' }}>
                      <strong style={{ color: '#818cf8' }}>Why this matters: </strong>{block.reason}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); sendFollowUpMessage(`Give me a problem for ${block.topics[0]}`).catch(err => console.warn(err)); }}
                      style={{ padding: '12px 20px', borderRadius: '10px', background: '#4f46e5', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '14px' }}
                    >
                      Start Practicing <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
