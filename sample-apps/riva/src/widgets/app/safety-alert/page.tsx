'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface ResolvedLocation {
  query: string;
  formattedAddress: string;
  source: 'live' | 'estimated';
}

interface SosAlertData {
  timestamp: number;
  currentLocation: ResolvedLocation;
  bookingId: string | null;
  contactsNotified: string[];
  locationShared: boolean;
  tripDetailsShared: boolean;
  message: string;
  disclaimer: string;
}

export default function SafetyAlert() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<SosAlertData>();
  const isDark = theme === 'dark';

  const bg = isDark ? '#111318' : '#f7f8fa';
  const cardBg = isDark ? '#1c1f26' : '#ffffff';
  const textColor = isDark ? '#f2f3f5' : '#15181e';
  const mutedColor = isDark ? 'rgba(242,243,245,0.62)' : 'rgba(21,24,30,0.6)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textColor, background: bg }}>
        Sending alert…
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
      {/* Alert banner */}
      <div
        style={{
          background: '#ef4444',
          borderRadius: 16,
          padding: '18px',
          color: 'white',
          marginBottom: 14,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 24 }}>🆘</div>
        <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>Emergency alert sent</div>
        <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4, fontWeight: 700, letterSpacing: 0.5 }}>SIMULATED — DEMO ONLY</div>
      </div>

      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Sent to</div>
        {data.contactsNotified.map((contact) => (
          <div key={contact} style={{ fontSize: 13, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#22c55e' }}>✓</span> {contact}
          </div>
        ))}
        <div style={{ fontSize: 12, color: mutedColor, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${borderColor}` }}>
          📍 Location shared: {data.currentLocation.formattedAddress}
        </div>
        {data.tripDetailsShared && <div style={{ fontSize: 12, color: mutedColor, marginTop: 4 }}>🚗 Trip details shared</div>}
      </div>

      <div style={{ fontSize: 12, color: mutedColor, lineHeight: 1.5, marginBottom: 10 }}>{data.message}</div>

      <div
        style={{
          background: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 12,
          padding: '10px 14px',
          fontSize: 11,
          color: isDark ? '#fca5a5' : '#b91c1c',
          lineHeight: 1.5,
        }}
      >
        ⚠ {data.disclaimer}
      </div>
    </div>
  );
}
