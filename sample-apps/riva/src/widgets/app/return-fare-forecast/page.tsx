'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface ResolvedLocation {
  query: string;
  formattedAddress: string;
  source: 'live' | 'estimated';
  estimationNote?: string;
}

interface RankedRideOption {
  providerName: string;
  vehicleType: string;
  fare: number;
  pickupEtaMinutes: number;
}

interface ForecastData {
  origin: ResolvedLocation;
  destination: ResolvedLocation;
  returnTime: string;
  demandLevel: 'low' | 'moderate' | 'high' | 'peak';
  currentFare: number | null;
  currentBestOption: RankedRideOption | null;
  estimatedFutureFare: number | null;
  forecastMultiplier: number;
  explanation: string;
  disclaimer: string;
}

const DEMAND_COLOR: Record<string, string> = {
  low: '#22c55e',
  moderate: '#3b82f6',
  high: '#f59e0b',
  peak: '#ef4444',
};

const DEMAND_LABEL: Record<string, string> = {
  low: 'Low demand',
  moderate: 'Moderate demand',
  high: 'High demand',
  peak: 'Peak demand',
};

export default function ReturnFareForecast() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ForecastData>();
  const isDark = theme === 'dark';

  const bg = isDark ? '#111318' : '#f7f8fa';
  const cardBg = isDark ? '#1c1f26' : '#ffffff';
  const textColor = isDark ? '#f2f3f5' : '#15181e';
  const mutedColor = isDark ? 'rgba(242,243,245,0.62)' : 'rgba(21,24,30,0.6)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textColor, background: bg }}>
        Loading fare forecast…
      </div>
    );
  }

  const current = data.currentFare ?? 0;
  const future = data.estimatedFutureFare ?? 0;
  const delta = future - current;
  const demandColor = DEMAND_COLOR[data.demandLevel] ?? '#888';

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
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Return trip forecast</div>
      <div style={{ fontSize: 12, color: mutedColor, marginBottom: 16 }}>
        {data.origin.formattedAddress} → {data.destination.formattedAddress} at {data.returnTime}
      </div>
      {(data.origin.source === 'estimated' || data.destination.source === 'estimated') && (
        <div style={{ fontSize: 11, color: '#e0a030', marginBottom: 12 }}>
          ⚠ {data.origin.estimationNote ?? data.destination.estimationNote ?? 'Using an approximate location — configure GEOAPIFY_API_KEY for exact geocoding.'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div
          style={{
            flex: 1,
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 14,
            padding: 14,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 11, color: mutedColor, marginBottom: 4 }}>NOW</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {data.currentFare !== null ? `₹${data.currentFare}` : '—'}
          </div>
          {data.currentBestOption && (
            <div style={{ fontSize: 11, color: mutedColor, marginTop: 4 }}>
              {data.currentBestOption.providerName} · {data.currentBestOption.vehicleType}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: mutedColor,
          }}
        >
          →
        </div>

        <div
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #5b8def 0%, #3f6fd6 100%)',
            borderRadius: 14,
            padding: 14,
            textAlign: 'center',
            color: 'white',
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 4 }}>AT {data.returnTime}</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {data.estimatedFutureFare !== null ? `₹${data.estimatedFutureFare}` : '—'}
          </div>
          {data.currentFare !== null && data.estimatedFutureFare !== null && (
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4 }}>
              {delta >= 0 ? '+' : ''}
              {delta} vs now
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          padding: '10px 14px',
          marginBottom: 10,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 4, background: demandColor, display: 'inline-block' }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{DEMAND_LABEL[data.demandLevel] ?? data.demandLevel}</span>
        <span style={{ fontSize: 12, color: mutedColor, marginLeft: 'auto' }}>{data.forecastMultiplier}× multiplier</span>
      </div>

      <div style={{ fontSize: 12, color: mutedColor, lineHeight: 1.5 }}>{data.explanation}</div>
      <div style={{ fontSize: 10, color: mutedColor, marginTop: 8, fontStyle: 'italic' }}>{data.disclaimer}</div>
    </div>
  );
}
