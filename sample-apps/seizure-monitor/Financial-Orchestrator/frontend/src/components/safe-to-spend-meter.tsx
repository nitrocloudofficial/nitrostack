import * as React from 'react';

export interface SafeToSpendMeterProps {
  safeAmount: number;
  totalBalance: number;
  upcomingObligations: number;
  savingsTarget: number;
}

export const SafeToSpendMeter: React.FC<SafeToSpendMeterProps> = ({ safeAmount, totalBalance, upcomingObligations, savingsTarget }) => {
  const containerStyle: React.CSSProperties = {
    background: 'linear-gradient(to bottom right, #0F172A, #020617)',
    borderRadius: '24px',
    padding: '32px',
    color: '#F8FAFC',
    fontFamily: '"Inter", sans-serif',
    maxWidth: '400px',
    margin: '0 auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    border: '1px solid #1E293B',
    textAlign: 'center',
  };

  const amountStyle: React.CSSProperties = {
    fontSize: '48px',
    fontWeight: 800,
    background: 'linear-gradient(90deg, #34D399, #10B981)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '16px 0',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #1E293B',
    fontSize: '14px',
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ margin: 0, fontSize: '16px', color: '#94A3B8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Safe to Spend</h2>
      
      <div style={amountStyle}>₹{safeAmount.toLocaleString('en-IN')}</div>
      <p style={{ margin: '0 0 32px 0', color: '#64748B', fontSize: '14px' }}>Available until next payday</p>

      <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '16px', border: '1px solid #1E293B' }}>
        <div style={rowStyle}>
          <span style={{ color: '#94A3B8' }}>Total Bank Balance</span>
          <span style={{ fontWeight: 600 }}>₹{totalBalance.toLocaleString('en-IN')}</span>
        </div>
        <div style={rowStyle}>
          <span style={{ color: '#F87171' }}>Upcoming EMIs & Bills</span>
          <span style={{ fontWeight: 600, color: '#F87171' }}>- ₹{upcomingObligations.toLocaleString('en-IN')}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={{ color: '#60A5FA' }}>Savings Target</span>
          <span style={{ fontWeight: 600, color: '#60A5FA' }}>- ₹{savingsTarget.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
};
