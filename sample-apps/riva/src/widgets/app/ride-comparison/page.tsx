'use client';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

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

interface ResolvedLocation {
  query: string;
  formattedAddress: string;
  source: 'live' | 'estimated';
  estimationNote?: string;
  photoUrl?: string;
}

interface RouteInfo {
  distanceKm: number;
  durationMinutes: number;
  source: 'live' | 'estimated';
  staticMapUrl?: string;
}

interface RideComparisonData {
  searchId: string;
  origin: ResolvedLocation;
  destination: ResolvedLocation;
  route: RouteInfo;
  rankingMode: string;
  rankingExplanation: string;
  totalOptionsFound: number;
  options: RankedRideOption[];
  recommendation: RankedRideOption | null;
}

const PROVIDER_COLORS: Record<string, string> = {
  uber: '#000000',
  ola: '#f6cd0a',
  rapido: '#fdd835',
};

const PROVIDER_ACCENT: Record<string, string> = {
  uber: '#2d2d2d',
  ola: '#8a6d00',
  rapido: '#8a6d00',
};

const VEHICLE_ICON: Record<string, string> = {
  bike: '🏍️',
  auto: '🛺',
  mini: '🚗',
  sedan: '🚙',
  suv: '🚐',
};

function formatMode(mode: string): string {
  return mode
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export default function RideComparison() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ expandedId: string | null }>(() => ({
    expandedId: null,
  }));

  const data = getToolOutput<RideComparisonData>();
  const isDark = theme === 'dark';

  const bg = isDark ? '#111318' : '#f7f8fa';
  const cardBg = isDark ? '#1c1f26' : '#ffffff';
  const textColor = isDark ? '#f2f3f5' : '#15181e';
  const mutedColor = isDark ? 'rgba(242,243,245,0.62)' : 'rgba(21,24,30,0.6)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const accent = '#5b8def';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textColor, background: bg }}>
        Loading ride comparison…
      </div>
    );
  }

  if (!data.options || data.options.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          borderRadius: 16,
          background: cardBg,
          color: textColor,
          maxWidth: 480,
          border: `1px solid ${borderColor}`,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No rides found</div>
        <div style={{ fontSize: 13, color: mutedColor }}>
          Try relaxing a preference (budget limit, vehicle type) and search again.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        background: bg,
        borderRadius: 18,
        maxWidth: 460,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: textColor,
      }}
    >
      {/* Route header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
          <span>📍 {data.origin.formattedAddress}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, marginTop: 2 }}>
          <span>🏁 {data.destination.formattedAddress}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: mutedColor }}>
          <span>{data.route.distanceKm.toFixed(1)} km</span>
          <span>·</span>
          <span>{Math.round(data.route.durationMinutes)} min drive</span>
          <span>·</span>
          <span>{data.route.source === 'live' ? 'Live route' : 'Estimated route'}</span>
        </div>
        {(data.origin.source === 'estimated' || data.destination.source === 'estimated') && (
          <div style={{ fontSize: 11, color: '#e0a030', marginTop: 6 }}>
            ⚠ {data.origin.estimationNote ?? data.destination.estimationNote ?? 'Using an approximate location — configure GEOAPIFY_API_KEY for exact geocoding.'}
          </div>
        )}
      </div>

      {/* Map + location photos (pickup marker, destination marker, route path) */}
      {data.route.staticMapUrl && (
        <div style={{ marginBottom: 14, borderRadius: 14, overflow: 'hidden', border: `1px solid ${borderColor}` }}>
          <img
            src={data.route.staticMapUrl}
            alt="Route map from pickup to destination"
            style={{ width: '100%', display: 'block' }}
          />
        </div>
      )}
      {(data.origin.photoUrl || data.destination.photoUrl) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {data.origin.photoUrl && (
            <img
              src={data.origin.photoUrl}
              alt={data.origin.formattedAddress}
              style={{ flex: 1, height: 80, objectFit: 'cover', borderRadius: 12, border: `1px solid ${borderColor}` }}
            />
          )}
          {data.destination.photoUrl && (
            <img
              src={data.destination.photoUrl}
              alt={data.destination.formattedAddress}
              style={{ flex: 1, height: 80, objectFit: 'cover', borderRadius: 12, border: `1px solid ${borderColor}` }}
            />
          )}
        </div>
      )}

      {/* Ranking mode banner */}
      <div
        style={{
          background: isDark ? 'rgba(91,141,239,0.15)' : 'rgba(91,141,239,0.1)',
          borderRadius: 10,
          padding: '8px 12px',
          fontSize: 12,
          color: isDark ? '#a9c4fb' : '#2f5fc7',
          marginBottom: 14,
        }}
      >
        Ranked by <strong>{formatMode(data.rankingMode)}</strong> — {data.rankingExplanation}
      </div>

      {/* Options list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.options.map((option) => {
          const isTop = option.rank === 1;
          const isExpanded = state?.expandedId === option.optionId;

          return (
            <div
              key={option.optionId}
              onClick={() =>
                setState({ expandedId: isExpanded ? null : option.optionId })
              }
              style={{
                background: cardBg,
                border: isTop ? `1.5px solid ${accent}` : `1px solid ${borderColor}`,
                borderRadius: 14,
                padding: 14,
                cursor: 'pointer',
                position: 'relative',
                opacity: option.availability ? 1 : 0.55,
              }}
            >
              {isTop && (
                <div
                  style={{
                    position: 'absolute',
                    top: -9,
                    left: 14,
                    background: accent,
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 8,
                    letterSpacing: 0.3,
                  }}
                >
                  ★ RECOMMENDED
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: PROVIDER_COLORS[option.provider] ?? '#888',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {VEHICLE_ICON[option.vehicleType] ?? '🚘'}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {option.providerName}{' '}
                      <span style={{ fontWeight: 400, color: mutedColor, fontSize: 12 }}>
                        · {option.vehicleType}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: mutedColor, marginTop: 2 }}>
                      ⭐ {option.rating.toFixed(1)} · ETA {option.pickupEtaMinutes} min
                      {!option.availability && ' · Unavailable'}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>₹{option.fare}</div>
                  <div style={{ fontSize: 11, color: mutedColor }}>
                    {option.isSimulated ? 'simulated' : 'live'}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: `1px solid ${borderColor}`,
                    fontSize: 12,
                    color: mutedColor,
                    lineHeight: 1.5,
                  }}
                >
                  <div>{option.scoreReason}</div>
                  <div style={{ marginTop: 4 }}>
                    Trip time ~{option.tripDurationMinutes} min · {option.distanceKm} km · surge{' '}
                    {option.surgeMultiplier}×
                  </div>
                  {option.hasFemaleDriverOption && <div style={{ marginTop: 4 }}>👩 Female driver option available</div>}
                  {option.luggageFriendly && <div style={{ marginTop: 4 }}>🧳 Luggage-friendly vehicle</div>}
                  {option.notes && <div style={{ marginTop: 4, fontStyle: 'italic' }}>{option.notes}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: mutedColor, textAlign: 'center' }}>
        {data.totalOptionsFound} options compared · tap a card for details · RIVA
      </div>
    </div>
  );
}
