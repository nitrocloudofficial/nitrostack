import type { Category, Finding, Severity } from './types.js';
import { compareFindings } from './rank.js';

// Scoring: start at 100 and deduct a fixed weight per finding by severity
// (critical 25, high 12, medium 5, low 2, info 0). The score never drops below 0 and is rounded.
// byCategory applies the same formula to that category's findings only.
// Discount rule: a finding with confidence 'low' (a dependency advisory matched against a version GUESSED from a range because
// there is no lockfile) counts at half weight. Reason: the guess is the lowest version the range allows, so it overstates
// exposure whenever the real install is newer; but it is not zero, because the lowest version is sometimes exactly what gets
// installed. Half is a stated convention, not a measured probability.
const WEIGHT: Record<Severity, number> = { critical: 25, high: 12, medium: 5, low: 2, info: 0 };
export const LOW_CONFIDENCE_FACTOR = 0.5;
const CATEGORIES: Category[] = ['security', 'dependencies', 'runtime', 'architecture', 'standards', 'cloud'];
const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

export interface Score {
  overall: number;
  byCategory: Record<Category, number>;
  counts: Record<Severity, number>;
  lowConfidenceFindings?: number; // findings counted at half weight (present only when there are any)
}

function scoreOf(findings: Finding[]): number {
  const penalty = findings.reduce((sum, f) => sum + WEIGHT[f.severity] * (f.confidence === 'low' ? LOW_CONFIDENCE_FACTOR : 1), 0);
  return Math.max(0, Math.round(100 - penalty));
}

export function scoreFindings(findings: Finding[]): Score {
  const byCategory = {} as Record<Category, number>;
  for (const c of CATEGORIES) byCategory[c] = scoreOf(findings.filter((f) => f.category === c));
  const counts = {} as Record<Severity, number>;
  for (const s of SEVERITIES) counts[s] = findings.filter((f) => f.severity === s).length;
  const low = findings.filter((f) => f.confidence === 'low').length;
  return { overall: scoreOf(findings), byCategory, counts, ...(low > 0 ? { lowConfidenceFindings: low } : {}) };
}

export function topFindings(findings: Finding[], max = 10): Finding[] {
  const seen = new Set<string>();
  const unique: Finding[] = [];
  for (const f of findings) {
    const key = `${f.id}\u0000${f.evidence ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(f);
  }
  unique.sort(compareFindings);
  return unique.slice(0, Math.max(0, max));
}
