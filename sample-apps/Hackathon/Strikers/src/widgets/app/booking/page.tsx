'use client';

import type { CSSProperties } from 'react';
import {
  useWidgetSDK,
  useTheme,
  useMaxHeight,
  useDisplayMode,
  useWidgetState,
} from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface BookingDoctor {
  doctorId: string;
  name: string;
  specialty: string;
  imageUrl: string;
}

interface BookingSlot {
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: string;
  label: string;
}

interface BookingPatient {
  name: string;
  phone: string;
  age: number | null;
}

interface GetAppointmentOutput {
  found?: boolean;
  bookingId?: string;
  status?: string;
  doctor?: BookingDoctor;
  hospital?: string;
  address?: string;
  city?: string;
  slot?: BookingSlot;
  patient?: BookingPatient;
  reason?: string | null;
  fee?: number;
  currency?: string;
  bookedAt?: string;
  error?: string;
  summary?: string;
  predictions?: {
    queueDelayMinutes: number;
    noShowProbability: string;
    predictionReason: string;
    confidenceScore: number;
  };
}

const accent = '#0f8b8d';
const accentSoft = '#c2feff';

const scopedCss = `
@keyframes arogya-spin { to { transform: rotate(360deg); } }
@keyframes arogya-pop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.arogya-confirm { animation: arogya-pop .28s ease both; }
.arogya-action-btn:hover { background: rgba(15,139,141,0.1); border-color: rgba(15,139,141,0.5); }
.arogya-action-btn-danger:hover { background: rgba(214,69,69,0.1); border-color: rgba(214,69,69,0.5); color: #d64545; }
`;

