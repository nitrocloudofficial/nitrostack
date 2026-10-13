'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

type DemandLevel = 'HIGH' | 'MEDIUM' | 'LOW';

interface ResolvedLocation {
  query: string;
  formattedAddress: string;
  source: 'live' | 'estimated';
  estimationNote?: string;
}

interface DestinationDemandData {
  destination: ResolvedLocation;
  matchedZone: string | null;
  time: string;
  demandLevel: DemandLevel;
  expectedRideAvailability: 'PLENTY' | 'MODERATE' | 'SCARCE';
  expectedWaitingMinutes: number;
  returnProbability: number;
  explanation: string;
}

interface DriverZoneRecommendation {
  zoneName: string;
  coordinates: { lat: number; lng: number };
  distanceFromCurrentKm: number;
  demandLevel: DemandLevel;
  demandScore: number;
  reasoning: string;
}

interface ZoneSuggestionData {
  currentLocation: ResolvedLocation;
  time: string;
  topRecommendation: DriverZoneRecommendation | null;
  alternatives: DriverZoneRecommendation[];
}

type WidgetData = DestinationDemandData | ZoneSuggestionData;

const DEMAND_COLOR: Record<DemandLevel, string> = {
  HIGH: '#22c55e',
  MEDIUM: '#f59e0b',
  LOW: '#ef4444',
};

function isZoneSuggestion(data: WidgetData): data is ZoneSuggestionData {
  return 'topRecommendation' in data;
}

export default function DemandMap() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<WidgetData>();
  const isDark = theme === 'dark';

  const bg = isDark ? '#111318' : '#f7f8fa';
  const cardBg = isDark ? '#1c1f26' : '#ffffff';
  const textColor = isDark ? '#f2f3f5' : '#15181e';
  const mutedColor = isDark ? 'rgba(242,243,245,0.62)' : 'rgba(21,24,30,0.6)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textColor, background: bg }}>
        Checking demand…
      </div>
    );
  }

  const wrapperStyle = {
    padding: 20,
    background: bg,
    borderRadius: 18,
    maxWidth: 420,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: textColor,
  } as const;

  // --- suggest_next_driver_zone shape: ranked list of zones ---
  if (isZoneSuggestion(data)) {
    const zones = [data.topRecommendation, ...data.alternatives].filter(
      (z): z is DriverZoneRecommendation => z !== null
    );

    return (
      <div style={wrapperStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Where to go next</div>
        <div style={{ fontSize: 12, color: mutedColor, marginBottom: 14 }}>
          From {data.currentLocation.formattedAddress} · {data.time}
        </div>

        {zones.length === 0 && <div style={{ fontSize: 13, color: mutedColor }}>No zone data available.</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {zones.map((zone, index) => (
            <div
              key={zone.zoneName}
              style={{
                background: index === 0 ? 'linear-gradient(135deg, #5b8def 0%, #3f6fd6 100%)' : cardBg,
                border: index === 0 ? 'none' : `1px solid ${borderColor}`,
                borderRadius: 14,
                padding: 14,
                color: index === 0 ? 'white' : textColor,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {index === 0 && '★ '}
                  {zone.zoneName}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 8,
                    background: index === 0 ? 'rgba(255,255,255,0.25)' : DEMAND_COLOR[zone.demandLevel] + '22',
                    color: index === 0 ? 'white' : DEMAND_COLOR[zone.demandLevel],
                  }}
                >
                  {zone.demandLevel}
                </span>
              </div>
              <div style={{ fontSize: 12, marginTop: 6, opacity: index === 0 ? 0.95 : 1, color: index === 0 ? 'white' : mutedColor }}>
                {zone.distanceFromCurrentKm} km away · demand score {zone.demandScore}/100
              </div>
              <div style={{ fontSize: 11, marginTop: 6, opacity: index === 0 ? 0.9 : 1, color: index === 0 ? 'white' : mutedColor, lineHeight: 1.4 }}>
                {zone.reasoning}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- get_destination_demand shape: single-destination demand card ---
  const demand = data;
  return (
    <div style={wrapperStyle}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Destination demand</div>
      <div style={{ fontSize: 12, color: mutedColor, marginBottom: 14 }}>
        {demand.destination.formattedAddress}
        {demand.matchedZone ? ` (${demand.matchedZone})` : ''} · {demand.time}
      </div>

      <div
        style={{
          background: DEMAND_COLOR[demand.demandLevel],
          borderRadius: 16,
          padding: '18px',
          color: 'white',
          marginBottom: 14,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.9, letterSpacing: 0.5 }}>DEMAND LEVEL</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginTop: 2 }}>{demand.demandLevel}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: mutedColor }}>Ride availability</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{demand.expectedRideAvailability}</div>
        </div>
        <div style={{ flex: 1, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: mutedColor }}>Expected wait</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{demand.expectedWaitingMinutes} min</div>
        </div>
        <div style={{ flex: 1, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: mutedColor }}>Return chance</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{Math.round(demand.returnProbability * 100)}%</div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: mutedColor, lineHeight: 1.5 }}>{demand.explanation}</div>
    </div>
  );
}
