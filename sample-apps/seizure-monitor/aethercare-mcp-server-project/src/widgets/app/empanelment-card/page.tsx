'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface Hospital {
  id: string;
  name: string;
  city: string;
  state: string;
  pincode: string;
  empanelmentStatus: 'EMPANELED_ACTIVE' | 'SUSPENDED' | 'BLACK_LISTED' | 'UNDER_REVIEW';
  schemesSupported?: string[];
  cashlessFacility: boolean;
  icuBedsAvailable: number;
  lastInspectionDate: string;
  warningFlags?: string[];
  contactPhone: string;
  address: string;
}

export default function EmpanelmentCard() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';

  // Normalize data payload
  const data = rawData?.result || (rawData?.hospitals ? rawData : (rawData?.output || rawData));
  const hospitals: Hospital[] = Array.isArray(data?.hospitals) ? data.hospitals : [];

  if (!data || !rawData) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        background: isDark ? '#1e293b' : '#f8fafc',
        color: isDark ? '#f1f5f9' : '#0f172a',
        borderRadius: '16px',
        border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0')
      }}>
        🏥 Fetching AetherCare Hospital Empanelment Data...
      </div>
    );
  }

  const getStatusBadge = (status?: Hospital['empanelmentStatus']) => {
    switch (status) {
      case 'EMPANELED_ACTIVE':
        return { label: 'Active & Empaneled', bg: '#10b981', icon: '✅' };
      case 'SUSPENDED':
        return { label: 'Suspended (Audit Investigation)', bg: '#f59e0b', icon: '⚠️' };
      case 'BLACK_LISTED':
        return { label: 'Blacklisted (Fraud Order)', bg: '#ef4444', icon: '🚫' };
      case 'UNDER_REVIEW':
      default:
        return { label: 'Under Compliance Review', bg: '#6366f1', icon: '🔍' };
    }
  };

  return (
    <div style={{
      padding: '20px',
      background: isDark
        ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)'
        : 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
      borderRadius: '20px',
      color: isDark ? '#ffffff' : '#0f172a',
      maxWidth: '480px',
      boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0284c7, #2563eb)',
            padding: '8px 12px',
            borderRadius: '12px',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            🏥
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Hospital Empanelment Radar</h3>
            <span style={{ fontSize: '12px', opacity: 0.7 }}>Query: "{data?.searchQuery || 'All'}" • Found: {hospitals.length}</span>
          </div>
        </div>
        <span style={{
          fontSize: '11px',
          background: 'rgba(14, 165, 233, 0.15)',
          color: '#0284c7',
          padding: '4px 8px',
          borderRadius: '20px',
          fontWeight: 600
        }}>
          NHA Live Sync
        </span>
      </div>

      {hospitals.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', opacity: 0.8, fontSize: '14px' }}>
          No hospitals found matching your query.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {hospitals.map(h => {
            const statusInfo = getStatusBadge(h?.empanelmentStatus);
            const warningFlags = Array.isArray(h?.warningFlags) ? h.warningFlags : [];
            const schemesSupported = Array.isArray(h?.schemesSupported) ? h.schemesSupported : [];

            return (
              <div key={h?.id || Math.random().toString()} style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
                borderRadius: '14px',
                padding: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{h?.name || 'Hospital'}</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', opacity: 0.7 }}>📍 {h?.address || 'India'}</p>
                  </div>
                  <span style={{
                    background: statusInfo.bg,
                    color: 'white',
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}>
                    {statusInfo.icon} {statusInfo.label}
                  </span>
                </div>

                {/* Warning Alert if present */}
                {warningFlags.length > 0 && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    borderLeft: '3px solid #ef4444',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    fontSize: '11px',
                    color: isDark ? '#fca5a5' : '#b91c1c'
                  }}>
                    ⚠️ <strong>Fraud / Security Alert:</strong> {warningFlags.join('; ')}
                  </div>
                )}

                {/* Features & Schemes */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    background: h?.cashlessFacility ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: h?.cashlessFacility ? '#10b981' : '#ef4444',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontWeight: 600
                  }}>
                    💳 Cashless: {h?.cashlessFacility ? 'YES' : 'NO'}
                  </span>

                  <span style={{
                    fontSize: '11px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#3b82f6',
                    padding: '2px 8px',
                    borderRadius: '8px'
                  }}>
                    🛏️ ICU Beds Free: {h?.icuBedsAvailable ?? 0}
                  </span>

                  {schemesSupported.map((sch, i) => (
                    <span key={i} style={{
                      fontSize: '10px',
                      background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      opacity: 0.85
                    }}>
                      {sch}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '16px', fontSize: '11px', textAlign: 'center', opacity: 0.6 }}>
        ✨ Powered by AetherCare Agentic MoE • NitroStack MCP
      </div>
    </div>
  );
}
