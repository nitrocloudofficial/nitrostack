'use client';

import { useEffect, useState } from 'react';
import { SeverityLevelData } from './types';

const GOLDEN_HOUR_SECONDS = 60 * 60;

const SEVERITY_STYLE: Record<SeverityLevelData, { fg: string; bg: string; label: string }> = {
  Critical: { fg: '#dc2626', bg: 'linear-gradient(135deg, rgba(220,38,38,0.16), rgba(220,38,38,0.05))', label: 'CRITICAL' },
  Severe: { fg: '#d97706', bg: 'linear-gradient(135deg, rgba(217,119,6,0.16), rgba(217,119,6,0.05))', label: 'HIGH' },
  Moderate: { fg: '#b45309', bg: 'linear-gradient(135deg, rgba(180,83,9,0.14), rgba(180,83,9,0.05))', label: 'MODERATE' },
  Mild: { fg: '#16a34a', bg: 'linear-gradient(135deg, rgba(22,163,74,0.14), rgba(22,163,74,0.05))', label: 'MILD' },
};

function formatCountdown(remainingSeconds: number): string {
  const clamped = Math.max(0, remainingSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Live countdown from the moment this widget first received ranked hospital
 * data — a proxy for "time since dispatch began," not a clinical incident
 * timestamp (Lifeline has no incident-onset time input). Interval is cleared
 * on unmount to avoid leaking a per-instance timer.
 */
function useGoldenHour(dispatchStartedAt: number | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!dispatchStartedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [dispatchStartedAt]);

  if (!dispatchStartedAt) return null;
  const elapsedSeconds = Math.floor((now - dispatchStartedAt) / 1000);
  const remainingSeconds = GOLDEN_HOUR_SECONDS - elapsedSeconds;
  const expired = remainingSeconds <= 0;
  const urgent = !expired && remainingSeconds <= 15 * 60;
  return {
    display: expired ? 'ELAPSED' : formatCountdown(remainingSeconds),
    color: expired ? '#dc2626' : urgent ? '#d97706' : '#16a34a',
    expired,
  };
}

interface SeverityBannerProps {
  severity: SeverityLevelData | null;
  emergencyType: string | null;
  dispatchStartedAt: number | null;
  isDark: boolean;
  onCallEmergency: () => void;
}

export default function SeverityBanner({ severity, emergencyType, dispatchStartedAt, isDark, onCallEmergency }: SeverityBannerProps) {
  const goldenHour = useGoldenHour(dispatchStartedAt);
  const style = severity ? SEVERITY_STYLE[severity] : SEVERITY_STYLE.Moderate;
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(241,245,249,0.7)' : 'rgba(15,23,42,0.65)';
  const timestamp = dispatchStartedAt ? new Date(dispatchStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '14px 16px',
        background: style.bg,
        borderBottom: `2px solid ${style.fg}55`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: 0.6,
            color: '#ffffff',
            background: style.fg,
            borderRadius: 8,
            padding: '7px 14px',
            whiteSpace: 'nowrap',
          }}
        >
          ❤️ {style.label}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: textColor }}>{emergencyType ?? 'General Emergency'}</div>
          <div style={{ fontSize: 11, color: mutedColor }}>Dispatch started {timestamp}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {goldenHour && (
          <div
            title="Golden Hour — the first 60 minutes of an emergency, when treatment has the greatest impact on outcome"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontWeight: 800,
              fontSize: 16,
              color: goldenHour.color,
              background: `${goldenHour.color}1a`,
              border: `1px solid ${goldenHour.color}40`,
              borderRadius: 10,
              padding: '4px 14px',
              minWidth: 92,
            }}
          >
            <span>{goldenHour.display}</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, opacity: 0.85 }}>
              🕒 {goldenHour.expired ? 'GOLDEN HOUR' : 'GOLDEN HOUR LEFT'}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onCallEmergency}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 800,
            color: '#ffffff',
            background: '#dc2626',
            border: 'none',
            borderRadius: 10,
            padding: '10px 16px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          📞 Call 108
        </button>
      </div>
    </div>
  );
}
