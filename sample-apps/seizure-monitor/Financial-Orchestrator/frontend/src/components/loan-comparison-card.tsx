import * as React from 'react';

export interface LoanComparisonCardProps {
  bankName: string;
  loanType: string;
  requestedAmount: number;
  tenureMonths: number;
  policy: {
    interestRate: number;
    processingFee: number;
    prepaymentPenalty: number;
    floatingRate: boolean;
  };
  analysis: {
    warnings: string[];
    benefits: string[];
    overallAssessment: 'FAVORABLE_TERMS' | 'CAUTION_ADVISED';
  };
}

export const LoanComparisonCard: React.FC<LoanComparisonCardProps> = ({ bankName, loanType, requestedAmount, tenureMonths, policy, analysis }) => {
  const containerStyle: React.CSSProperties = {
    background: '#18181B',
    border: `1px solid ${analysis.overallAssessment === 'FAVORABLE_TERMS' ? '#059669' : '#DC2626'}`,
    borderRadius: '20px',
    padding: '32px',
    color: '#fff',
    fontFamily: '"Inter", sans-serif',
    maxWidth: '500px',
    margin: '0 auto',
    boxShadow: `0 10px 30px ${analysis.overallAssessment === 'FAVORABLE_TERMS' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)'}`,
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    background: analysis.overallAssessment === 'FAVORABLE_TERMS' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
    color: analysis.overallAssessment === 'FAVORABLE_TERMS' ? '#10B981' : '#EF4444',
    marginBottom: '24px',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  };

  const statLabel: React.CSSProperties = { fontSize: '13px', color: '#A1A1AA', marginBottom: '4px' };
  const statValue: React.CSSProperties = { fontSize: '18px', fontWeight: 600, color: '#F4F4F5' };

  return (
    <div style={containerStyle}>
      <div style={badgeStyle}>
        {analysis.overallAssessment === 'FAVORABLE_TERMS' ? '✅ Favorable Terms' : '⚠️ Caution Advised'}
      </div>
      
      <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 700 }}>{bankName}</h2>
      <p style={{ margin: '0 0 24px 0', color: '#A1A1AA', fontSize: '14px' }}>{loanType} • ₹{requestedAmount.toLocaleString('en-IN')} for {tenureMonths} mo</p>

      <div style={gridStyle}>
        <div>
          <div style={statLabel}>Interest Rate</div>
          <div style={{ ...statValue, color: '#38BDF8' }}>{policy.interestRate}% {policy.floatingRate ? '(Floating)' : '(Fixed)'}</div>
        </div>
        <div>
          <div style={statLabel}>Processing Fee</div>
          <div style={statValue}>{policy.processingFee}%</div>
        </div>
        <div>
          <div style={statLabel}>Prepayment Penalty</div>
          <div style={statValue}>{policy.prepaymentPenalty}%</div>
        </div>
      </div>

      <div>
        {analysis.benefits.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: '#10B981', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>Benefits</div>
            {analysis.benefits.map((b, i) => <div key={i} style={{ fontSize: '14px', color: '#D1D5DB', marginBottom: '4px', display: 'flex', gap: '8px' }}><span>✓</span> <span>{b}</span></div>)}
          </div>
        )}
        {analysis.warnings.length > 0 && (
          <div>
            <div style={{ fontSize: '13px', color: '#EF4444', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>Watch Out For</div>
            {analysis.warnings.map((w, i) => <div key={i} style={{ fontSize: '14px', color: '#D1D5DB', marginBottom: '4px', display: 'flex', gap: '8px' }}><span>!</span> <span>{w}</span></div>)}
          </div>
        )}
      </div>
    </div>
  );
};
