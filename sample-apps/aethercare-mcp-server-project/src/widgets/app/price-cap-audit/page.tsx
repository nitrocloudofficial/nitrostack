'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface PriceAuditData {
  procedureKey?: string;
  category?: string;
  legalMaxINR?: number;
  quotedPriceINR?: number | null;
  isExceeded?: boolean;
  excessAmountINR?: number;
  status?: string;
  regulatoryOrder?: string;
  officialDetails?: string;
  legalConsumerRight?: string;
  hospitalName?: string;
  totalBilledINR?: number;
  totalCapExcessINR?: number;
  lineItemsAudit?: Array<{
    item: string;
    charged: number;
    maxAllowed: number;
    status: string;
    flag: string | null;
  }>;
}

export default function PriceCapAuditWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';

  const data: PriceAuditData = rawData?.result || (rawData?.legalMaxINR !== undefined || rawData?.totalBilledINR !== undefined ? rawData : (rawData?.output || rawData || {}));
  const lineItems = Array.isArray(data?.lineItemsAudit) ? data.lineItemsAudit : [];
  const legalMax = data?.legalMaxINR ?? 0;

  if (!rawData || !data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        background: isDark ? '#1e293b' : '#f8fafc',
        color: isDark ? '#f1f5f9' : '#0f172a',
        borderRadius: '16px'
      }}>
        ⚖️ Auditing NPPA Price Ceiling & Billing Compliance...
      </div>
    );
  }

  const isFraud = data?.status === 'FRAUD_OVERCHARGE_RISK' || (data?.totalCapExcessINR && data.totalCapExcessINR > 0);

  return (
    <div style={{
      padding: '20px',
      background: isDark
        ? 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)'
        : 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)',
      borderRadius: '20px',
      color: isDark ? '#ffffff' : '#0f172a',
      maxWidth: '480px',
      boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      border: '2px solid ' + (isFraud ? '#ef4444' : '#10b981')
    }}>
      {/* Header Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>{isFraud ? '🚨' : '🛡️'}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
              {isFraud ? 'Price Cap Violation Alert' : 'NPPA Legal Price Verified'}
            </h3>
            <span style={{ fontSize: '12px', opacity: 0.7 }}>
              {data?.regulatoryOrder || 'DPCO 2013 / NHA Schedule 2026'}
            </span>
          </div>
        </div>

        <span style={{
          background: isFraud ? '#ef4444' : '#10b981',
          color: 'white',
          fontSize: '11px',
          fontWeight: 'bold',
          padding: '4px 10px',
          borderRadius: '20px'
        }}>
          {isFraud ? 'HIGH RISK' : 'COMPLIANT'}
        </span>
      </div>

      {/* Main Figures Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        padding: '14px',
        borderRadius: '14px',
        marginBottom: '14px'
      }}>
        <div>
          <span style={{ fontSize: '11px', opacity: 0.7, display: 'block' }}>Legal Max Price Ceiling</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
            ₹{legalMax ? legalMax.toLocaleString('en-IN') : '0'}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '11px', opacity: 0.7, display: 'block' }}>Hospital Quoted Price</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: isFraud ? '#ef4444' : '#3b82f6' }}>
            {data?.quotedPriceINR ? `₹${data.quotedPriceINR.toLocaleString('en-IN')}` : (data?.totalBilledINR ? `₹${data.totalBilledINR.toLocaleString('en-IN')}` : 'N/A')}
          </span>
        </div>
      </div>

      {/* Excess Warning Box */}
      {isFraud && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          borderLeft: '4px solid #ef4444',
          padding: '10px 12px',
          borderRadius: '8px',
          marginBottom: '14px',
          fontSize: '12px'
        }}>
          <strong style={{ color: '#ef4444' }}>Illegal Overcharge Detected:</strong>
          <p style={{ margin: '4px 0 0 0' }}>
            The hospital quote exceeds the statutory maximum ceiling by{' '}
            <strong style={{ color: '#ef4444' }}>
              ₹{(data?.excessAmountINR || data?.totalCapExcessINR || 0).toLocaleString('en-IN')}
            </strong>.
          </p>
        </div>
      )}

      {/* Line items if audit */}
      {lineItems.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', opacity: 0.9 }}>Line-Item Audit Details</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {lineItems.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                padding: '6px 8px',
                background: item?.flag ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)',
                borderRadius: '6px'
              }}>
                <span>{item?.item || 'Item'}</span>
                <span style={{ fontWeight: 600, color: item?.flag ? '#ef4444' : 'inherit' }}>
                  ₹{(item?.charged || 0).toLocaleString('en-IN')} {item?.flag && '⚠️'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ margin: 0, fontSize: '11px', opacity: 0.75, fontStyle: 'italic' }}>
        💡 {data?.legalConsumerRight || 'Under DPCO 2013, charging above legal price cap is a punishable offense. You have the right to demand official package rates.'}
      </p>
    </div>
  );
}
