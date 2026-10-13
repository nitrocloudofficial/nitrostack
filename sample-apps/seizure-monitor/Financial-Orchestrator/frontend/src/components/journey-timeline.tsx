import * as React from 'react';

export interface JourneyTimelineProps {
  userId: string;
  sessions: Array<{
    id: string;
    date: string;
    channel: string;
    intent: string;
    status: 'SUCCESS' | 'ERROR' | 'ESCALATED';
    duration: string;
  }>;
}

export const JourneyTimeline: React.FC<JourneyTimelineProps> = ({ sessions }) => {
  const containerStyle: React.CSSProperties = {
    background: '#1A1C23',
    border: '1px solid #2D303E',
    borderRadius: '24px',
    padding: '32px',
    color: '#fff',
    fontFamily: '"Inter", sans-serif',
    maxWidth: '550px',
    margin: '0 auto',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  };

  const getStatusColor = (status: string) => {
    if (status === 'SUCCESS') return '#10B981';
    if (status === 'ERROR') return '#EF4444';
    return '#F59E0B';
  };

  const timelineItemStyle: React.CSSProperties = {
    display: 'flex',
    gap: '20px',
    marginBottom: '24px',
    position: 'relative',
  };

  const lineStyle: React.CSSProperties = {
    position: 'absolute',
    left: '19px',
    top: '32px',
    bottom: '-24px',
    width: '2px',
    background: '#2D303E',
    zIndex: 1,
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ margin: '0 0 32px 0', fontSize: '20px', color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>🧵</span> Omni-Channel Journey
      </h2>

      <div>
        {sessions.map((session, i) => (
          <div key={session.id} style={timelineItemStyle}>
            {i !== sessions.length - 1 && <div style={lineStyle} />}
            
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%', background: '#2D303E', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
              border: `2px solid ${getStatusColor(session.status)}`, fontSize: '18px'
            }}>
              {session.channel === 'MOBILE_APP' ? '📱' : session.channel === 'IVR_CALL' ? '📞' : '💻'}
            </div>

            <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.5px' }}>{session.channel.replace('_', ' ')}</span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>{new Date(session.date).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 500, color: '#F8FAFC', marginBottom: '8px' }}>
                {session.intent}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: `${getStatusColor(session.status)}22`, color: getStatusColor(session.status), fontWeight: 600 }}>
                  {session.status}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>{session.duration}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
