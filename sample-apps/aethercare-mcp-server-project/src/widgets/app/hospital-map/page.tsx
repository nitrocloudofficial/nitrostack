'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface GeoHospital {
  id: string;
  name: string;
  city: string;
  address: string;
  distanceKm: number;
  empanelmentStatus: 'EMPANELED_ACTIVE' | 'SUSPENDED' | 'BLACK_LISTED';
  cashlessFacility: boolean;
  icuBedsAvailable: number;
  contactPhone: string;
}

export default function HospitalMapWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const data = rawData?.result || (rawData?.hospitals ? rawData : (rawData?.output || rawData || {}));
  const hospitals: GeoHospital[] = Array.isArray(data?.hospitals) ? data.hospitals : [];

  if (!rawData || !data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        background: isDark ? '#0f172a' : '#f8fafc',
        color: isDark ? '#f1f5f9' : '#0f172a',
        borderRadius: '16px'
      }}>
        📍 Calculating Nearest Cashless Hospitals Radius...
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      background: isDark
        ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)'
        : 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
      borderRadius: '20px',
      color: isDark ? '#ffffff' : '#0f172a',
      maxWidth: '480px',
      boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      border: '1px solid ' + (isDark ? 'rgba(59, 130, 246, 0.3)' : '#cbd5e1')
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            padding: '8px 12px',
            borderRadius: '12px',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            📍
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Nearest Empaneled Radar</h3>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>Location: {data?.searchLocation || 'Current GPS'} • Max Radius: {data?.radiusKm || 10}km</span>
          </div>
        </div>

        <span style={{
          background: 'rgba(37, 99, 235, 0.15)',
          color: '#2563eb',
          fontSize: '11px',
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: '20px'
        }}>
          {hospitals.length} Nearby
        </span>
      </div>

      {/* Hospital Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {hospitals.map((h, idx) => {
          const isActive = h?.empanelmentStatus === 'EMPANELED_ACTIVE';
          return (
            <div key={idx} style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
              border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
              padding: '12px',
              borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{h?.name}</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', opacity: 0.7 }}>📍 {h?.address}</p>
                </div>
                <span style={{
                  background: isActive ? '#10b981' : '#ef4444',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {isActive ? 'EMPANELED' : 'SUSPENDED'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '11px' }}>
                <span style={{ color: '#2563eb', fontWeight: 700 }}>
                  🚗 {h?.distanceKm} km away
                </span>
                <span style={{ opacity: 0.8 }}>
                  🛏️ ICU Beds: <strong>{h?.icuBedsAvailable}</strong>
                </span>
                <a
                  href={`tel:${h?.contactPhone}`}
                  style={{
                    color: '#10b981',
                    fontWeight: 700,
                    textDecoration: 'none',
                    background: 'rgba(16,185,129,0.1)',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}
                >
                  📞 Call Desk
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
