'use client';

import type { CSSProperties } from 'react';
import { ReservationResultData } from './types';

interface ReservationPanelProps {
  reservation: ReservationResultData | null;
  isDark: boolean;
  onShareReservation: () => void;
  onOpenNavigation: () => void;
  onCallHospital: () => void;
}

function Row({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  const mutedColor = isDark ? 'rgba(241,245,249,0.6)' : 'rgba(15,23,42,0.55)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '4px 0' }}>
      <span style={{ color: mutedColor }}>{label}</span>
      <span style={{ color: textColor, fontWeight: 700, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function ReservationPanel({ reservation, isDark, onShareReservation, onOpenNavigation, onCallHospital }: ReservationPanelProps) {
  const panelBg = isDark ? '#111827' : '#ffffff';
  const borderColor = isDark ? '#1e293b' : '#e2e8f0';
  const mutedColor = isDark ? 'rgba(241,245,249,0.65)' : 'rgba(15,23,42,0.6)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';

  if (!reservation) {
    return (
      <div
        style={{
          margin: '12px 16px 0',
          padding: '14px',
          borderRadius: 10,
          border: `1px dashed ${borderColor}`,
          fontSize: 12.5,
          color: mutedColor,
          textAlign: 'center',
        }}
      >
        🛏 No reservation yet — select a hospital and reserve a bed to see status here.
      </div>
    );
  }

  return (
    <div
      style={{
        margin: '12px 16px 0',
        padding: 16,
        borderRadius: 12,
        background: panelBg,
        border: '2px solid #16a34a',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>✅</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}>Emergency Bed Reserved</div>
          <div style={{ fontSize: 11, color: mutedColor }}>Status: {reservation.status}</div>
        </div>
      </div>

      <div
        style={{
          background: isDark ? 'rgba(22,163,74,0.1)' : 'rgba(22,163,74,0.06)',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, color: mutedColor, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Confirmation / Reference Code
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: textColor, letterSpacing: 1 }}>{reservation.confirmation_code}</div>
      </div>

      <Row label="Hospital" value={reservation.hospital_name} isDark={isDark} />
      <Row label="Department" value={reservation.department} isDark={isDark} />
      <Row label="Bed Type" value={reservation.bed_type} isDark={isDark} />
      <Row label="Reservation ID" value={reservation.reservation_id} isDark={isDark} />
      <Row label="Hospital Contact" value={reservation.hospital_phone_number} isDark={isDark} />
      <Row label="Remaining ER / ICU Beds" value={`${reservation.remaining_er_beds} / ${reservation.remaining_icu_beds}`} isDark={isDark} />
      <Row label="Reserved At" value={new Date(reservation.reserved_at).toLocaleTimeString()} isDark={isDark} />

      <div style={{ marginTop: 10, fontSize: 12, color: mutedColor, lineHeight: 1.5 }}>📋 {reservation.arrival_instructions}</div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={onOpenNavigation} style={buttonStyle(borderColor, textColor)}>
          🧭 Open Navigation
        </button>
        <button type="button" onClick={onCallHospital} style={buttonStyle(borderColor, textColor)}>
          📞 Call Hospital
        </button>
        <button type="button" onClick={onShareReservation} style={buttonStyle(borderColor, textColor)}>
          🔗 Share
        </button>
      </div>
    </div>
  );
}

function buttonStyle(borderColor: string, textColor: string): CSSProperties {
  return {
    flex: 1,
    fontSize: 12,
    fontWeight: 700,
    padding: '8px 8px',
    borderRadius: 8,
    border: `1px solid ${borderColor}`,
    background: 'transparent',
    color: textColor,
    cursor: 'pointer',
  };
}
