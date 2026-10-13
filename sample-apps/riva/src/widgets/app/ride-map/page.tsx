'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface ResolvedLocation {
  query: string;
  formattedAddress: string;
  source: 'live' | 'estimated';
}

interface MultiStopLeg {
  from: string;
  to: string;
  distanceKm: number;
  durationMinutes: number;
  fare: number;
}

interface MultiStopPlanData {
  stops: ResolvedLocation[];
  legs: MultiStopLeg[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  estimatedFare: number;
  routeDisplay: string;
}

export default function RideMap() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<MultiStopPlanData>();
  const isDark = theme === 'dark';

  const bg = isDark ? '#111318' : '#f7f8fa';
  const cardBg = isDark ? '#1c1f26' : '#ffffff';
  const textColor = isDark ? '#f2f3f5' : '#15181e';
  const mutedColor = isDark ? 'rgba(242,243,245,0.62)' : 'rgba(21,24,30,0.6)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textColor, background: bg }}>
        Mapping your route…
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
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Multi-stop route</div>

      {/* Vertical stop stepper */}
      <div style={{ position: 'relative', paddingLeft: 24, marginBottom: 16 }}>
        <div
          style={{
            position: 'absolute',
            left: 7,
            top: 8,
            bottom: 8,
            width: 2,
            background: borderColor,
          }}
        />
        {data.stops.map((stop, index) => {
          const isFirst = index === 0;
          const isLast = index === data.stops.length - 1;
          return (
            <div key={index} style={{ position: 'relative', marginBottom: index < data.stops.length - 1 ? 22 : 0 }}>
              <div
                style={{
                  position: 'absolute',
                  left: -24,
                  top: 2,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  background: isFirst ? '#22c55e' : isLast ? '#e63946' : '#5b8def',
                  border: `2px solid ${bg}`,
                }}
              />
              <div style={{ fontSize: 13, fontWeight: 600 }}>{stop.formattedAddress}</div>
              <div style={{ fontSize: 11, color: mutedColor }}>{isFirst ? 'Start' : isLast ? 'Final destination' : `Stop ${index}`}</div>
              {index < data.legs.length && (
                <div style={{ fontSize: 11, color: mutedColor, marginTop: 4 }}>
                  ↓ {data.legs[index].distanceKm} km · {data.legs[index].durationMinutes} min · ₹{data.legs[index].fare}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div
        style={{
          background: 'linear-gradient(135deg, #5b8def 0%, #3f6fd6 100%)',
          borderRadius: 14,
          padding: 16,
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>TOTAL DISTANCE</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{data.totalDistanceKm} km</div>
        </div>
        <div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>TOTAL TIME</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{data.totalDurationMinutes} min</div>
        </div>
        <div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>EST. FARE</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>₹{data.estimatedFare}</div>
        </div>
      </div>
    </div>
  );
}
