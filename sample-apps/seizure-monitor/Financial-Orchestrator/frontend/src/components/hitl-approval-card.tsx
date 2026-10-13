import * as React from 'react';

export interface HitlApprovalCardProps {
  actionId: string;
  summary: string;
  impact: string;
  expiresAt: string;
}

export const HitlApprovalCard: React.FC<HitlApprovalCardProps> = ({ actionId, summary, impact, expiresAt }) => {
  const containerStyle: React.CSSProperties = {
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '16px',
    padding: '32px',
    color: '#fff',
    fontFamily: '"Inter", sans-serif',
    maxWidth: '500px',
    margin: '0 auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.1)',
    backdropFilter: 'blur(20px)',
  };

  const buttonStyle = (isApprove: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '14px 24px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    background: isApprove ? 'linear-gradient(135deg, #0284C7, #0369A1)' : 'rgba(255,255,255,0.05)',
    color: isApprove ? '#FFF' : '#94A3B8',
    transition: 'all 0.2s',
    boxShadow: isApprove ? '0 4px 14px rgba(2, 132, 199, 0.3)' : 'none',
  });

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
          ⏳
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Action Requires Approval</h2>
          <div style={{ fontSize: '13px', color: '#94A3B8' }}>Expires in {Math.round((new Date(expiresAt).getTime() - Date.now()) / 3600000)} hours</div>
        </div>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#7DD3FC', textTransform: 'uppercase', letterSpacing: '1px' }}>Proposed Action</h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '16px', lineHeight: '1.5', fontWeight: 500 }}>{summary}</p>
        
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#F87171', textTransform: 'uppercase', letterSpacing: '1px' }}>Estimated Impact</h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#CBD5E1', lineHeight: '1.5' }}>{impact}</p>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <button style={buttonStyle(false)}>Reject</button>
        <button style={buttonStyle(true)}>Approve Execution</button>
      </div>
      <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: '#64748B' }}>
        ID: {actionId.split('-')[0]}...
      </div>
    </div>
  );
};
