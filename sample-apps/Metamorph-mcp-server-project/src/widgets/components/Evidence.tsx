import React from 'react';

// Evidence labels (docs/EVIDENCE.md) encoded by PATTERN, never by colour:
//   measured = solid fill, projected = dithered fill, unverified = hollow outline, reported = dotted outline.
export type Evidence = 'measured' | 'projected' | 'unverified' | 'reported';

export const EVIDENCE_LABEL: Record<Evidence, string> = { measured: 'Measured', projected: 'Projected', unverified: 'Unverified', reported: 'Reported' };
export const EVIDENCE_MEANING: Record<Evidence, string> = {
  measured: 'From repository files and live advisories',
  projected: 'Our estimate; nothing was changed',
  unverified: 'Not confirmed by a runner',
  reported: 'Stated by an outside source'
};
export const EVIDENCE_ORDER: Evidence[] = ['measured', 'projected', 'unverified', 'reported'];

export function Swatch({ kind }: { kind: Evidence }) {
  return <span className={`ev-swatch ev-${kind}`} aria-hidden="true" />;
}

export function EvidenceChip({ kind, label }: { kind: Evidence; label?: string }) {
  return (
    <span className={`ev-chip ev-chip-${kind}`} title={EVIDENCE_MEANING[kind]}>
      <Swatch kind={kind} />
      {label ?? EVIDENCE_LABEL[kind]}
    </span>
  );
}

// One legend per view, in the footer.
export function EvidenceLegend() {
  return (
    <ul className="legend" aria-label="Evidence legend">
      {EVIDENCE_ORDER.map((k) => (
        <li key={k}>
          <Swatch kind={k} />
          <strong>{EVIDENCE_LABEL[k]}</strong>
          <span className="legend-note">{EVIDENCE_MEANING[k]}</span>
        </li>
      ))}
    </ul>
  );
}
