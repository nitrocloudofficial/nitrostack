import * as React from 'react';

export interface BRVScoreCardProps {
  score: number;
  tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';
  relationshipYears: number;
  totalAUM: number;
  productsHeld: number;
}

export const BRVScoreCard: React.FC<BRVScoreCardProps> = ({ score, tier, relationshipYears, totalAUM, productsHeld }) => {
  const getTierColors = (t: string) => {
    switch(t) {
      case 'PLATINUM': return { bg: 'linear-gradient(135deg, #1E293B, #0F172A)', border: '#CBD5E1', text: '#F8FAFC', accent: '#E2E8F0' };
      case 'GOLD': return { bg: 'linear-gradient(135deg, #422006, #1C1917)', border: '#FBBF24', text: '#FEF3C7', accent: '#F59E0B' };
      case 'SILVER': return { bg: 'linear-gradient(135deg, #334155, #1E293B)', border: '#94A3B8', text: '#F1F5F9', accent: '#CBD5E1' };
      default: return { bg: 'linear-gradient(135deg, #451A03, #292524)', border: '#D97706', text: '#FEF3C7', accent: '#B45309' };
    }
  };

  const colors = getTierColors(tier);

  const containerStyle: React.CSSProperties = {
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: '20px',
    padding: '32px',
    color: colors.text,
    fontFamily: '"Inter", sans-serif',
    maxWidth: '450px',
    margin: '0 auto',
    boxShadow: `0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)`,
    position: 'relative',
    overflow: 'hidden',
  };

  const statBox: React.CSSProperties = {
    background: 'rgba(0,0,0,0.2)',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center',
  };

  return (
    <div style={containerStyle}>
      {/* Decorative reflection */}
      <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)', transform: 'skewX(-20deg)' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px', color: colors.accent }}>Bank Relationship Value</h2>
          <div style={{ fontSize: '32px', fontWeight: 800 }}>{tier} TIER</div>
        </div>
        <div style={{ background: colors.accent, color: '#000', padding: '8px 16px', borderRadius: '24px', fontSize: '18px', fontWeight: 700 }}>
          {score}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={statBox}>
          <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px', textTransform: 'uppercase' }}>Vintage</div>
          <div style={{ fontSize: '20px', fontWeight: 600 }}>{relationshipYears} Years</div>
        </div>
        <div style={statBox}>
          <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px', textTransform: 'uppercase' }}>Products</div>
          <div style={{ fontSize: '20px', fontWeight: 600 }}>{productsHeld} Linked</div>
        </div>
        <div style={{ ...statBox, gridColumn: 'span 2' }}>
          <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px', textTransform: 'uppercase' }}>Total Relationship Value (AUM)</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: colors.accent }}>₹{totalAUM.toLocaleString('en-IN')}</div>
        </div>
      </div>
    </div>
  );
};
