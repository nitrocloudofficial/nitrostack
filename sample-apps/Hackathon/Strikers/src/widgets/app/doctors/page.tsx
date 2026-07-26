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

interface DoctorCard {
  doctorId: string;
  name: string;
  specialty: string;
  city: string;
  hospital: string;
  address: string;
  qualifications: string;
  experienceYears: number;
  languages: string[];
  consultationFee: number;
  currency: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  bio: string;
  openSlotCount: number;
  nextAvailable: string | null;
  acceptsInsurance: boolean;
  distance: number;
  estimatedWaitingTime: number;
}

interface SearchDoctorsOutput {
  query?: { specialty?: string | null; city?: string | null; maxFee?: number | null };
  count?: number;
  doctors?: DoctorCard[];
  summary?: string;
}

const accent = '#0f8b8d';
const accentSoft = '#c2feff';

/** Scoped CSS for what inline styles cannot express (keyframes, hover, disabled). */
const scopedCss = `
@keyframes arogya-spin { to { transform: rotate(360deg); } }
.arogya-card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
.arogya-card:hover { transform: translateY(-2px); }
.arogya-action { transition: filter .15s ease, opacity .15s ease; }
.arogya-action:hover:not(:disabled) { filter: brightness(1.09); }
.arogya-action:disabled { cursor: not-allowed; opacity: .42; }
`;

