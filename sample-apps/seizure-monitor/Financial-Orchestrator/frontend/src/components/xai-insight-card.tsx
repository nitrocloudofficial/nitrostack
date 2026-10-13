import React from 'react';

export interface XAIInsightCardProps {
  insights: Array<{
    dimension: string;
    score: number;
    type: 'POSITIVE' | 'NEGATIVE' | 'WARNING';
    message: string;
  }>;
}

export const XAIInsightCard: React.FC<XAIInsightCardProps> = ({ insights }) => {
  const getStyle = (type: string) => {
    switch(type) {
      case 'POSITIVE': return { color: '#00F0FF', bg: 'rgba(0, 240, 255, 0.05)', border: 'rgba(0, 240, 255, 0.2)' };
      case 'NEGATIVE': return { color: '#FF3366', bg: 'rgba(255, 51, 102, 0.05)', border: 'rgba(255, 51, 102, 0.2)' };
      default: return { color: '#FFD700', bg: 'rgba(255, 215, 0, 0.05)', border: 'rgba(255, 215, 0, 0.2)' };
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(112, 0, 255, 0.2)', color: '#7000FF' }}>
          🧠
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Explainable AI (XAI)</h2>
          <div style={{ fontSize: '12px', color: '#8B949E' }}>Mathematical Score Rationale</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {insights.map((insight, idx) => {
          const theme = getStyle(insight.type);
          return (
            <div key={idx} style={{ 
              padding: '16px', 
              borderRadius: '12px', 
              background: theme.bg, 
              borderLeft: `4px solid ${theme.color}`,
              border: `1px solid ${theme.border}`,
              borderLeftWidth: '4px',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ color: theme.color, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {insight.dimension}
                </strong>
                <div style={{ background: theme.color, color: '#000', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 800 }}>
                  {insight.score}/100
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: '#E1E7EF' }}>
                {insight.message}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
