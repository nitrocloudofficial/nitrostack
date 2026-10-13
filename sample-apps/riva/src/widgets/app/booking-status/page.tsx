'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface ResolvedLocation {
  query: string;
  formattedAddress: string;
  source: 'live' | 'estimated';
}

interface RideSummary {
  provider: string;
  providerName: string;
  vehicleType: string;
  fare: number;
  origin: string;
  destination: string;
}

interface PendingConfirmationData {
  status: 'PENDING_CONFIRMATION';
  message: string;
  rideSummary: RideSummary;
}

interface SimulatedDriverInfo {
  driverName: string;
  vehicleType: string;
  vehicleNumber: string;
  rating: number;
  etaMinutes: number;
}

type BookingStatus = 'SEARCHING' | 'DRIVER_ASSIGNED' | 'DRIVER_ARRIVING' | 'TRIP_STARTED' | 'COMPLETED' | 'CANCELLED';

interface BookingData {
  bookingId: string;
  provider: string;
  vehicleType: string;
  fare: number;
  origin: ResolvedLocation;
  destination: ResolvedLocation;
  status: BookingStatus;
  driver: SimulatedDriverInfo | null;
}

type WidgetData = PendingConfirmationData | BookingData;

const LIFECYCLE: BookingStatus[] = ['SEARCHING', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'TRIP_STARTED', 'COMPLETED'];
const LIFECYCLE_LABELS: Record<BookingStatus, string> = {
  SEARCHING: 'Searching',
  DRIVER_ASSIGNED: 'Driver Assigned',
  DRIVER_ARRIVING: 'Driver Arriving',
  TRIP_STARTED: 'Trip Started',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function isPending(data: WidgetData): data is PendingConfirmationData {
  return data.status === 'PENDING_CONFIRMATION';
}

export default function BookingStatus() {
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
        Loading booking…
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

  if (isPending(data)) {
    return (
      <div style={wrapperStyle}>
        <div
          style={{
            background: '#f59e0b',
            borderRadius: 16,
            padding: '16px 18px',
            color: 'white',
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9 }}>⏳ CONFIRMATION NEEDED</div>
          <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>{data.message}</div>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {data.rideSummary.providerName} {data.rideSummary.vehicleType}
          </div>
          <div style={{ fontSize: 12, color: mutedColor, marginTop: 4 }}>
            {data.rideSummary.origin} → {data.rideSummary.destination}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>₹{data.rideSummary.fare}</div>
        </div>
      </div>
    );
  }

  const currentIndex = LIFECYCLE.indexOf(data.status);

  return (
    <div style={wrapperStyle}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Booking status</div>
      <div style={{ fontSize: 12, color: mutedColor, marginBottom: 16 }}>
        {data.origin.formattedAddress} → {data.destination.formattedAddress}
      </div>

      {/* Lifecycle stepper */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: 7,
            left: '8%',
            right: '8%',
            height: 2,
            background: borderColor,
            zIndex: 0,
          }}
        />
        {LIFECYCLE.map((stage, i) => {
          const done = i <= currentIndex;
          return (
            <div key={stage} style={{ position: 'relative', zIndex: 1, textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  background: done ? '#5b8def' : cardBg,
                  border: `2px solid ${done ? '#5b8def' : borderColor}`,
                  margin: '0 auto',
                }}
              />
              <div style={{ fontSize: 9, color: done ? textColor : mutedColor, marginTop: 6, fontWeight: done ? 700 : 400 }}>
                {LIFECYCLE_LABELS[stage]}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {data.provider} {data.vehicleType}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>₹{data.fare}</div>
        </div>
      </div>

      {data.driver && (
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Driver</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{data.driver.driverName}</div>
              <div style={{ fontSize: 11, color: mutedColor, marginTop: 2 }}>
                {data.driver.vehicleNumber} · ⭐ {data.driver.rating.toFixed(1)}
              </div>
            </div>
            {data.status !== 'COMPLETED' && (
              <div style={{ fontSize: 13, fontWeight: 700 }}>{data.driver.etaMinutes} min</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
