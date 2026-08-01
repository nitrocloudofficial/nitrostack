'use client';

import { useState } from 'react';
import { RankedHospitalData } from './types';
import { buildEvidence } from './utils';

interface ExplainabilityPanelProps {
  hospital: RankedHospitalData;
  allHospitals: RankedHospitalData[];
  requiredCapability: string;
  rank: number;
  triageConfidence: number | null;
  isDark: boolean;
}

export default function ExplainabilityPanel({
  hospital,
  allHospitals,
  requiredCapability,
  rank,
  triageConfidence,
  isDark,
}: ExplainabilityPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const evidence = buildEvidence(hospital, allHospitals, requiredCapability);

  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(241,245,249,0.65)' : 'rgba(15,23,42,0.6)';
  const bg = isDark ? 'rgba(37,99,235,0.10)' : 'rgba(37,99,235,0.06)';
  const border = isDark ? 'rgba(37,99,235,0.35)' : 'rgba(37,99,235,0.25)';

  return (
    <div
      style={{
        margin: '10px 16px 0',
        borderRadius: 10,
        background: bg,
        border: `1px solid ${border}`,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, color: textColor }}>
          📊 Why {hospital.hospital_name} was selected (Rank #{rank})
        </span>
        <span style={{ fontSize: 12, color: mutedColor }}>{expanded ? '▲ Collapse' : '▼ Expand'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 12px' }}>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: mutedColor, lineHeight: 1.6 }}>
            {evidence.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
            {triageConfidence !== null && triageConfidence >= 0.7 && (
              <li>✓ High-confidence AI triage classification ({Math.round(triageConfidence * 100)}%)</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
