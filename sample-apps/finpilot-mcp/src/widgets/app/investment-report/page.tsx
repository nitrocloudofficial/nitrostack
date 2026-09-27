'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface ReportData {
  title: string;
  date: string;
  recommendation: string;
  executiveSummary: string;
  status: string;
}

export default function InvestmentReportWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ReportData>();

  if (!isReady || !data) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(226, 232, 240, 0.6)', fontFamily: 'system-ui' }}>
        <div style={{ fontSize: '14px' }}>Compiling AI Investment Report...</div>
      </div>
    );
  }

  if (data.status === 'error') {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'rgb(239, 68, 68)', fontFamily: 'system-ui', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Error generating report</div>
        <div style={{ fontSize: '14px', marginTop: '8px' }}>{(data as any).error || 'Unknown error occurred'}</div>
      </div>
    );
  }

  const recColors: Record<string, string> = {
    BUY: '16, 185, 129',
    HOLD: '245, 158, 11',
    SELL: '239, 68, 68'
  };
  const accentColor = recColors[data.recommendation] || '59, 130, 246';

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 41, 59) 100%)',
      padding: '40px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'rgb(226, 232, 240)',
      borderRadius: '24px',
      border: '1px solid rgba(148, 163, 184, 0.1)',
      boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
      position: 'relative',
      overflow: 'hidden',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Decorative top gradient */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, transparent, rgb(${accentColor}), transparent)` }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(148, 163, 184, 0.1)', paddingBottom: '24px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>{data.title}</h1>
          <div style={{ fontSize: '14px', color: 'rgba(226, 232, 240, 0.5)', display: 'flex', gap: '16px' }}>
            <span>Generated: {data.date}</span>
            <span>AI Orchestrated Analysis</span>
          </div>
        </div>
        
        <div style={{
          background: `rgba(${accentColor}, 0.1)`,
          border: `1px solid rgba(${accentColor}, 0.3)`,
          borderRadius: '12px',
          padding: '12px 24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', color: 'rgba(226, 232, 240, 0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>AI Conviction</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: `rgb(${accentColor})` }}>{data.recommendation}</div>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'rgba(226, 232, 240, 0.8)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Executive Summary</h2>
        <div style={{
          fontSize: '16px',
          lineHeight: '1.8',
          color: 'rgba(226, 232, 240, 0.9)',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '24px',
          borderRadius: '16px',
          borderLeft: `4px solid rgb(${accentColor})`,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          minHeight: '100px'
        }}>
          {data.executiveSummary || 'No executive summary provided. The orchestrator may not have generated a summary payload for this report.'}
        </div>
      </div>
    </div>
  );
}
