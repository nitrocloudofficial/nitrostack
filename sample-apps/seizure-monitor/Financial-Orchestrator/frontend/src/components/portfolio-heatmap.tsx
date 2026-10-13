import * as React from 'react';

export interface PortfolioHeatmapProps {
  holdings: Array<{
    symbol: string;
    weight: number; // percentage 0-100
    performance: number; // percentage e.g. -5.2, +12.4
  }>;
}

export const PortfolioHeatmap: React.FC<PortfolioHeatmapProps> = ({ holdings }) => {
  const containerStyle: React.CSSProperties = {
    background: '#0B0D17',
    borderRadius: '24px',
    padding: '32px',
    color: '#ffffff',
    fontFamily: '"Inter", sans-serif',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1), 0 20px 40px rgba(0,0,0,0.5)',
    maxWidth: '700px',
    margin: '0 auto',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '12px',
    marginTop: '24px',
  };

  const getHeatColor = (perf: number) => {
    if (perf > 10) return '#059669'; // Deep Green
    if (perf > 0) return '#10B981'; // Green
    if (perf === 0) return '#475569'; // Slate
    if (perf > -5) return '#EF4444'; // Red
    return '#B91C1C'; // Deep Red
  };

  const blockStyle = (holding: any): React.CSSProperties => ({
    background: getHeatColor(holding.performance),
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '100px',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
    transition: 'transform 0.2s',
  });

  return (
    <div style={containerStyle}>
      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Portfolio Heatmap
        <span style={{ fontSize: '13px', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '12px', fontWeight: 400 }}>Live Performance</span>
      </h2>
      
      <div style={gridStyle}>
        {holdings.map((h, i) => (
          <div key={i} style={blockStyle(h)}>
            <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '0.5px' }}>{h.symbol}</div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800 }}>
                {h.performance > 0 ? '+' : ''}{h.performance}%
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                {h.weight}% of port.
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
