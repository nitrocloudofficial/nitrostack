'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface ResolvedLocation {
  query: string;
  formattedAddress: string;
  source: 'live' | 'estimated';
}

interface FareForecastData {
  origin: ResolvedLocation;
  destination: ResolvedLocation;
  targetTimeLabel: string;
  currentFare: number | null;
  forecastFareLow: number | null;
  forecastFareHigh: number | null;
  demandMultiplier: number;
  expectedAvailability: 'PLENTY' | 'MODERATE' | 'SCARCE';
  reason: string;
  disclaimer: string;
}

const AVAILABILITY_COLOR: Record<string, string> = {
  PLENTY: '#22c55e',
  MODERATE: '#f59e0b',
  SCARCE: '#ef4444',
};

export default function FareForecast() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<FareForecastData>();
  const isDark = theme === 'dark';

  const bg = isDark ? '#111318' : '#f7f8fa';
  const cardBg = isDark ? '#1c1f26' : '#ffffff';
  const textColor = isDark ? '#f2f3f5' : '#15181e';
  const mutedColor = isDark ? 'rgba(242,243,245,0.62)' : 'rgba(21,24,30,0.6)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textColor, background: bg }}>
        Forecasting fares…
      </div>
    );
  }

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
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Fare forecast</div>
      <div style={{ fontSize: 12, color: mutedColor, marginBottom: 16 }}>
        {data.origin.formattedAddress} → {data.destination.formattedAddress}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: mutedColor }}>CURRENT ESTIMATE</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{data.currentFare !== null ? `₹${data.currentFare}` : '—'}</div>
        </div>
        <div style={{ flex: 1, background: 'linear-gradient(135deg, #5b8def 0%, #3f6fd6 100%)', borderRadius: 14, padding: 14, textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 11, opacity: 0.85 }}>{data.targetTimeLabel.toUpperCase()}</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
            {data.forecastFareLow !== null && data.forecastFareHigh !== null ? `₹${data.forecastFareLow}–${data.forecastFareHigh}` : '—'}
          </div>
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
        <span style={{ width: 8, height: 8, borderRadius: 4, background: AVAILABILITY_COLOR[data.expectedAvailability], display: 'inline-block' }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{data.expectedAvailability} availability</span>
        <span style={{ fontSize: 12, color: mutedColor, marginLeft: 'auto' }}>{data.demandMultiplier}× demand</span>
      </div>

      <div style={{ fontSize: 12, color: mutedColor, lineHeight: 1.5 }}>{data.reason}</div>
      <div style={{ fontSize: 10, color: mutedColor, marginTop: 8, fontStyle: 'italic' }}>{data.disclaimer}</div>
    </div>
  );
}