export default function DoctorsWidget() {
  const theme = useTheme();
  const maxHeight = useMaxHeight();
  const displayMode = useDisplayMode();
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ selectedId: string | null }>(() => ({
    selectedId: null,
  }));

  const data = getToolOutput<SearchDoctorsOutput>();
  const isDark = theme === 'dark';

  const shell: CSSProperties = {
    boxSizing: 'border-box',
    padding: 20,
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    WebkitFontSmoothing: 'antialiased',
    background: isDark
      ? 'linear-gradient(180deg, #08181a 0%, #0b1214 45%)'
      : 'linear-gradient(180deg, #f4feff 0%, #ffffff 42%)',
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
    minHeight: 220,
  };

  const spinner: CSSProperties = {
    width: 26,
    height: 26,
    borderRadius: '50%',
    border: '2.5px solid rgba(15,139,141,.2)',
    borderTopColor: accent,
    animation: 'arogya-spin .8s linear infinite',
  };

  const mutedText: CSSProperties = { margin: 0, fontSize: 13, opacity: 0.62 };

  if (!isReady) {
    return (
      <div style={centered}>
        <style>{scopedCss}</style>
        <div style={spinner} aria-hidden />
        <p style={mutedText}>Connecting to Arogya…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={centered}>
        <style>{scopedCss}</style>
        <div style={spinner} aria-hidden />
        <p style={mutedText}>Searching the provider directory…</p>
      </div>
    );
  }

  const doctors = Array.isArray(data.doctors) ? data.doctors : [];
  const specialty = data.query?.specialty ?? '';
  const city = data.query?.city ?? '';
  const heading =
    [specialty || 'Doctors', city ? `in ${city}` : null].filter(Boolean).join(' ') || 'Doctors';

  const eyebrow: CSSProperties = {
    margin: '0 0 4px',
    fontSize: 10.5,
    fontWeight: 650,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: isDark ? accentSoft : accent,
  };

  const title: CSSProperties = {
    margin: 0,
    fontSize: 21,
    fontWeight: 680,
    letterSpacing: '-0.015em',
    textTransform: 'capitalize',
    lineHeight: 1.2,
  };

  const header = (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 18,
      }}
    >
      <div>
        <p style={eyebrow}>Arogya Appointment Arc</p>
        <h1 style={title}>{doctors.length === 0 ? 'No doctors found' : heading}</h1>
      </div>
      {doctors.length > 0 ? (
        <span
          style={{
            flexShrink: 0,
            padding: '5px 11px',
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 600,
            background: isDark ? 'rgba(194,254,255,.1)' : 'rgba(15,139,141,.1)',
            color: isDark ? accentSoft : accent,
            border: `1px solid ${isDark ? 'rgba(194,254,255,.18)' : 'rgba(15,139,141,.2)'}`,
          }}
        >
          {doctors.length} {doctors.length === 1 ? 'match' : 'matches'}
        </span>
      ) : null}
    </header>
  );

  if (doctors.length === 0) {
    return (
      <div style={shell}>
        <style>{scopedCss}</style>
        {header}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            padding: '36px 20px',
            borderRadius: 16,
            border: `1px dashed ${isDark ? 'rgba(234,247,248,.16)' : 'rgba(13,43,44,.16)'}`,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 26, opacity: 0.6 }} aria-hidden>
            🔍
          </span>
          <p style={{ margin: 0, maxWidth: 380, fontSize: 12.5, lineHeight: 1.6, opacity: 0.68 }}>
            {data.summary ??
              'No clinicians matched that search. Try a different specialty or a nearby city.'}
          </p>
        </div>
      </div>
    );
  }

  /** Compare this doctor against the next-best match on their soonest open date. */
  const compare = (doctor: DoctorCard) => {
    setState({ selectedId: doctor.doctorId });

    const date = (doctor.nextAvailable ?? '').split(' ')[0];
    if (!date || typeof callTool !== 'function') return;

    const peer = doctors.find((other) => other.doctorId !== doctor.doctorId);
    const doctorIds = peer ? [doctor.doctorId, peer.doctorId] : [doctor.doctorId];

    void callTool('compare-slots', { doctorIds, date });
  };

  const cardBase: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 16,
    background: isDark ? '#111d20' : '#ffffff',
    border: `1px solid ${isDark ? 'rgba(234,247,248,.09)' : 'rgba(13,43,44,.09)'}`,
    boxShadow: isDark
      ? '0 8px 26px -20px rgba(0,0,0,.9)'
      : '0 1px 2px rgba(13,43,44,.04), 0 8px 24px -18px rgba(13,43,44,.3)',
  };

  const divider = isDark ? 'rgba(234,247,248,.08)' : 'rgba(13,43,44,.07)';

  return (
    <div style={shell}>
      <style>{scopedCss}</style>
      {header}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${
            displayMode === 'fullscreen' ? 280 : 240
          }px, 1fr))`,
          gap: 16,
        }}
      >
        {doctors.map((doctor) => {
          const isSelected = state?.selectedId === doctor.doctorId;
          const openCount = doctor.openSlotCount ?? 0;
          const languages = Array.isArray(doctor.languages) ? doctor.languages : [];

          return (
            <article
              key={doctor.doctorId}
              className="arogya-card"
              style={
                isSelected
                  ? {
                      ...cardBase,
                      borderColor: accent,
                      boxShadow: '0 0 0 2px rgba(15,139,141,.18)',
                    }
                  : cardBase
              }
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1 / 1',
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
                    loading="lazy"
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
                      fontSize: 34,
                      fontWeight: 700,
                      color: accent,
                    }}
                  >
                    {monogram(doctor.name)}
                  </div>
                )}
                <span
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    padding: '3px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 650,
                    color: '#0d2b2c',
                    background: 'rgba(255,255,255,.92)',
                    boxShadow: '0 1px 3px rgba(0,0,0,.16)',
                  }}
                >
                  ★ {Number(doctor.rating ?? 0).toFixed(1)}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  padding: '14px 14px 15px',
                  flex: 1,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 660,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.3,
                  }}
                >
                  {doctor.name ?? 'Unnamed clinician'}
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: isDark ? accentSoft : accent,
                  }}
                >
                  {doctor.specialty ?? 'General'}
                </p>

                <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.45, opacity: 0.78 }}>
                  {doctor.hospital ?? '—'}
                  {doctor.city ? ` · ${doctor.city}` : ''}
                </p>

                <p style={{ margin: '2px 0 0', fontSize: 11, lineHeight: 1.45, opacity: 0.55 }}>
                  {doctor.qualifications ?? ''}
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 8,
                    fontSize: 11,
                    opacity: 0.6,
                  }}
                >
                  <span>{doctor.experienceYears ?? 0} yrs exp</span>
                  <span aria-hidden style={{ opacity: 0.5 }}>
                    •
                  </span>
                  <span>{Number(doctor.reviewCount ?? 0).toLocaleString('en-IN')} reviews</span>
                  <span aria-hidden style={{ opacity: 0.5 }}>
                    •
                  </span>
                  <span>{doctor.distance ?? 0} km away</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 4,
                    fontSize: 11,
                    color: doctor.acceptsInsurance ? '#17a34a' : 'inherit',
                    opacity: doctor.acceptsInsurance ? 0.9 : 0.6,
                  }}
                >
                  <span>{doctor.acceptsInsurance ? '✓ Accepts Insurance' : '✗ No Insurance'}</span>
                  <span aria-hidden style={{ opacity: 0.5 }}>
                    •
                  </span>
                  <span>{doctor.estimatedWaitingTime ?? 15} min wait</span>
                </div>

                {languages.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 9 }}>
                    {languages.slice(0, 3).map((language) => (
                      <span
                        key={language}
                        style={{
                          padding: '2px 7px',
                          borderRadius: 6,
                          fontSize: 10.5,
                          fontWeight: 550,
                          opacity: 0.8,
                          background: isDark ? 'rgba(234,247,248,.08)' : 'rgba(13,43,44,.055)',
                        }}
                      >
                        {language}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginTop: 12,
                    paddingTop: 11,
                    borderTop: `1px solid ${divider}`,
                  }}
                >
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
                      {money(doctor.consultationFee ?? 0, doctor.currency ?? 'INR')}
                    </span>
                    <span style={{ marginLeft: 4, fontSize: 10.5, opacity: 0.55 }}>consult</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, textAlign: 'right' }}>
                    <span
                      aria-hidden
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: openCount > 0 ? '#17a34a' : '#b0b8b9',
                        boxShadow: openCount > 0 ? '0 0 0 3px rgba(23,163,74,.16)' : 'none',
                      }}
                    />
                    <span style={{ fontSize: 11, opacity: 0.72 }}>
                      {nextAvailableLabel(doctor.nextAvailable ?? null)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="arogya-action"
                  onClick={() => compare(doctor)}
                  disabled={openCount === 0}
                  style={{
                    marginTop: 12,
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: 'none',
                    fontFamily: 'inherit',
                    fontSize: 12.5,
                    fontWeight: 620,
                    color: '#ffffff',
                    background: accent,
                    cursor: 'pointer',
                  }}
                >
                  {openCount === 0 ? 'No slots available' : `Compare ${openCount} open slots`}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {data.summary ? (
        <p style={{ margin: '18px 0 0', fontSize: 11.5, lineHeight: 1.55, opacity: 0.55 }}>
          {data.summary}
        </p>
      ) : null}
    </div>
  );
}

/** Two-letter monogram fallback when a portrait is missing. */
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

/** 900 + INR → "₹900" */
function money(amount: number, currency: string): string {
  const symbol = currency === 'INR' ? '₹' : `${currency} `;
  return `${symbol}${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;
}

/** "2026-07-28 09:30" → "28 Jul, 9:30 AM" */
function nextAvailableLabel(value: string | null): string {
  const raw = (value ?? '').trim();
  if (!raw) return 'No open slots';

  const [date, time] = raw.split(' ');
  const parsed = date && time ? new Date(`${date}T${time}:00Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return raw;

  const day = parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const clock = parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });

  return `${day}, ${clock}`;
}
