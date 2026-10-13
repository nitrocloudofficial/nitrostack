/**
 * Turns raw rule findings into scored, severity-ranked findings.
 *
 * score = base[rule] * exposureMultiplier * sensitivityMultiplier, clamped
 * 0-100. Severity is a pure function of the final score. R5_SHADOW gets one
 * extra pass afterward: a shadow endpoint that's co-located with a more
 * severe finding (e.g. the same undocumented endpoint also has an auth gap)
 * inherits that finding's severity — an unauthenticated shadow export is a
 * CRITICAL story, not a MEDIUM one, and the score is bumped to the target
 * severity's floor so the two fields never disagree with each other.
 */

import type { EndpointTemplate, Finding, RuleId, Severity } from './types.js';

const BASE_SCORE: Record<RuleId, number> = {
  R3_AUTH_GAP: 70,
  R1_CROSS_ACTOR: 65,
  R7_LOG_INJECTION: 62,
  R2_ENUMERATION: 60,
  R6_UNGUARDED_WRITE: 55,
  R4_EXISTENCE_ORACLE: 40,
  R5_SHADOW: 35,
};

const SENSITIVE_KEYWORDS: { weight: number; words: string[] }[] = [
  { weight: 1.5, words: ['payment', 'invoice', 'billing', 'card', 'ssn', 'tax', 'payroll', 'salary'] },
  { weight: 1.4, words: ['export', 'dump', 'backup', 'admin', 'internal'] },
  { weight: 1.3, words: ['user', 'customer', 'account', 'profile', 'document', 'contract', 'order'] },
];

const SEVERITY_FLOOR: Record<Severity, number> = { CRITICAL: 85, HIGH: 65, MEDIUM: 40, LOW: 0 };
const SEVERITY_RANK: Record<Severity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

function severityFor(score: number): Severity {
  if (score >= SEVERITY_FLOOR.CRITICAL) return 'CRITICAL';
  if (score >= SEVERITY_FLOOR.HIGH) return 'HIGH';
  if (score >= SEVERITY_FLOOR.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

function exposureMultiplier(distinctActors: number, requestCount: number): number {
  return 1.0 + Math.min(0.4, Math.log10(1 + distinctActors * requestCount) / 20);
}

function sensitivityMultiplier(template: string): number {
  const lower = template.toLowerCase();
  let best = 1.0;
  for (const tier of SENSITIVE_KEYWORDS) {
    if (tier.words.some((w) => lower.includes(w)) && tier.weight > best) best = tier.weight;
  }
  return best;
}

export function scoreFindings(findings: Finding[], templates: EndpointTemplate[]): Finding[] {
  const templateByName = new Map(templates.map((t) => [t.template, t]));

  const scored: Finding[] = findings.map((f) => {
    const t = templateByName.get(f.template);
    const exposure = exposureMultiplier(t?.distinctActors ?? 0, t?.requestCount ?? 0);
    const sensitivity = sensitivityMultiplier(f.template);
    const rawScore = BASE_SCORE[f.rule] * exposure * sensitivity;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    return { ...f, score, severity: severityFor(score) };
  });

  // R5 escalation: a shadow finding inherits the max severity of any other
  // finding co-located on the same template.
  const byTemplate = new Map<string, Finding[]>();
  for (const f of scored) {
    if (!byTemplate.has(f.template)) byTemplate.set(f.template, []);
    byTemplate.get(f.template)!.push(f);
  }

  const escalated = scored.map((f) => {
    if (f.rule !== 'R5_SHADOW') return f;
    const siblings = (byTemplate.get(f.template) ?? []).filter((s) => s.rule !== 'R5_SHADOW');
    if (siblings.length === 0) return f;
    const maxSiblingSeverity = siblings.reduce<Severity>(
      (max, s) => (SEVERITY_RANK[s.severity] > SEVERITY_RANK[max] ? s.severity : max),
      'LOW',
    );
    if (SEVERITY_RANK[maxSiblingSeverity] <= SEVERITY_RANK[f.severity]) return f;
    const escalatedScore = Math.max(f.score, SEVERITY_FLOOR[maxSiblingSeverity]);
    return { ...f, score: escalatedScore, severity: severityFor(escalatedScore) };
  });

  escalated.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.template.localeCompare(b.template)));
  return escalated;
}
