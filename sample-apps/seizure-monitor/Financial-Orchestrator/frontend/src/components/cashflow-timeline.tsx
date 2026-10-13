import * as React from 'react';

export interface CashflowTimelineProps {
  safeToSpend: number;
  burnRate: number;
  runwayMonths: number;
  anomalies: Array<{ date: string; description: string; amount: number; impact: 'HIGH' | 'MEDIUM' | 'LOW' }>;
}

export const CashflowTimeline: React.FC<CashflowTimelineProps> = ({ safeToSpend, burnRate, runwayMonths, anomalies }) => {
  const containerStyle: React.CSSProperties = {
    background: 'linear-gradient(145deg, #1A1A24, #121218)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '24px',
    padding: '32px',
    color: '#ffffff',
    fontFamily: '"Outfit", "Inter", sans-serif',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    maxWidth: '600px',
    margin: '0 auto',
  };

  const metricsRow: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  };

  const metricBox: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    textAlign: 'center',
    transition: 'transform 0.3s ease',
  };

  const valueStyle = (highlight: boolean): React.CSSProperties => ({
    fontSize: '28px',
    fontWeight: 700,
    margin: '8px 0 0 0',
    background: highlight ? 'linear-gradient(45deg, #42E695, #3BB2B8)' : '#FFF',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: highlight ? 'transparent' : '#FFF',
  });

  const anomalyItem: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: 'rgba(255, 75, 75, 0.05)',
    borderLeft: '4px solid #FF4B4B',
    borderRadius: '8px',
    marginBottom: '12px',
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ margin: '0 0 24px 0', fontSize: '22px', color: '#A0A0B0', fontWeight: 500 }}>Cashflow Guardian</h2>
      
      <div style={metricsRow}>
        <div style={metricBox}>
          <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Safe to Spend</div>
          <div style={valueStyle(true)}>₹{safeToSpend.toLocaleString('en-IN')}</div>
        </div>
        <div style={metricBox}>
          <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Monthly Burn</div>
          <div style={valueStyle(false)}>₹{burnRate.toLocaleString('en-IN')}</div>
        </div>
        <div style={metricBox}>
          <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Runway</div>
          <div style={valueStyle(runwayMonths > 6)}>~{Math.round(runwayMonths)} mo</div>
        </div>
      </div>

      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#E0E0E0' }}>Recent Anomalies</h3>
      {anomalies.length > 0 ? (
        anomalies.map((a, i) => (
          <div key={i} style={anomalyItem}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>{a.description}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{new Date(a.date).toLocaleDateString()}</div>
            </div>
            <div style={{ fontWeight: 700, color: '#FF4B4B', fontSize: '16px' }}>
              -₹{a.amount.toLocaleString('en-IN')}
            </div>
          </div>
        ))
      ) : (
        <div style={{ padding: '24px', textAlign: 'center', color: '#666', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          No recent cashflow anomalies detected.
        </div>
      )}
    </div>
  );
};
