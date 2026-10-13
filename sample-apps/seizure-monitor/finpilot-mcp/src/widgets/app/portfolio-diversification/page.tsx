'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface Allocation {
  sector: string;
  percentage: string;
}

interface Holding {
  ticker: string;
  sector: string;
  value: string;
}

interface PortfolioData {
  totalPortfolioValue: string;
  holdingsAnalyzed: number;
  sectorAllocation: Allocation[];
  holdingDetails: Holding[];
  status: string;
}

export default function PortfolioDiversificationWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<PortfolioData>();

  if (!isReady || !data) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(226, 232, 240, 0.6)', fontFamily: 'system-ui' }}>
        <div style={{ fontSize: '14px' }}>Analyzing portfolio diversification...</div>
      </div>
    );
  }

  if (data.status === 'error') {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgb(239, 68, 68)', fontFamily: 'system-ui', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Error analyzing portfolio</div>
        <div style={{ fontSize: '14px', marginTop: '8px' }}>{(data as any).error || 'Unknown error occurred'}</div>
      </div>
    );
  }

  // Predefined colors for sectors
  const colors = ['59, 130, 246', '16, 185, 129', '139, 92, 246', '245, 158, 11', '236, 72, 153', '6, 182, 212'];

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 41, 59) 100%)',
      padding: '32px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'rgb(226, 232, 240)',
      borderRadius: '24px',
      border: '1px solid rgba(148, 163, 184, 0.15)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0' }}>Portfolio Diversification</h1>
          <div style={{ fontSize: '14px', color: 'rgba(226, 232, 240, 0.6)' }}>{data.holdingsAnalyzed} assets analyzed</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: 'rgba(226, 232, 240, 0.5)', textTransform: 'uppercase' }}>Total Value</div>
          <div style={{ fontSize: '32px', fontWeight: '700', fontFamily: 'monospace', color: 'rgb(16, 185, 129)' }}>
            {data.totalPortfolioValue}
          </div>
        </div>
      </div>

      {/* Sector Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
        {data.sectorAllocation?.map((alloc, idx) => {
          const color = colors[idx % colors.length];
          return (
            <div key={idx}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                <span>{alloc.sector}</span>
                <span style={{ color: `rgb(${color})` }}>{alloc.percentage}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: alloc.percentage, height: '100%', background: `linear-gradient(90deg, rgba(${color}, 0.6), rgb(${color}))`, borderRadius: '4px' }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)', paddingTop: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(226, 232, 240, 0.5)', marginBottom: '16px' }}>HOLDINGS BREAKDOWN</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
          {data.holdingDetails?.map((holding, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>{holding.ticker}</div>
              <div style={{ fontSize: '11px', color: 'rgba(226, 232, 240, 0.4)', textTransform: 'uppercase', marginBottom: '8px' }}>{holding.sector}</div>
              <div style={{ fontFamily: 'monospace', fontWeight: '600', color: 'rgb(96, 165, 250)' }}>{holding.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
