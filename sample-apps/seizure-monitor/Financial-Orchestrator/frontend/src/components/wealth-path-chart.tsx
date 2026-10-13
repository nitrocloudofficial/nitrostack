import * as React from 'react';

export interface WealthPathChartProps {
  currentNetWorth: number;
  paths: {
    CONSERVATIVE: { projectedNetWorth: number; riskDescription: string };
    MODERATE: { projectedNetWorth: number; riskDescription: string };
    AGGRESSIVE: { projectedNetWorth: number; riskDescription: string };
  };
  horizonYears: number;
}

export const WealthPathChart: React.FC<WealthPathChartProps> = ({ currentNetWorth, paths, horizonYears }) => {
  const containerStyle: React.CSSProperties = {
    background: '#0D0E15',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '32px',
    color: '#fff',
    fontFamily: '"Outfit", sans-serif',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    maxWidth: '650px',
    margin: '0 auto',
  };

  const pathCard = (color: string): React.CSSProperties => ({
    background: `linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`,
    borderTop: `2px solid ${color}`,
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'transform 0.2s',
    cursor: 'pointer',
  });

  const valueStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    letterSpacing: '0.5px',
  };

  const multiplierStyle = (color: string): React.CSSProperties => ({
    background: `${color}22`,
    color: color,
    padding: '6px 12px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
  });

  return (
    <div style={containerStyle}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#E2E8F0' }}>Wealth Trajectory</h2>
        <p style={{ margin: '8px 0 0 0', color: '#94A3B8', fontSize: '14px' }}>Projected over {horizonYears} years</p>
        <div style={{ marginTop: '16px', fontSize: '32px', fontWeight: 800, color: '#fff' }}>
          ₹{currentNetWorth.toLocaleString('en-IN')}
          <span style={{ fontSize: '14px', color: '#64748B', marginLeft: '8px', fontWeight: 500 }}>CURRENT</span>
        </div>
      </div>

      <div style={pathCard('#F43F5E')}>
        <div>
          <div style={{ color: '#F43F5E', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>AGGRESSIVE</div>
          <div style={valueStyle}>₹{paths.AGGRESSIVE.projectedNetWorth.toLocaleString('en-IN')}</div>
          <div style={{ color: '#94A3B8', fontSize: '13px', marginTop: '4px' }}>{paths.AGGRESSIVE.riskDescription}</div>
        </div>
        <div style={multiplierStyle('#F43F5E')}>{((paths.AGGRESSIVE.projectedNetWorth / currentNetWorth)).toFixed(1)}x</div>
      </div>

      <div style={pathCard('#3B82F6')}>
        <div>
          <div style={{ color: '#3B82F6', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>MODERATE</div>
          <div style={valueStyle}>₹{paths.MODERATE.projectedNetWorth.toLocaleString('en-IN')}</div>
          <div style={{ color: '#94A3B8', fontSize: '13px', marginTop: '4px' }}>{paths.MODERATE.riskDescription}</div>
        </div>
        <div style={multiplierStyle('#3B82F6')}>{((paths.MODERATE.projectedNetWorth / currentNetWorth)).toFixed(1)}x</div>
      </div>

      <div style={pathCard('#10B981')}>
        <div>
          <div style={{ color: '#10B981', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>CONSERVATIVE</div>
          <div style={valueStyle}>₹{paths.CONSERVATIVE.projectedNetWorth.toLocaleString('en-IN')}</div>
          <div style={{ color: '#94A3B8', fontSize: '13px', marginTop: '4px' }}>{paths.CONSERVATIVE.riskDescription}</div>
        </div>
        <div style={multiplierStyle('#10B981')}>{((paths.CONSERVATIVE.projectedNetWorth / currentNetWorth)).toFixed(1)}x</div>
      </div>
    </div>
  );
};
