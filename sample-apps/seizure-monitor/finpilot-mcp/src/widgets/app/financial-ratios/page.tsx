'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface RatiosData {
  ticker: string;
  ratios: {
    peRatio: string;
    debtToEquity: string;
    returnOnEquity: string;
  };
  status: string;
}

export default function FinancialRatiosWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<RatiosData>();

  if (!isReady || !data) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(226, 232, 240, 0.6)', fontFamily: 'system-ui' }}>
        <div style={{ fontSize: '14px' }}>Calculating financial ratios...</div>
      </div>
    );
  }

  if (data.status === 'error') {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgb(239, 68, 68)', fontFamily: 'system-ui', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Error calculating ratios</div>
        <div style={{ fontSize: '14px', marginTop: '8px' }}>{(data as any).error || 'Unknown error occurred'}</div>
      </div>
    );
  }

  const ratios = data.ratios || {};

  const cards = [
    { label: 'Forward P/E', value: ratios.peRatio, icon: '📊', color: '139, 92, 246' }, // Violet
    { label: 'Debt to Equity', value: ratios.debtToEquity, icon: '⚖️', color: '236, 72, 153' }, // Pink
    { label: 'Return on Equity', value: ratios.returnOnEquity, icon: '🚀', color: '245, 158, 11' }, // Amber
  ];

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 41, 59) 100%)',
      padding: '32px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'rgb(226, 232, 240)',
      borderRadius: '16px',
      border: '1px solid rgba(148, 163, 184, 0.15)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>Financial Ratios</span>
          <span style={{ fontSize: '14px', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '20px' }}>
            {data.ticker}
          </span>
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
        {cards.map((card, idx) => (
          <div key={idx} style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(12px)',
            border: `1px solid rgba(${card.color}, 0.3)`,
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            boxShadow: `0 10px 30px rgba(${card.color}, 0.1)`
          }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>{card.icon}</div>
            <div style={{ fontSize: '12px', color: 'rgba(226, 232, 240, 0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', fontWeight: '600' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: `rgb(${card.color})`, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
