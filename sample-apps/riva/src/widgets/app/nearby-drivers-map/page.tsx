'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface LatLng {
  lat: number;
  lng: number;
}

interface NearbyDriver {
  driverId: string;
  provider: 'uber' | 'ola' | 'rapido';
  providerName: string;
  vehicleType: string;
  coordinates: LatLng;
  etaMinutes: number;
  rating: number;
  isFemaleDriver: boolean;
}

interface ResolvedLocation {
  query: string;
  formattedAddress: string;
  coordinates: LatLng;
  source: 'live' | 'estimated';
  estimationNote?: string;
}

interface NearbyDriversData {
  origin: ResolvedLocation;
  radiusKm: number;
  driverCount: number;
  countsByProvider: Record<string, number>;
  drivers: NearbyDriver[];
  note: string;
}

interface NearbyRideRequest {
  requestId: string;
  provider: 'uber' | 'ola' | 'rapido';
  pickupZone: string;
  pickupDistanceKm: number;
  dropZone: string;
  tripDistanceKm: number;
  fare: number;
  estimatedNetEarning: number;
}

interface NearbyRideRequestsData {
  currentLocation: ResolvedLocation;
  radiusKm: number;
  rideCount: number;
  rides: NearbyRideRequest[];
  note: string;
}

type WidgetData = NearbyDriversData | NearbyRideRequestsData;

function isRideRequests(data: WidgetData): data is NearbyRideRequestsData {
  return 'rides' in data;
}

const PROVIDER_COLORS: Record<string, string> = {
  uber: '#2d2d2d',
  ola: '#e8b800',
  rapido: '#f9a825',
};

const VEHICLE_ICON: Record<string, string> = {
  bike: '🏍️',
  auto: '🛺',
  mini: '🚗',
  sedan: '🚙',
  suv: '🚐',
};

const SIZE = 320;
const CENTER = SIZE / 2;

function project(center: LatLng, point: LatLng, radiusKm: number): { x: number; y: number } {
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.cos((center.lat * Math.PI) / 180);

  const dKmLat = (point.lat - center.lat) * kmPerDegLat;
  const dKmLng = (point.lng - center.lng) * kmPerDegLng;

  const scale = (CENTER - 24) / radiusKm;

  return {
    x: CENTER + dKmLng * scale,
    y: CENTER - dKmLat * scale,
  };
}

export default function NearbyDriversMap() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<WidgetData>();
  const isDark = theme === 'dark';

  const bg = isDark ? '#111318' : '#f7f8fa';
  const cardBg = isDark ? '#1c1f26' : '#ffffff';
  const textColor = isDark ? '#f2f3f5' : '#15181e';
  const mutedColor = isDark ? 'rgba(242,243,245,0.62)' : 'rgba(21,24,30,0.6)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const mapBg = isDark ? '#181b22' : '#eef1f6';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textColor, background: bg }}>
        Loading nearby drivers…
      </div>
    );
  }

  // --- search_nearby_rides shape: driver-side ride-request marketplace ---
  if (isRideRequests(data)) {
    return (
      <div
        style={{
          padding: 20,
          background: bg,
          borderRadius: 18,
          maxWidth: 420,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: textColor,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Nearby ride requests</div>
        <div style={{ fontSize: 12, color: mutedColor, marginBottom: 14 }}>
          Near {data.currentLocation.formattedAddress} · {data.radiusKm} km radius
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.rides.map((ride, index) => (
            <div
              key={ride.requestId}
              style={{
                background: index === 0 ? 'linear-gradient(135deg, #5b8def 0%, #3f6fd6 100%)' : cardBg,
                border: index === 0 ? 'none' : `1px solid ${borderColor}`,
                borderRadius: 14,
                padding: 14,
                color: index === 0 ? 'white' : textColor,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {index === 0 && '★ '}
                  {ride.provider.toUpperCase()} · {ride.dropZone}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>₹{ride.fare}</div>
              </div>
              <div style={{ fontSize: 11, marginTop: 6, opacity: index === 0 ? 0.95 : 1, color: index === 0 ? 'white' : mutedColor }}>
                {ride.pickupDistanceKm} km pickup · {ride.tripDistanceKm} km trip · est. net ₹{ride.estimatedNetEarning}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, fontSize: 10, color: mutedColor, textAlign: 'center' }}>{data.note}</div>
      </div>
    );
  }

  // --- get_nearby_drivers_map shape: rider-side SVG driver map ---
  return (
    <div
      style={{
        padding: 20,
        background: bg,
        borderRadius: 18,
        maxWidth: 400,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: textColor,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Nearby drivers</div>
      <div style={{ fontSize: 12, color: mutedColor, marginBottom: 12 }}>
        {data.origin.formattedAddress} · {data.radiusKm} km radius
      </div>
      {data.origin.source === 'estimated' && (
        <div style={{ fontSize: 11, color: '#e0a030', marginBottom: 10 }}>
          ⚠ {data.origin.estimationNote ?? 'Using an approximate location — configure GEOAPIFY_API_KEY for exact geocoding.'}
        </div>
      )}

      <div
        style={{
          position: 'relative',
          width: SIZE,
          height: SIZE,
          borderRadius: 16,
          background: mapBg,
          border: `1px solid ${borderColor}`,
          overflow: 'hidden',
        }}
      >
        <svg width={SIZE} height={SIZE} style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* radius rings */}
          {[0.33, 0.66, 1].map((f) => (
            <circle
              key={f}
              cx={CENTER}
              cy={CENTER}
              r={(CENTER - 24) * f}
              fill="none"
              stroke={gridColor}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ))}

          {/* driver dots */}
          {data.drivers.map((driver) => {
            const p = project(data.origin.coordinates, driver.coordinates, data.radiusKm);
            return (
              <g key={driver.driverId}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={6}
                  fill={PROVIDER_COLORS[driver.provider] ?? '#888'}
                  stroke={isDark ? '#111318' : '#ffffff'}
                  strokeWidth={1.5}
                />
              </g>
            );
          })}

          {/* origin pin */}
          <circle cx={CENTER} cy={CENTER} r={8} fill="#e63946" stroke="white" strokeWidth={2} />
        </svg>
      </div>

      {/* legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11, color: mutedColor }}>
        {Object.entries(data.countsByProvider).map(([provider, count]) => (
          <div key={provider} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                display: 'inline-block',
                background: PROVIDER_COLORS[provider.toLowerCase()] ?? '#888',
              }}
            />
            {provider}: {count}
          </div>
        ))}
      </div>

      {/* driver list */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
        {data.drivers.slice(0, 6).map((driver) => (
          <div
            key={driver.driverId}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 10,
              padding: '6px 10px',
              fontSize: 12,
            }}
          >
            <span>
              {VEHICLE_ICON[driver.vehicleType] ?? '🚘'} {driver.providerName}
              {driver.isFemaleDriver && ' · 👩'}
            </span>
            <span style={{ color: mutedColor }}>
              {driver.etaMinutes} min · ⭐{driver.rating.toFixed(1)}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 10, color: mutedColor, textAlign: 'center' }}>{data.note}</div>
    </div>
  );
}
