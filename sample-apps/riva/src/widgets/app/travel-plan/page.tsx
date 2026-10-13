'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface ResolvedLocation {
  query: string;
  formattedAddress: string;
  source: 'live' | 'estimated';
  estimationNote?: string;
}

interface RouteInfo {
  distanceKm: number;
  durationMinutes: number;
  source: 'live' | 'estimated';
}

interface RankedRideOption {
  providerName: string;
  vehicleType: string;
  fare: number;
  pickupEtaMinutes: number;
  rating: number;
}

interface TravelPlanData {
  origin: ResolvedLocation;
  destination: ResolvedLocation;
  arriveByLabel: string;
  recommendedPickupLabel: string;
  bufferMinutes: number;
  bufferReason: string;
  trafficAdjustedTravelMinutes: number;
  trafficMultiplier: number;
  route: RouteInfo;
  recommendation: RankedRideOption | null;
  recommendationReason: string;
  alternatives: RankedRideOption[];
}

const VEHICLE_ICON: Record<string, string> = {
  bike: '🏍️',
  auto: '🛺',
  mini: '🚗',
  sedan: '🚙',
  suv: '🚐',
};

export default function TravelPlan() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<TravelPlanData>();
  const isDark = theme === 'dark';

  const bg = isDark ? '#111318' : '#f7f8fa';
  const cardBg = isDark ? '#1c1f26' : '#ffffff';
  const textColor = isDark ? '#f2f3f5' : '#15181e';
  const mutedColor = isDark ? 'rgba(242,243,245,0.62)' : 'rgba(21,24,30,0.6)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textColor, background: bg }}>
        Planning your journey…
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
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Travel plan</div>
      <div style={{ fontSize: 12, color: mutedColor, marginBottom: 14 }}>
        {data.origin.formattedAddress} → {data.destination.formattedAddress}
      </div>

      {/* Arrival + pickup hero */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: mutedColor }}>ARRIVE BY</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{data.arriveByLabel}</div>
        </div>
        <div style={{ flex: 1, background: 'linear-gradient(135deg, #5b8def 0%, #3f6fd6 100%)', borderRadius: 14, padding: 14, textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 11, opacity: 0.85 }}>RECOMMENDED PICKUP</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{data.recommendedPickupLabel}</div>
        </div>
      </div>

      <div
        style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          padding: '10px 14px',
          fontSize: 12,
          color: mutedColor,
          marginBottom: 14,
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: textColor }}>Why this pickup time:</strong> {data.trafficAdjustedTravelMinutes} min travel
        (traffic-adjusted, {data.trafficMultiplier}× normal) + {data.bufferMinutes} min buffer. {data.bufferReason}
      </div>

      {/* Recommended ride */}
      {data.recommendation ? (
        <div
          style={{
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 14,
            padding: 16,
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#5b8def', marginBottom: 8 }}>RECOMMENDED RIDE</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 26 }}>{VEHICLE_ICON[data.recommendation.vehicleType] ?? '🚘'}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {data.recommendation.providerName} {data.recommendation.vehicleType}
                </div>
                <div style={{ fontSize: 11, color: mutedColor }}>⭐ {data.recommendation.rating.toFixed(1)} · {data.recommendation.pickupEtaMinutes} min pickup</div>
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>₹{data.recommendation.fare}</div>
          </div>
          <div style={{ fontSize: 12, color: mutedColor, marginTop: 10, lineHeight: 1.5 }}>{data.recommendationReason}</div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: mutedColor }}>No ride options available for this route.</div>
      )}

      <div style={{ fontSize: 11, color: mutedColor, textAlign: 'center' }}>
        {data.route.distanceKm} km · {Math.round(data.route.durationMinutes)} min base drive time
      </div>
    </div>
  );
}
