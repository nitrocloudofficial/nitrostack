/**
 * R4_EXISTENCE_ORACLE — CWE-204, Observable Response Discrepancy.
 *
 * An endpoint that returns 401 for object IDs that exist but aren't
 * authorized, and 404 for IDs that don't exist, lets an unauthenticated
 * caller enumerate real object IDs purely from the status code — never
 * needing to log in. Best practice is to return 404 for both cases so
 * existence isn't observable pre-auth; a clean 401-vs-404 split at the same
 * parameter position is the anti-pattern itself, not just a symptom of one.
 */

import type { Finding } from '../types.js';
import type { DetectionContext } from './context.js';
import { CWE_MAP, findingId, capEvidence } from './context.js';

const DENIED_AUTH = 401;
const NOT_FOUND = 404;

export function detectR4ExistenceOracle(ctx: DetectionContext): Finding[] {
  const findings: Finding[] = [];

  for (const template of ctx.templates) {
    if (template.params.length === 0) continue;
    const position = template.params[template.params.length - 1].position;
    const records = ctx.byTemplate.get(template.template) ?? [];

    // value -> the set of distinct statuses ever seen for that concrete value
    const statusesByValue = new Map<string, Set<number>>();
    const recordsByValue = new Map<string, string[]>();

    for (const r of records) {
      const value = r.path.split('/').filter((s) => s.length > 0)[position];
      if (value === undefined) continue;
      if (!statusesByValue.has(value)) {
        statusesByValue.set(value, new Set());
        recordsByValue.set(value, []);
      }
      statusesByValue.get(value)!.add(r.status);
      recordsByValue.get(value)!.push(r.id);
    }

    const existingIds: string[] = []; // 401-only
    const nonexistentIds: string[] = []; // 404-only
    const evidenceIds: string[] = [];

    for (const [value, statuses] of statusesByValue) {
      if (statuses.size === 1 && statuses.has(DENIED_AUTH)) {
        existingIds.push(value);
        evidenceIds.push(...recordsByValue.get(value)!);
      } else if (statuses.size === 1 && statuses.has(NOT_FOUND)) {
        nonexistentIds.push(value);
        evidenceIds.push(...recordsByValue.get(value)!);
      }
    }

    if (existingIds.length === 0 || nonexistentIds.length === 0) continue;

    const { evidence, evidenceTotalCount } = capEvidence(evidenceIds.sort());
    const { cwe, cweTitle } = CWE_MAP.R4_EXISTENCE_ORACLE;
    const id = findingId('R4_EXISTENCE_ORACLE', template.template);

    findings.push({
      id,
      rule: 'R4_EXISTENCE_ORACLE',
      cwe,
      cweTitle,
      template: template.template,
      methods: template.methods,
      severity: 'LOW', // finalised by scoreFindings
      score: 0,
      title: 'Response status leaks object existence before authentication',
      rationale:
        `${existingIds.length} object ID(s) on ${template.template} consistently return 401 (exists, but ` +
        `unauthorized) while ${nonexistentIds.length} other ID(s) consistently return 404 (does not exist) — ` +
        `an unauthenticated caller can enumerate real object IDs purely from the status code, without ever ` +
        `authenticating.`,
      evidence,
      evidenceUri: `evidence://finding/${id}`,
      metrics: {
        existingIdCount: existingIds.length,
        nonexistentIdCount: nonexistentIds.length,
        evidenceTotalCount,
      },
      documented: template.documented,
    });
  }

  return findings;
}
