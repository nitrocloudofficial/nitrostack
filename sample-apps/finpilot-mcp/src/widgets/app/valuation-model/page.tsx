'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface ValuationData {
  ticker: string;
  valuationMethod: string;
  assumptions: {
    growthRate: string;
    discountRate: string;
  };
  results: {
    currentPrice: string;
    intrinsicValue: string;
    marginOfSafety: string;
  };
  recommendation: string;
  status: string;
}

export default function ValuationModelWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ValuationData>();

  if (!isReady || !data) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(226, 232, 240, 0.6)', fontFamily: 'system-ui' }}>
        <div style={{ fontSize: '14px' }}>Running DCF Valuation model...</div>
      </div>
    );
  }

  if (data.status === 'error') {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgb(239, 68, 68)', fontFamily: 'system-ui', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Error running valuation</div>
        <div style={{ fontSize: '14px', marginTop: '8px' }}>{(data as any).error || 'Unknown error occurred'}</div>
      </div>
    );
  }

  const isBuy = data.recommendation.includes('BUY');
  const accentColor = isBuy ? '16, 185, 129' : '239, 68, 68'; // Emerald for BUY, Red for SELL

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 41, 59) 100%)',
      padding: '32px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'rgb(226, 232, 240)',
      borderRadius: '24px',
      border: `1px solid rgba(${accentColor}, 0.2)`,
      boxShadow: `0 20px 60px rgba(${accentColor}, 0.1)`,
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 4px 0' }}>{data.ticker} Valuation</h1>
          <div style={{ fontSize: '14px', color: 'rgba(226, 232, 240, 0.5)' }}>{data.valuationMethod}</div>
        </div>
        <div style={{
          background: `rgba(${accentColor}, 0.15)`,
          border: `1px solid rgba(${accentColor}, 0.3)`,
          color: `rgb(${accentColor})`,
          padding: '8px 16px',
          borderRadius: '9999px',
          fontWeight: '700',
          fontSize: '14px',
          letterSpacing: '0.5px'
        }}>
          {data.recommendation}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(226, 232, 240, 0.6)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>Current Price</div>
          <div style={{ fontSize: '32px', fontWeight: '700', fontFamily: 'monospace' }}>{data.results.currentPrice}</div>
        </div>
        <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(226, 232, 240, 0.6)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>Intrinsic Value</div>
          <div style={{ fontSize: '32px', fontWeight: '700', fontFamily: 'monospace', color: `rgb(${accentColor})` }}>{data.results.intrinsicValue}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '16px' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'rgba(226, 232, 240, 0.5)' }}>Growth Rate</div>
          <div style={{ fontWeight: '600' }}>{data.assumptions.growthRate}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'rgba(226, 232, 240, 0.5)' }}>Discount Rate</div>
          <div style={{ fontWeight: '600' }}>{data.assumptions.discountRate}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: 'rgba(226, 232, 240, 0.5)' }}>Margin of Safety</div>
          <div style={{ fontWeight: '700', color: `rgb(${accentColor})` }}>{data.results.marginOfSafety}</div>
        </div>
      </div>
    </div>
  );
}
