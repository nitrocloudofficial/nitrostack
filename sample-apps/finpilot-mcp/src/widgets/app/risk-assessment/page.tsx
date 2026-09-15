'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface RiskData {
  ticker: string;
  riskMetrics: {
    beta: string;
    debtToEquity: string;
  };
  overallRisk: string;
  status: string;
}

export default function RiskAssessmentWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<RiskData>();

  if (!isReady || !data) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(226, 232, 240, 0.6)', fontFamily: 'system-ui' }}>
        <div style={{ fontSize: '14px' }}>Assessing risk profile...</div>
      </div>
    );
  }

  if (data.status === 'error') {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgb(239, 68, 68)', fontFamily: 'system-ui', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Error assessing risk</div>
        <div style={{ fontSize: '14px', marginTop: '8px' }}>{(data as any).error || 'Unknown error occurred'}</div>
      </div>
    );
  }

  let color = '245, 158, 11'; // Moderate = Yellow/Amber
  if (data.overallRisk === 'Low') color = '16, 185, 129'; // Low = Green
  if (data.overallRisk === 'High') color = '239, 68, 68'; // High = Red

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 41, 59) 100%)',
      padding: '40px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'rgb(226, 232, 240)',
      borderRadius: '24px',
      border: '1px solid rgba(148, 163, 184, 0.1)',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Background Glow */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '300px',
        height: '300px',
        background: `radial-gradient(circle, rgba(${color}, 0.15) 0%, transparent 70%)`,
        zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(226, 232, 240, 0.6)', marginBottom: '8px' }}>
          Risk Profile • {data.ticker}
        </div>
        
        <div style={{
          fontSize: '48px',
          fontWeight: '800',
          color: `rgb(${color})`,
          textShadow: `0 0 20px rgba(${color}, 0.4)`,
          marginBottom: '40px'
        }}>
          {data.overallRisk}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'rgba(226, 232, 240, 0.5)', textTransform: 'uppercase' }}>Beta (Volatility)</div>
            <div style={{ fontSize: '24px', fontWeight: '600', fontFamily: 'monospace' }}>{data.riskMetrics.beta}</div>
          </div>
          <div style={{ width: '1px', background: 'rgba(148, 163, 184, 0.2)' }} />
          <div>
            <div style={{ fontSize: '12px', color: 'rgba(226, 232, 240, 0.5)', textTransform: 'uppercase' }}>Debt/Equity</div>
            <div style={{ fontSize: '24px', fontWeight: '600', fontFamily: 'monospace' }}>{data.riskMetrics.debtToEquity}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
