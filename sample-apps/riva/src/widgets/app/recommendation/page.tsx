'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface RankedRideOption {
  optionId: string;
  provider: 'uber' | 'ola' | 'rapido';
  providerName: string;
  vehicleType: string;
  fare: number;
  currency: string;
  pickupEtaMinutes: number;
  tripDurationMinutes: number;
  distanceKm: number;
  availability: boolean;
  isSimulated: boolean;
  rating: number;
  hasFemaleDriverOption: boolean;
  luggageFriendly: boolean;
  surgeMultiplier: number;
  dataSource: string;
  notes?: string;
  rank: number;
  score: number;
  scoreReason: string;
}

interface FareBreakdown {
  totalFare: number;
  currency: string;
  distanceKm: number;
  approxPerKm: number;
  surgeMultiplier: number;
  dataSource: string;
}

interface RecommendationData {
  searchId: string;
  mode: string;
  modeExplanation: string;
  selectedRide: RankedRideOption | null;
  reasoning: string;
  alternatives: RankedRideOption[];
  fareBreakdown?: FareBreakdown;
  message?: string;
}

const VEHICLE_ICON: Record<string, string> = {
  bike: '🏍️',
  auto: '🛺',
  mini: '🚗',
  sedan: '🚙',
  suv: '🚐',
};

export default function Recommendation() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<RecommendationData>();
  const isDark = theme === 'dark';

  const bg = isDark ? '#111318' : '#f7f8fa';
  const cardBg = isDark ? '#1c1f26' : '#ffffff';
  const textColor = isDark ? '#f2f3f5' : '#15181e';
  const mutedColor = isDark ? 'rgba(242,243,245,0.62)' : 'rgba(21,24,30,0.6)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textColor, background: bg }}>
        Loading recommendation…
      </div>
    );
  }

  const ride = data.selectedRide;

  if (!ride) {
    return (
      <div
        style={{
          padding: 20,
          borderRadius: 16,
          background: cardBg,
          color: textColor,
          maxWidth: 440,
          border: `1px solid ${borderColor}`,
        }}
      >
        {data.message ?? 'No ride matched the current preferences.'}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        background: bg,
        borderRadius: 18,
        maxWidth: 440,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: textColor,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: '#5b8def', letterSpacing: 0.4, marginBottom: 10 }}>
        ★ TOP PICK · {data.mode?.replace('_', ' ').toUpperCase()}
      </div>

      {/* Hero card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #5b8def 0%, #3f6fd6 100%)',
          borderRadius: 16,
          padding: 18,
          color: 'white',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 30 }}>{VEHICLE_ICON[ride.vehicleType] ?? '🚘'}</span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>{ride.providerName}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{ride.vehicleType} · ⭐ {ride.rating.toFixed(1)}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>₹{ride.fare}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>{ride.isSimulated ? 'simulated' : 'live'}</div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 16,
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.25)',
            fontSize: 12,
          }}
        >
          <span>🕐 {ride.pickupEtaMinutes} min pickup</span>
          <span>🛣️ {ride.tripDurationMinutes} min trip</span>
          <span>📏 {ride.distanceKm} km</span>
        </div>
      </div>

      {/* Reasoning */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Why this ride?</div>
        <div style={{ fontSize: 13, color: mutedColor, lineHeight: 1.5 }}>{data.reasoning}</div>

        {data.fareBreakdown && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${borderColor}`, fontSize: 12, color: mutedColor }}>
            <div>Fare breakdown: ₹{data.fareBreakdown.totalFare} total · ₹{data.fareBreakdown.approxPerKm}/km</div>
            <div style={{ marginTop: 2 }}>Surge {data.fareBreakdown.surgeMultiplier}× · source: {data.fareBreakdown.dataSource}</div>
          </div>
        )}
      </div>

      {/* Alternatives */}
      {data.alternatives && data.alternatives.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: mutedColor }}>ALTERNATIVES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.alternatives.map((alt) => (
              <div
                key={alt.optionId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 12,
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{VEHICLE_ICON[alt.vehicleType] ?? '🚘'}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{alt.providerName}</div>
                    <div style={{ fontSize: 11, color: mutedColor }}>
                      {alt.vehicleType} · {alt.pickupEtaMinutes} min ETA
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>₹{alt.fare}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
