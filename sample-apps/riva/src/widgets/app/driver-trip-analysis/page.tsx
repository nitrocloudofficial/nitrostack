'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface ResolvedLocation {
  query: string;
  formattedAddress: string;
  source: 'live' | 'estimated';
  estimationNote?: string;
}

interface TripProfitabilityBreakdown {
  grossEarning: number;
  fuelCost: number;
  fuelCostExplanation: string;
  platformCommission: number;
  platformCommissionRate: number;
  netEarning: number;
  costPerKm: number;
  estimatedTripMinutes: number;
  estimatedHourlyEarning: number;
}

interface DestinationAttractiveness {
  demandLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  returnProbability: number;
  explanation: string;
}

interface DriverTripAnalysisData {
  provider: 'uber' | 'ola' | 'rapido';
  vehicleType: string;
  currentLocation: ResolvedLocation;
  destination: ResolvedLocation;
  totalDistanceKm: number;
  breakdown: TripProfitabilityBreakdown;
  destinationAttractiveness: DestinationAttractiveness;
  recommendation: 'ACCEPT' | 'CONSIDER' | 'REJECT';
  reason: string;
}

const RECOMMENDATION_COLOR: Record<string, string> = {
  ACCEPT: '#22c55e',
  CONSIDER: '#f59e0b',
  REJECT: '#ef4444',
};

const DEMAND_COLOR: Record<string, string> = {
  HIGH: '#22c55e',
  MEDIUM: '#f59e0b',
  LOW: '#ef4444',
};

export default function DriverTripAnalysis() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<DriverTripAnalysisData>();
  const isDark = theme === 'dark';

  const bg = isDark ? '#111318' : '#f7f8fa';
  const cardBg = isDark ? '#1c1f26' : '#ffffff';
  const textColor = isDark ? '#f2f3f5' : '#15181e';
  const mutedColor = isDark ? 'rgba(242,243,245,0.62)' : 'rgba(21,24,30,0.6)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textColor, background: bg }}>
        Analyzing trip…
      </div>
    );
  }

  const recColor = RECOMMENDATION_COLOR[data.recommendation] ?? '#888';
  const { breakdown } = data;

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
      {/* Recommendation banner */}
      <div
        style={{
          background: recColor,
          borderRadius: 16,
          padding: '16px 18px',
          color: 'white',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, letterSpacing: 0.5 }}>RECOMMENDATION</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>{data.recommendation}</div>
        <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.4, opacity: 0.95 }}>{data.reason}</div>
      </div>

      {/* Route */}
      <div style={{ fontSize: 12, color: mutedColor, marginBottom: 12 }}>
        {data.currentLocation.formattedAddress} → {data.destination.formattedAddress}
        <span style={{ marginLeft: 6 }}>· {data.totalDistanceKm} km total · {data.provider} {data.vehicleType}</span>
      </div>

      {/* Earnings breakdown */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: 14,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: mutedColor }}>Gross fare</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>₹{breakdown.grossEarning}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: mutedColor }}>− Fuel cost</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>−₹{breakdown.fuelCost}</span>
        </div>
        <div style={{ fontSize: 11, color: mutedColor, marginBottom: 10 }}>{breakdown.fuelCostExplanation}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: mutedColor }}>
            − Platform commission ({Math.round(breakdown.platformCommissionRate * 100)}%)
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>−₹{breakdown.platformCommission}</span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: 10,
            borderTop: `1px solid ${borderColor}`,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700 }}>Net earning</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: breakdown.netEarning >= 0 ? '#22c55e' : '#ef4444' }}>
            ₹{breakdown.netEarning}
          </span>
        </div>
      </div>

      {/* Rate stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: mutedColor }}>Cost/km</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>₹{breakdown.costPerKm}</div>
        </div>
        <div style={{ flex: 1, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: mutedColor }}>Est. time</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{breakdown.estimatedTripMinutes} min</div>
        </div>
        <div style={{ flex: 1, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: mutedColor }}>₹/hour</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>₹{breakdown.estimatedHourlyEarning}</div>
        </div>
      </div>

      {/* Destination attractiveness */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          padding: '10px 14px',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            background: DEMAND_COLOR[data.destinationAttractiveness.demandLevel] ?? '#888',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>
            Destination demand: {data.destinationAttractiveness.demandLevel} · {Math.round(data.destinationAttractiveness.returnProbability * 100)}% return chance
          </div>
          <div style={{ fontSize: 11, color: mutedColor, marginTop: 2 }}>{data.destinationAttractiveness.explanation}</div>
        </div>
      </div>
    </div>
  );
}
