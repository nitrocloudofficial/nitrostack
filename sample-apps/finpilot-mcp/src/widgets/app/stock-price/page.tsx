'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface StockPriceData {
  ticker: string;
  currentPrice: number;
  currency: string;
  period: string;
  status: string;
}

export default function StockPriceWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<StockPriceData>();

  if (!isReady || !data) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(226, 232, 240, 0.6)', fontFamily: 'system-ui' }}>
        <div style={{ fontSize: '14px' }}>Fetching market data...</div>
      </div>
    );
  }

  if (data.status === 'error') {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgb(239, 68, 68)', fontFamily: 'system-ui', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Error fetching stock price</div>
        <div style={{ fontSize: '14px', marginTop: '8px' }}>{(data as any).error || 'Unknown error occurred'}</div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 41, 59) 100%)',
      padding: '32px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'rgb(226, 232, 240)',
      borderRadius: '16px',
      border: '1px solid rgba(148, 163, 184, 0.15)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '800', margin: 0, letterSpacing: '-1px' }}>
          {data.ticker}
        </h1>
        <span style={{
          background: 'rgba(59, 130, 246, 0.2)',
          color: 'rgb(96, 165, 250)',
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: '600',
          letterSpacing: '0.5px'
        }}>
          {data.period}
        </span>
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '48px', fontWeight: '700', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
          ${data.currentPrice?.toFixed(2) || '0.00'}
        </span>
        <span style={{ fontSize: '18px', color: 'rgba(226, 232, 240, 0.5)', marginLeft: '8px', fontWeight: '600' }}>
          {data.currency}
        </span>
      </div>
      
      <div style={{ 
        height: '2px', 
        background: 'linear-gradient(90deg, rgb(16, 185, 129), transparent)', 
        marginTop: '24px' 
      }} />
    </div>
  );
}
