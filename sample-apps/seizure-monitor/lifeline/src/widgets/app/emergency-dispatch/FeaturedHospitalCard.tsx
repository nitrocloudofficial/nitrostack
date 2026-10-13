'use client';

import { RankedHospitalData } from './types';

const KEY_CAPABILITIES = ['Trauma Level 1', 'Cardiac Cath Lab', 'Stroke Center', 'Pediatric ICU'] as const;
const CAPABILITY_ICON: Record<string, string> = {
  'Trauma Level 1': '🩹',
  'Cardiac Cath Lab': '❤️‍🩹',
  'Stroke Center': '🧠',
  'Pediatric ICU': '🧒',
  'General ER': '🏥',
};

function StatTile({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  const mutedColor = isDark ? 'rgba(241,245,249,0.6)' : 'rgba(15,23,42,0.55)';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: textColor }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: mutedColor, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
    </div>
  );
}

interface FeaturedHospitalCardProps {
  hospital: RankedHospitalData;
  rank: number;
  isDark: boolean;
  onReserve: () => void;
  onCallHospital: () => void;
  onOpenNavigation: () => void;
}

export default function FeaturedHospitalCard({ hospital, rank, isDark, onReserve, onCallHospital, onOpenNavigation }: FeaturedHospitalCardProps) {
  const panelBg = isDark ? '#111827' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(241,245,249,0.65)' : 'rgba(15,23,42,0.6)';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const noBeds = hospital.er_beds_available === 0 && hospital.icu_beds_available === 0;
  const scoreColor = hospital.match_score >= 70 ? '#16a34a' : hospital.match_score >= 40 ? '#d97706' : '#dc2626';

  return (
    <div
      style={{
        borderRadius: 14,
        background: panelBg,
        border: `2px solid ${hospital.is_recommended ? '#16a34a' : borderColor}`,
        padding: 16,
        boxShadow: hospital.is_recommended ? '0 4px 20px rgba(22,163,74,0.15)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          {hospital.is_recommended && (
            <div style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', letterSpacing: 0.5, marginBottom: 4 }}>
              ⭐ AI RECOMMENDED · RANK #{rank}
            </div>
          )}
          <div style={{ fontSize: 17, fontWeight: 800, color: textColor }}>{hospital.hospital_name}</div>
          <div style={{ fontSize: 12, color: mutedColor, marginTop: 2 }}>{hospital.city}</div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{hospital.match_score}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: mutedColor }}>AI SCORE /100</div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
          gap: 8,
          marginTop: 14,
          padding: '12px 8px',
          borderRadius: 10,
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)',
        }}
      >
        <StatTile label="Distance" value={`${hospital.distance_km.toFixed(1)} km`} isDark={isDark} />
        <StatTile label="ETA" value={`${hospital.eta_minutes} min`} isDark={isDark} />
        <StatTile label="ER Wait" value={`${hospital.estimated_er_wait_minutes} min`} isDark={isDark} />
        <StatTile label="ER Beds" value={String(hospital.er_beds_available)} isDark={isDark} />
        <StatTile label="ICU Beds" value={String(hospital.icu_beds_available)} isDark={isDark} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {KEY_CAPABILITIES.map((cap) => {
          const has = hospital.capabilities.includes(cap);
          return (
            <span
              key={cap}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: has ? (isDark ? '#93c5fd' : '#1d4ed8') : mutedColor,
                background: has ? (isDark ? 'rgba(37,99,235,0.18)' : 'rgba(37,99,235,0.08)') : 'transparent',
                border: has ? 'none' : `1px dashed ${borderColor}`,
                borderRadius: 6,
                padding: '3px 8px',
                opacity: has ? 1 : 0.6,
              }}
            >
              {CAPABILITY_ICON[cap] ?? '🏥'} {cap} {has ? '' : '(not available)'}
            </span>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12, fontSize: 12, color: mutedColor }}>
        <span>🌐 {hospital.languages.join(', ')}</span>
        <span>📞 {hospital.phone_number}</span>
        <span>{hospital.verification_status === 'VERIFIED' ? '✅ Verified' : '⏳ Pending verification'}</span>
        <span>{noBeds ? '🔴 No beds available' : '🟢 Operational'}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          type="button"
          onClick={onCallHospital}
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: 700,
            padding: '9px 10px',
            borderRadius: 9,
            border: `1px solid ${borderColor}`,
            background: 'transparent',
            color: textColor,
            cursor: 'pointer',
          }}
        >
          📞 Call Hospital
        </button>
        <button
          type="button"
          onClick={onOpenNavigation}
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: 700,
            padding: '9px 10px',
            borderRadius: 9,
            border: `1px solid ${borderColor}`,
            background: 'transparent',
            color: textColor,
            cursor: 'pointer',
          }}
        >
          🧭 Navigate
        </button>
        <button
          type="button"
          disabled={noBeds}
          onClick={onReserve}
          style={{
            flex: 1.4,
            fontSize: 12.5,
            fontWeight: 800,
            padding: '9px 10px',
            borderRadius: 9,
            border: 'none',
            background: noBeds ? (isDark ? '#334155' : '#e2e8f0') : '#dc2626',
            color: noBeds ? mutedColor : '#ffffff',
            cursor: noBeds ? 'not-allowed' : 'pointer',
          }}
        >
          {noBeds ? 'No Beds Available' : '✅ Reserve ER Bed'}
        </button>
      </div>
    </div>
  );
}
