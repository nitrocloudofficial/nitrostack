'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface PharmacyAuditData {
  medicineKey?: string;
  brandName?: string;
  genericName?: string;
  nlemSchedule?: string;
  quantityPurchased?: number;
  unitType?: string;
  statutoryMaxPricePerUnitINR?: number;
  legalMaxTotalINR?: number;
  hospitalPharmacyChargedTotalINR?: number | null;
  isOvercharged?: boolean;
  excessAmountINR?: number;
  status?: string;
  legalRecourse?: string;
}

export default function PharmacyAuditWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const data: PharmacyAuditData = rawData?.result || (rawData?.brandName ? rawData : (rawData?.output || rawData || {}));
  const isOvercharged = data?.isOvercharged || data?.status === 'ILLEGAL_MEDICINE_OVERCHARGE';

  if (!rawData || !data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        background: isDark ? '#1e293b' : '#f8fafc',
        color: isDark ? '#f1f5f9' : '#0f172a',
        borderRadius: '16px'
      }}>
        💊 Auditing Pharmacy Essential Drug Ceiling Price...
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      background: isDark
        ? 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)'
        : 'linear-gradient(135deg, #fff1f2 0%, #ffffff 100%)',
      borderRadius: '20px',
      color: isDark ? '#ffffff' : '#0f172a',
      maxWidth: '480px',
      boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      border: '2px solid ' + (isOvercharged ? '#e11d48' : '#059669')
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>💊</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>NLEM Drug Price Ceiling Audit</h3>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>{data?.nlemSchedule || 'NLEM 2026 Schedule'}</span>
          </div>
        </div>

        <span style={{
          background: isOvercharged ? '#e11d48' : '#059669',
          color: 'white',
          fontSize: '11px',
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: '20px'
        }}>
          {isOvercharged ? 'OVERCHARGED' : 'NPPA COMPLIANT'}
        </span>
      </div>

      {/* Drug Info Box */}
      <div style={{
        background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
        border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
        padding: '12px',
        borderRadius: '12px',
        marginBottom: '14px'
      }}>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{data?.brandName || 'Essential Medicine'}</h4>
        <p style={{ margin: '2px 0 0 0', fontSize: '12px', opacity: 0.75 }}>Generic: {data?.genericName}</p>
        <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.85 }}>
          Quantity: <strong>{data?.quantityPurchased} {data?.unitType}s</strong> • Max Price/Unit: <strong>₹{data?.statutoryMaxPricePerUnitINR}</strong>
        </div>
      </div>

      {/* Figures Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        marginBottom: '14px'
      }}>
        <div style={{
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
          padding: '10px',
          borderRadius: '10px'
        }}>
          <span style={{ fontSize: '11px', opacity: 0.7, display: 'block' }}>Legal Max Total</span>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669' }}>
            ₹{data?.legalMaxTotalINR?.toFixed(2)}
          </span>
        </div>

        <div style={{
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
          padding: '10px',
          borderRadius: '10px'
        }}>
          <span style={{ fontSize: '11px', opacity: 0.7, display: 'block' }}>Pharmacy Charged</span>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: isOvercharged ? '#e11d48' : '#2563eb' }}>
            {data?.hospitalPharmacyChargedTotalINR ? `₹${data.hospitalPharmacyChargedTotalINR.toFixed(2)}` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Recourse */}
      <p style={{ margin: 0, fontSize: '11px', opacity: 0.8, fontStyle: 'italic' }}>
        💡 {data?.legalRecourse || 'Pharmacies charging above NLEM maximum retail price commit DPCO offenses.'}
      </p>
    </div>
  );
}
