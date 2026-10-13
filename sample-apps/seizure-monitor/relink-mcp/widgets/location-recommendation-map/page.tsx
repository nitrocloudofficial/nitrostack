'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

interface IndustrialZone {
  name: string;
  distance_km: number;
  seller_count: number;
  avg_price_per_kg: number;
  avg_grade: string;
  avg_trust_score: number;
}

interface LocationRecommendationData {
  recommended_zones: IndustrialZone[];
  recommendation: string;
}

export default function LocationRecommendationMap() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const theme = useTheme();

  if (!isReady) return <div style={{ padding: 24, textAlign: 'center', fontFamily: 'system-ui' }}>Loading zone analysis...</div>;

  const data = getToolOutput<LocationRecommendationData>();
  if (!data?.recommended_zones?.length) {
    return <div style={emptyStyle(theme)}>No industrial zones found for this material in your area</div>;
  }

  const isDark = theme === 'dark';

  return (
    <div style={containerStyle(isDark)}>
      <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: isDark ? '#fff' : '#111' }}>
        Recommended Sourcing Locations
      </h3>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: isDark ? '#93c5fd' : '#1e40af', lineHeight: 1.5 }}>
        {data.recommendation}
      </p>

      {data.recommended_zones.map((zone, i) => (
        <div key={zone.name} style={zoneCardStyle(isDark, i === 0)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: i === 0 ? '#16a34a' : isDark ? '#fff' : '#111' }}>
                  #{i + 1}
                </span>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: isDark ? '#fff' : '#111' }}>{zone.name}</h4>
              </div>
              {i === 0 && (
                <span style={{ marginLeft: 32, padding: '2px 10px', borderRadius: 4, background: '#052e16', color: '#4ade80', fontSize: 11, fontWeight: 600 }}>
                  BEST PICK
                </span>
              )}
            </div>
            <span style={{ fontSize: 13, color: isDark ? '#999' : '#666' }}>{zone.distance_km} km away</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <MetricBlock label="Sellers" value={`${zone.seller_count}`} isDark={isDark} />
            <MetricBlock label="Avg Price" value={`₹${zone.avg_price_per_kg}`} isDark={isDark} highlight />
            <MetricBlock label="Avg Grade" value={zone.avg_grade} isDark={isDark} />
            <MetricBlock label="Trust" value={`${zone.avg_trust_score}`} isDark={isDark} />
          </div>

          <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: isDark ? '#222' : '#eee' }}>
            <div
              style={{
                height: '100%',
                borderRadius: 3,
                background: i === 0 ? '#16a34a' : '#2563eb',
                width: `${Math.min(100, zone.seller_count * 6)}%`,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricBlock({ label, value, isDark, highlight }: { label: string; value: string; isDark: boolean; highlight?: boolean }) {
  return (
    <div style={{
      padding: '10px 8px',
      borderRadius: 8,
      background: highlight ? (isDark ? '#0d47a1' : '#e3f2fd') : (isDark ? '#1a1a1a' : '#f5f5f5'),
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', color: isDark ? '#999' : '#888', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: highlight ? (isDark ? '#93c5fd' : '#1e40af') : (isDark ? '#fff' : '#111') }}>{value}</div>
    </div>
  );
}

const containerStyle = (isDark: boolean): React.CSSProperties => ({
  background: isDark ? '#000' : '#fff',
  color: isDark ? '#fff' : '#000',
  padding: 24,
  borderRadius: 12,
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 700,
  border: `1px solid ${isDark ? '#333' : '#ddd'}`,
});

const zoneCardStyle = (isDark: boolean, isBest: boolean): React.CSSProperties => ({
  padding: 18,
  borderRadius: 10,
  marginBottom: 12,
  background: isBest ? (isDark ? '#052814' : '#f0fdf4') : (isDark ? '#111' : '#f9f9f9'),
  border: `1px solid ${isBest ? (isDark ? '#166534' : '#bbf7d0') : (isDark ? '#222' : '#eee')}`,
});

const emptyStyle = (theme: string | null): React.CSSProperties => ({
  padding: 40,
  textAlign: 'center',
  fontFamily: 'system-ui',
  color: theme === 'dark' ? '#999' : '#666',
  fontSize: 14,
});
