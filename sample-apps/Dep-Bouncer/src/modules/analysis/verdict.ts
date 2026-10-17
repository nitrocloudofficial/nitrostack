import type { Finding, Severity } from './signal.js';

export type Verdict = 'ALLOW' | 'REVIEW' | 'BLOCK';

export interface VerdictResult {
  verdict: Verdict;
  /** 0-100 risk score: the sum of finding weights, capped. */
  score: number;
  /** Findings that carry weight, most severe first. */
  findings: Finding[];
  /** Zero-weight findings: context, not risk. */
  notes: Finding[];
}

/** Thresholds, published as the `bouncer://policy` resource. */
export const POLICY = {
  reviewAt: 30,
  blockAt: 70,
  rule: 'Any critical finding blocks. Incomplete checks require at least REVIEW. Otherwise the summed weights decide: < 30 ALLOW, 30-69 REVIEW, >= 70 BLOCK.',
} as const;

const RANK: Record<Severity, number> = { critical: 3, high: 2, warn: 1, info: 0 };

export function decide(all: Finding[]): VerdictResult {
  const findings = all
    .filter((f) => f.weight > 0)
    .sort((a, b) => RANK[b.severity] - RANK[a.severity] || b.weight - a.weight);
  const notes = all.filter((f) => f.weight <= 0);
  const score = Math.min(100, findings.reduce((s, f) => s + f.weight, 0));
  const critical = findings.some((f) => f.severity === 'critical');
  const verdict: Verdict =
    critical || score >= POLICY.blockAt ? 'BLOCK' : score >= POLICY.reviewAt || all.some(f => f.incomplete) ? 'REVIEW' : 'ALLOW';
  return { verdict, score, findings, notes };
}
