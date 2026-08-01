'use client';

import { RankedHospitalData } from './types';

interface HospitalListProps {
  hospitals: RankedHospitalData[];
  selectedHospitalId: string | null;
  isDark: boolean;
  isLoadingRoute: boolean;
  onSelect: (hospitalId: string) => void;
  onReserve: (hospitalId: string) => void;
  onViewDetails: (hospitalId: string) => void;
}

const textColor = (isDark: boolean) => (isDark ? '#f1f5f9' : '#0f172a');
const mutedColor = (isDark: boolean) => (isDark ? 'rgba(241,245,249,0.65)' : 'rgba(15,23,42,0.6)');
const cardBg = (isDark: boolean, selected: boolean) =>
  selected ? (isDark ? 'rgba(37,99,235,0.22)' : 'rgba(37,99,235,0.08)') : isDark ? '#1e293b' : '#ffffff';
const cardBorder = (isDark: boolean, selected: boolean) =>
  selected ? '#2563eb' : isDark ? '#334155' : '#e2e8f0';

function BedBadge({ label, count }: { label: string; count: number }) {
  const color = count === 0 ? '#dc2626' : count <= 2 ? '#d97706' : '#16a34a';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 600,
        color,
        background: `${color}1a`,
        borderRadius: 6,
        padding: '2px 8px',
      }}
    >
      {label}: {count}
    </span>
  );
}

export default function HospitalList({
  hospitals,
  selectedHospitalId,
  isDark,
  isLoadingRoute,
  onSelect,
  onReserve,
  onViewDetails,
}: HospitalListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', padding: 2 }}>
      {hospitals.map((hospital, index) => {
        const selected = hospital.hospital_id === selectedHospitalId;
        const noBeds = hospital.er_beds_available === 0 && hospital.icu_beds_available === 0;

        return (
          <div
            key={hospital.hospital_id}
            onClick={() => onSelect(hospital.hospital_id)}
            style={{
              cursor: 'pointer',
              borderRadius: 12,
              border: `1.5px solid ${cardBorder(isDark, selected)}`,
              background: cardBg(isDark, selected),
              padding: '12px 14px',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div
                  style={{
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 800,
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
                  }}
                >
                  #{index + 1}
                </div>
                <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: textColor(isDark) }}>
                  {hospital.hospital_name}
                  {hospital.is_recommended && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#16a34a',
                        background: 'rgba(22,163,74,0.12)',
                        borderRadius: 6,
                        padding: '2px 6px',
                        verticalAlign: 'middle',
                      }}
                    >
                      RECOMMENDED
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: mutedColor(isDark), marginTop: 2 }}>{hospital.city}</div>
                </div>
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: hospital.match_score >= 70 ? '#16a34a' : hospital.match_score >= 40 ? '#d97706' : '#dc2626',
                  whiteSpace: 'nowrap',
                }}
              >
                {hospital.match_score}
                <span style={{ fontSize: 11, fontWeight: 500, color: mutedColor(isDark) }}>/100</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
              {hospital.capabilities.map((capability) => (
                <span
                  key={capability}
                  style={{
                    fontSize: 11,
                    color: isDark ? '#93c5fd' : '#1d4ed8',
                    background: isDark ? 'rgba(37,99,235,0.18)' : 'rgba(37,99,235,0.08)',
                    borderRadius: 6,
                    padding: '2px 7px',
                  }}
                >
                  {capability}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              <BedBadge label="ER" count={hospital.er_beds_available} />
              <BedBadge label="ICU" count={hospital.icu_beds_available} />
              <span style={{ fontSize: 12, color: mutedColor(isDark) }}>Wait ~{hospital.estimated_er_wait_minutes} min</span>
              <span style={{ fontSize: 12, color: mutedColor(isDark) }}>
                {hospital.distance_km.toFixed(1)} km &middot; {selected && isLoadingRoute ? 'calculating ETA…' : `~${hospital.eta_minutes} min`}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(hospital.hospital_id);
                }}
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                  background: 'transparent',
                  color: textColor(isDark),
                  cursor: 'pointer',
                }}
              >
                {selected ? 'Route shown' : 'Show route'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(hospital.hospital_id);
                }}
                style={{
                  flex: 0.7,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '7px 8px',
                  borderRadius: 8,
                  border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                  background: 'transparent',
                  color: textColor(isDark),
                  cursor: 'pointer',
                }}
              >
                Details
              </button>
              <button
                type="button"
                disabled={noBeds}
                onClick={(e) => {
                  e.stopPropagation();
                  onReserve(hospital.hospital_id);
                }}
                title={noBeds ? 'No ER or ICU beds available' : undefined}
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: noBeds ? (isDark ? '#334155' : '#e2e8f0') : '#dc2626',
                  color: noBeds ? mutedColor(isDark) : '#ffffff',
                  cursor: noBeds ? 'not-allowed' : 'pointer',
                }}
              >
                {noBeds ? 'No beds' : 'Reserve bed'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