export default function BookingWidget() {
  const theme = useTheme();
  const maxHeight = useMaxHeight();
  const displayMode = useDisplayMode();
  const { isReady, getToolOutput } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ showDetails: boolean }>(() => ({
    showDetails: true,
  }));

  const data = getToolOutput<GetAppointmentOutput>();
  const isDark = theme === 'dark';

  const shell: CSSProperties = {
    boxSizing: 'border-box',
    padding: 20,
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    WebkitFontSmoothing: 'antialiased',
    background: isDark
      ? 'rgba(11, 18, 20, 0.65)'
      : 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
    borderRadius: 16,
    color: isDark ? '#eaf7f8' : '#0d2b2c',
    ...(maxHeight ? { maxHeight, overflowY: 'auto' as const } : {}),
  };

  const centered: CSSProperties = {
    ...shell,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    minHeight: 200,
  };

  const spinner: CSSProperties = {
    width: 26,
    height: 26,
    borderRadius: '50%',
    border: '2.5px solid rgba(15,139,141,.2)',
    borderTopColor: accent,
    animation: 'arogya-spin .8s linear infinite',
  };

  if (!isReady) {
    return (
      <div style={centered}>
        <style>{scopedCss}</style>
        <div style={spinner} aria-hidden />
        <p style={{ margin: 0, fontSize: 13, opacity: 0.62 }}>Connecting to Arogya…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={centered}>
        <style>{scopedCss}</style>
        <div style={spinner} aria-hidden />
        <p style={{ margin: 0, fontSize: 13, opacity: 0.62 }}>Loading your confirmation…</p>
      </div>
    );
  }

  const doctor = data.doctor;
  const slot = data.slot;

  // Not-found / malformed payload — show the tool's own message rather than crashing.
  if (data.found === false || !doctor || !slot) {
    return (
      <div style={shell}>
        <style>{scopedCss}</style>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            padding: '34px 20px',
            borderRadius: 16,
            border: `1px dashed ${isDark ? 'rgba(234,247,248,.16)' : 'rgba(13,43,44,.16)'}`,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 26, opacity: 0.6 }} aria-hidden>
            🗓️
          </span>
          <p style={{ margin: 0, maxWidth: 400, fontSize: 12.5, lineHeight: 1.6, opacity: 0.7 }}>
            {data.error ?? data.summary ?? 'No appointment details available yet.'}
          </p>
        </div>
      </div>
    );
  }

  const patient = data.patient;
  const status = (data.status ?? 'Confirmed').toLowerCase();
  
  let statusTone = '#17a34a'; // Confirmed/Scheduled/CheckedIn
  if (status === 'cancelled' || status === 'missed') statusTone = '#d64545';
  if (status === 'completed') statusTone = '#5b6c6d';
  if (status === 'rescheduled') statusTone = '#eab308';
  
  const divider = isDark ? 'rgba(234,247,248,.09)' : 'rgba(13,43,44,.08)';
  const showDetails = state?.showDetails !== false;

  const rows: Array<{ label: string; value: string }> = [];
  
  // Hide fake placeholders for patient information
  if (patient?.name && patient.name.trim() !== '') {
    rows.push({ label: 'Patient', value: patient.name });
  }
  if (patient?.phone && patient.phone.trim() !== '') {
    rows.push({ label: 'Phone', value: patient.phone });
  }
  if (typeof patient?.age === 'number') {
    rows.push({ label: 'Age', value: `${patient.age} yrs` });
  }
  
  rows.push({ label: 'Mode', value: slot.mode === 'video' ? 'Video consultation' : 'In-person visit' });
  rows.push({ label: 'Window', value: `${slot.startTime ?? '—'} – ${slot.endTime ?? '—'}` });
  rows.push({ label: 'Booking id', value: data.bookingId ?? '—' });
  
  if (data.predictions) {
    rows.push({ label: 'Estimated Queue Delay', value: `~${data.predictions.queueDelayMinutes} mins` });
  }

  if (data.reason) {
    rows.push({ label: 'Reason', value: data.reason });
  }
  
  rows.push({ label: 'Reminders', value: '24h, 2h, 30m before' });
  rows.push({ label: 'Cancellation Policy', value: 'Free cancellation up to 2 hours before.' });

  return (
    <div style={shell}>
      <style>{scopedCss}</style>

      <div
        className="arogya-confirm"
        style={{
          maxWidth: displayMode === 'fullscreen' ? 640 : 460,
          margin: '0 auto',
          borderRadius: 18,
          overflow: 'hidden',
          background: isDark ? '#111d20' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(234,247,248,.09)' : 'rgba(13,43,44,.09)'}`,
          boxShadow: isDark
            ? '0 12px 34px -22px rgba(0,0,0,.95)'
            : '0 1px 2px rgba(13,43,44,.04), 0 14px 34px -22px rgba(13,43,44,.35)',
        }}
      >
        {/* Status ribbon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '11px 16px',
            background: isDark ? `\${statusTone}20` : `\${statusTone}15`,
            borderBottom: `1px solid ${divider}`,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: statusTone,
              boxShadow: `0 0 0 3px ${statusTone}30`,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 680,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: statusTone,
            }}
          >
            Appointment {status}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10.5, opacity: 0.55 }}>
            Arogya Appointment Arc
          </span>
        </div>

        {/* Doctor identity */}
        <div style={{ display: 'flex', gap: 14, padding: '18px 16px 16px' }}>
          <div
            style={{
              position: 'relative',
              width: 78,
              height: 78,
              flexShrink: 0,
              borderRadius: 14,
              overflow: 'hidden',
              background: isDark
                ? 'linear-gradient(135deg, #14282b 0%, #0e1a1c 100%)'
                : 'linear-gradient(135deg, #d9f6f7 0%, #eef7f8 100%)',
            }}
          >
            {doctor.imageUrl ? (
              <img
                src={doctor.imageUrl}
                alt={doctor.name ?? 'Doctor portrait'}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  fontWeight: 700,
                  color: accent,
                }}
              >
                {monogram(doctor.name)}
              </div>
            )}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 690,
                letterSpacing: '-0.015em',
                lineHeight: 1.25,
              }}
            >
              {doctor.name ?? 'Your clinician'}
            </h1>
            <p
              style={{
                margin: '3px 0 0',
                fontSize: 12.5,
                fontWeight: 600,
                color: isDark ? accentSoft : accent,
              }}
            >
              {doctor.specialty ?? 'Consultation'}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.45, opacity: 0.78, display: 'flex', alignItems: 'center', gap: 4 }}>
              🏥 {data.hospital ?? '—'}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, lineHeight: 1.45, opacity: 0.55 }}>
              {data.address ?? data.city ?? ''}
            </p>
          </div>
        </div>

        {/* Slot hero */}
        <div
          style={{
            margin: '0 16px',
            padding: '14px 16px',
            borderRadius: 14,
            background: isDark ? 'rgba(194,254,255,.07)' : 'rgba(15,139,141,.07)',
            border: `1px solid ${isDark ? 'rgba(194,254,255,.14)' : 'rgba(15,139,141,.16)'}`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 650,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: 0.6,
            }}
          >
            Your slot
          </p>
          <p
            style={{
              margin: '5px 0 0',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
            }}
          >
            {slot.label ?? (`${slot.date ?? ''} ${slot.startTime ?? ''}`.trim() || '—')}
          </p>
        </div>

        {/* Video Link */}
        {slot.mode === 'video' && status !== 'cancelled' && (
          <div style={{ margin: '14px 16px 0', padding: '12px 16px', borderRadius: 10, background: isDark ? '#1a2b2c' : '#f0f9f9', border: `1px solid ${divider}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>🎥 Demo Meeting Link</span>
              <a href={`https://demo.arogyaai.ai/meeting/${data.bookingId?.split('_')[1] || 'ABCD'}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: accent, textDecoration: 'none', padding: '4px 8px', border: `1px solid ${accent}50`, borderRadius: 6, fontWeight: 600 }}>Join</a>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 10, opacity: 0.6 }}>This is a simulated demo meeting room.</p>
          </div>
        )}

        {/* Prediction Insights */}
        {data.predictions && showDetails && (
          <div style={{ margin: '14px 16px 0', padding: '12px 16px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>💡 AI Queue Prediction ({data.predictions.confidenceScore}% Confidence)</p>
            <p style={{ margin: '4px 0 0', fontSize: 10.5, opacity: 0.7, lineHeight: 1.4 }}>{data.predictions.predictionReason}</p>
          </div>
        )}

        {/* Detail rows */}
        {showDetails ? (
          <div style={{ padding: '14px 16px 4px' }}>
            {rows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 14,
                  padding: '7px 0',
                  borderBottom: `1px solid ${divider}`,
                }}
              >
                <span style={{ fontSize: 11.5, opacity: 0.58, flexShrink: 0 }}>{row.label}</span>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 570,
                    textAlign: 'right',
                    wordBreak: 'break-word',
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {/* Fee + Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: '14px 16px 16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 10.5, opacity: 0.55, display: 'block' }}>Consultation fee</span>
              <span style={{ fontSize: 19, fontWeight: 720, letterSpacing: '-0.025em' }}>
                {money(data.fee ?? 0, data.currency ?? 'INR')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setState({ showDetails: !showDetails })}
              style={{
                padding: '8px 13px',
                borderRadius: 10,
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                color: isDark ? accentSoft : accent,
                background: 'transparent',
                border: `1px solid ${isDark ? 'rgba(194,254,255,.28)' : 'rgba(15,139,141,.3)'}`,
              }}
            >
              {showDetails ? 'Hide details' : 'Show details'}
            </button>
          </div>

          {/* Action Buttons */}
          {status !== 'cancelled' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <div className="arogya-action-btn" style={{ flex: 1, padding: 8, textAlign: 'center', fontSize: 11, fontWeight: 600, borderRadius: 8, border: `1px solid ${divider}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                Add to Calendar
              </div>
              {slot.mode === 'in-person' && (
                <div className="arogya-action-btn" style={{ flex: 1, padding: 8, textAlign: 'center', fontSize: 11, fontWeight: 600, borderRadius: 8, border: `1px solid ${divider}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                  Google Maps
                </div>
              )}
              <div className="arogya-action-btn" style={{ flex: 1, padding: 8, textAlign: 'center', fontSize: 11, fontWeight: 600, borderRadius: 8, border: `1px solid ${divider}`, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => alert("Tell the AI Assistant: 'Please reschedule my appointment'")}>
                Reschedule
              </div>
              <div className="arogya-action-btn-danger" style={{ flex: 1, padding: 8, textAlign: 'center', fontSize: 11, fontWeight: 600, borderRadius: 8, border: `1px solid ${divider}`, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => alert("Tell the AI Assistant: 'Please cancel my appointment'")}>
                Cancel
              </div>
            </div>
          )}
        </div>
      </div>

      <p
        style={{
          maxWidth: displayMode === 'fullscreen' ? 640 : 460,
          margin: '14px auto 0',
          fontSize: 11,
          lineHeight: 1.6,
          textAlign: 'center',
          opacity: 0.5,
        }}
      >
        This is a demo booking confirmation. In a production deployment, the hospital would send the consultation link or visit instructions.
        {data.bookedAt ? ` Booked ${bookedAtLabel(data.bookedAt)}.` : ''}
      </p>
    </div>
  );
}

function monogram(name: string): string {
  const parts = (name ?? '')
    .replace(/^dr\.?\s*/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return 'DR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function money(amount: number, currency: string): string {
  const symbol = currency === 'INR' ? '₹' : `${currency} `;
  return `${symbol}${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;
}

function bookedAtLabel(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}
