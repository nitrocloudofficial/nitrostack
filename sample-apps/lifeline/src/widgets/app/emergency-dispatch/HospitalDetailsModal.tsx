'use client';

import { RankedHospitalData, RankingWeightsData } from './types';
import { buildEvidence, buildMapsPlaceUrl } from './utils';

interface HospitalDetailsModalProps {
  hospital: RankedHospitalData;
  allHospitals: RankedHospitalData[];
  requiredCapability: string;
  rank: number;
  weights: RankingWeightsData;
  isDark: boolean;
  onClose: () => void;
  onReserve: () => void;
  onCallHospital: () => void;
  onOpenNavigation: () => void;
  onOpenMapsLink: (url: string) => void;
}

function Row({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  const mutedColor = isDark ? 'rgba(241,245,249,0.6)' : 'rgba(15,23,42,0.55)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '5px 0', borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}` }}>
      <span style={{ color: mutedColor }}>{label}</span>
      <span style={{ color: textColor, fontWeight: 700, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function HospitalDetailsModal({
  hospital,
  allHospitals,
  requiredCapability,
  rank,
  weights,
  isDark,
  onClose,
  onReserve,
  onCallHospital,
  onOpenNavigation,
  onOpenMapsLink,
}: HospitalDetailsModalProps) {
  const panelBg = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(241,245,249,0.65)' : 'rgba(15,23,42,0.6)';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const noBeds = hospital.er_beds_available === 0 && hospital.icu_beds_available === 0;
  const evidence = buildEvidence(hospital, allHospitals, requiredCapability);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: panelBg,
          borderRadius: 16,
          padding: 20,
          width: '100%',
          maxWidth: 440,
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
          border: `1px solid ${borderColor}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div>
            <h3 id="details-modal-title" style={{ color: textColor, margin: 0, fontSize: 17 }}>
              {hospital.hospital_name}
            </h3>
            <div style={{ fontSize: 12, color: mutedColor, marginTop: 2 }}>
              {hospital.city} · Rank #{rank} of {allHospitals.length}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: mutedColor, fontSize: 18, cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <Row label="AI Match Score" value={`${hospital.match_score} / 100`} isDark={isDark} />
          <Row label="Distance" value={`${hospital.distance_km.toFixed(1)} km`} isDark={isDark} />
          <Row label="ETA" value={`${hospital.eta_minutes} min`} isDark={isDark} />
          <Row label="ER Wait Time" value={`${hospital.estimated_er_wait_minutes} min`} isDark={isDark} />
          <Row label="ER Beds" value={String(hospital.er_beds_available)} isDark={isDark} />
          <Row label="ICU Beds" value={String(hospital.icu_beds_available)} isDark={isDark} />
          <Row label="Languages" value={hospital.languages.join(', ')} isDark={isDark} />
          <Row label="Phone" value={hospital.phone_number} isDark={isDark} />
          <Row label="Verification" value={hospital.verification_status === 'VERIFIED' ? 'Verified' : 'Pending verification'} isDark={isDark} />
          <Row label="Status" value={noBeds ? 'No beds available' : 'Operational'} isDark={isDark} />
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: mutedColor, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Capabilities</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {hospital.capabilities.map((cap) => (
              <span
                key={cap}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isDark ? '#93c5fd' : '#1d4ed8',
                  background: isDark ? 'rgba(37,99,235,0.18)' : 'rgba(37,99,235,0.08)',
                  borderRadius: 6,
                  padding: '3px 8px',
                }}
              >
                {cap}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: mutedColor, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
            AI Score Breakdown (weighted factors)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 11 }}>
            <span style={{ color: mutedColor }}>Specialization: {Math.round(weights.specialization_match * 100)}%</span>
            <span style={{ color: mutedColor }}>ICU beds: {Math.round(weights.icu_beds_available * 100)}%</span>
            <span style={{ color: mutedColor }}>ER beds: {Math.round(weights.er_beds_available * 100)}%</span>
            <span style={{ color: mutedColor }}>Distance: {Math.round(weights.distance * 100)}%</span>
            <span style={{ color: mutedColor }}>ETA: {Math.round(weights.eta * 100)}%</span>
            <span style={{ color: mutedColor }}>Wait time: {Math.round(weights.wait_time * 100)}%</span>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: mutedColor, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
            Reason for Recommendation
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: mutedColor, lineHeight: 1.6 }}>
            {evidence.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: mutedColor, fontStyle: 'italic' }}>
          Doctor directory, hospital photos, and a hospital website aren't part of this synthetic demo dataset.
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" onClick={onCallHospital} style={secondaryButton(isDark, borderColor, textColor)}>
            📞 Call
          </button>
          <button type="button" onClick={onOpenNavigation} style={secondaryButton(isDark, borderColor, textColor)}>
            🧭 Navigate
          </button>
          <button type="button" onClick={() => onOpenMapsLink(buildMapsPlaceUrl(hospital))} style={secondaryButton(isDark, borderColor, textColor)}>
            🗺 Maps
          </button>
        </div>
        <button
          type="button"
          disabled={noBeds}
          onClick={onReserve}
          style={{
            width: '100%',
            marginTop: 8,
            padding: '11px 0',
            borderRadius: 10,
            border: 'none',
            background: noBeds ? (isDark ? '#334155' : '#e2e8f0') : '#dc2626',
            color: noBeds ? mutedColor : '#ffffff',
            fontWeight: 800,
            cursor: noBeds ? 'not-allowed' : 'pointer',
          }}
        >
          {noBeds ? 'No Beds Available' : '✅ Reserve ER Bed'}
        </button>
      </div>
    </div>
  );
}

function secondaryButton(isDark: boolean, borderColor: string, textColor: string) {
  return {
    flex: 1,
    fontSize: 12,
    fontWeight: 700,
    padding: '9px 8px',
    borderRadius: 9,
    border: `1px solid ${borderColor}`,
    background: 'transparent',
    color: textColor,
    cursor: 'pointer',
  } as const;
}
