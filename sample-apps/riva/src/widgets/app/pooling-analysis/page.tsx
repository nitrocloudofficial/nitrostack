'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface ResolvedLocation {
  query: string;
  formattedAddress: string;
  source: 'live' | 'estimated';
}

interface PoolingMatch {
  matchedRiderDestination: string;
  routeOverlapPercent: number;
  savingsInr: number;
  extraMinutes: number;
}

interface PoolingAnalysisData {
  origin: ResolvedLocation;
  destination: ResolvedLocation;
  soloFare: number;
  bestMatch: PoolingMatch | null;
  otherMatches: PoolingMatch[];
  recommendation: 'POOL' | 'DO_NOT_POOL';
  reason: string;
}

export default function PoolingAnalysis() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<PoolingAnalysisData>();
  const isDark = theme === 'dark';

  const bg = isDark ? '#111318' : '#f7f8fa';
  const cardBg = isDark ? '#1c1f26' : '#ffffff';
  const textColor = isDark ? '#f2f3f5' : '#15181e';
  const mutedColor = isDark ? 'rgba(242,243,245,0.62)' : 'rgba(21,24,30,0.6)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textColor, background: bg }}>
        Looking for pooling matches…
      </div>
    );
  }

  const shouldPool = data.recommendation === 'POOL';
  const pooledFare = data.bestMatch ? data.soloFare - data.bestMatch.savingsInr : data.soloFare;

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
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Pooling assistant</div>
      <div style={{ fontSize: 12, color: mutedColor, marginBottom: 14 }}>
        {data.origin.formattedAddress} → {data.destination.formattedAddress}
      </div>

      {/* Recommendation banner */}
      <div
        style={{
          background: shouldPool ? '#22c55e' : '#6b7280',
          borderRadius: 16,
          padding: '16px 18px',
          color: 'white',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9 }}>{shouldPool ? '🤝 POOL' : '🚗 DO NOT POOL'}</div>
        <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>{data.reason}</div>
      </div>

      {data.bestMatch ? (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: mutedColor }}>Solo fare</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>₹{data.soloFare}</div>
            </div>
            <div style={{ flex: 1, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: mutedColor }}>Pooled fare</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2, color: '#22c55e' }}>₹{pooledFare}</div>
            </div>
          </div>

          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Best match</div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>{data.bestMatch.matchedRiderDestination}</div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: mutedColor }}>
              <span>{data.bestMatch.routeOverlapPercent}% route overlap</span>
              <span>+{data.bestMatch.extraMinutes} min</span>
              <span>saves ₹{data.bestMatch.savingsInr}</span>
            </div>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: mutedColor }}>No compatible riders found right now.</div>
      )}
    </div>
  );
}
