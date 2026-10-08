'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface RebateData {
  illegalCashPaidINR?: number;
  daysElapsed?: number;
  penaltyInterestRatePercent?: number;
  penaltyInterestAccruedINR?: number;
  totalReimbursementEntitlementINR?: number;
  legalDirective?: string;
}

export default function RebateCalculatorWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const data: RebateData = rawData?.result || (rawData?.illegalCashPaidINR ? rawData : (rawData?.output || rawData || {}));

  if (!rawData || !data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        background: isDark ? '#1e293b' : '#f8fafc',
        color: isDark ? '#f1f5f9' : '#0f172a',
        borderRadius: '16px'
      }}>
        💰 Calculating Out-of-Pocket Cashless Refund & Interest Penalty...
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      background: isDark
        ? 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)'
        : 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
      borderRadius: '20px',
      color: isDark ? '#ffffff' : '#0f172a',
      maxWidth: '480px',
      boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      border: '2px solid #10b981'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>💵</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Cashless Rebate & Penalty Calculator</h3>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>NHA Clause 16.4 Statutory Refund</span>
          </div>
        </div>

        <span style={{
          background: '#10b981',
          color: 'white',
          fontSize: '11px',
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: '20px'
        }}>
          100% REIMBURSEABLE
        </span>
      </div>

      {/* Main Total Entitlement */}
      <div style={{
        background: 'linear-gradient(135deg, #10b981, #059669)',
        color: 'white',
        padding: '14px',
        borderRadius: '14px',
        textAlign: 'center',
        marginBottom: '14px'
      }}>
        <span style={{ fontSize: '11px', opacity: 0.9, textTransform: 'uppercase' }}>Total Refund & Penalty Due</span>
        <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '2px' }}>
          ₹{(data?.totalReimbursementEntitlementINR || 0).toLocaleString('en-IN')}
        </div>
      </div>

      {/* Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        fontSize: '12px',
        marginBottom: '14px'
      }}>
        <div style={{
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
          padding: '10px',
          borderRadius: '10px'
        }}>
          <span style={{ opacity: 0.7, display: 'block', fontSize: '11px' }}>Principal Cash Paid</span>
          <strong style={{ fontSize: '15px' }}>₹{(data?.illegalCashPaidINR || 0).toLocaleString('en-IN')}</strong>
        </div>

        <div style={{
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
          padding: '10px',
          borderRadius: '10px'
        }}>
          <span style={{ opacity: 0.7, display: 'block', fontSize: '11px' }}>12% Statutory Interest</span>
          <strong style={{ fontSize: '15px', color: '#10b981' }}>+ ₹{(data?.penaltyInterestAccruedINR || 0).toLocaleString('en-IN')}</strong>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: '11px', opacity: 0.8, fontStyle: 'italic' }}>
        💡 {data?.legalDirective || 'Under NHA PM-JAY Clause 16.4, hospitals must issue a 100% full refund plus statutory penalty interest within 7 days of complaint.'}
      </p>
    </div>
  );
}
