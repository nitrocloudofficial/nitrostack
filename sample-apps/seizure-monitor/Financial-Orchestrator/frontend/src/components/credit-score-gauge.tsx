import * as React from 'react';

export interface CreditScoreGaugeProps {
  score: number;
  maxScore: number;
  factors: string[];
}

export const CreditScoreGauge: React.FC<CreditScoreGaugeProps> = ({ score, maxScore = 900, factors }) => {
  const percentage = (score / maxScore) * 100;
  
  const getColor = (p: number) => {
    if (p >= 80) return '#00E676';
    if (p >= 60) return '#FFEA00';
    return '#FF1744';
  };

  const containerStyle: React.CSSProperties = {
    background: '#121212',
    border: '1px solid #2A2A2A',
    borderRadius: '24px',
    padding: '40px',
    color: '#fff',
    fontFamily: '"Outfit", sans-serif',
    maxWidth: '450px',
    margin: '0 auto',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  };

  const gaugeContainer: React.CSSProperties = {
    position: 'relative',
    width: '240px',
    height: '120px',
    margin: '0 auto 32px auto',
    overflow: 'hidden',
  };

  const gaugeArc: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '240px',
    height: '240px',
    borderRadius: '50%',
    border: '24px solid #222',
    borderBottomColor: 'transparent',
    borderRightColor: 'transparent',
    transform: 'rotate(45deg)',
    boxSizing: 'border-box',
  };

  const gaugeFill: React.CSSProperties = {
    ...gaugeArc,
    borderTopColor: getColor(percentage),
    borderLeftColor: getColor(percentage),
    transform: `rotate(${45 + (percentage / 100) * 180}deg)`,
    transition: 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div style={containerStyle}>
      <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: `radial-gradient(circle, ${getColor(percentage)}22 0%, rgba(0,0,0,0) 70%)`, pointerEvents: 'none' }} />
      
      <h2 style={{ color: '#A0A0A0', fontSize: '18px', fontWeight: 500, margin: '0 0 40px 0', textTransform: 'uppercase', letterSpacing: '2px' }}>Alt-Credit Score</h2>
      
      <div style={gaugeContainer}>
        <div style={gaugeArc} />
        <div style={gaugeFill} />
        <div style={{ position: 'absolute', bottom: '10px', left: '0', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', fontWeight: 800, lineHeight: '1', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>{score}</div>
          <div style={{ fontSize: '14px', color: '#888', marginTop: '4px' }}>out of {maxScore}</div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '20px', textAlign: 'left' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#A0A0A0' }}>Key Factors</h3>
        <ul style={{ margin: 0, padding: '0 0 0 16px', color: '#E0E0E0', fontSize: '14px', lineHeight: '1.6' }}>
          {factors.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
