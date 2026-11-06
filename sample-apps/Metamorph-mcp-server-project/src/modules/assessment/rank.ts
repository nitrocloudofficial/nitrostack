// The one ranking used by assess_project (findings and topFindings), the modernization plan and the report, so the
// three never disagree: known-exploited (CISA KEV) first, then severity, then EPSS (higher first, missing last), then
// category, rule id and evidence for a stable order. Ranking never changes the score.
import type { Finding } from './types.js';
import { SEVERITY_RANK } from './types.js';

export const MAX_RANK_REASON = 80;

export function compareFindings(a: Finding, b: Finding): number {
  return (
    Number(b.kev === true) - Number(a.kev === true) ||
    SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
    Number(a.confidence === 'low') - Number(b.confidence === 'low') || // at equal severity, certain findings before guessed-version ones
    (b.epss ?? -1) - (a.epss ?? -1) ||
    a.category.localeCompare(b.category) ||
    a.id.localeCompare(b.id) ||
    (a.evidence ?? '').localeCompare(b.evidence ?? '')
  );
}

// Short plain-language reason for the position of a finding, at most 80 characters.
export function rankReason(f: Finding): string {
  const parts: string[] = [];
  if (f.kev === true) parts.push('listed as known exploited by CISA');
  parts.push(`severity ${f.severity}`);
  if (typeof f.epss === 'number' && Number.isFinite(f.epss)) parts.push(`EPSS ${f.epss.toFixed(2)}`);
  if (f.confidence === 'low') parts.push('version range, no lockfile');
  return parts.join(', ').slice(0, MAX_RANK_REASON);
}

// Sorted copy, each finding carrying its rankReason.
export function rankFindings(list: Finding[]): Finding[] {
  return [...list].sort(compareFindings).map((f) => ({ ...f, rankReason: rankReason(f) }));
}
