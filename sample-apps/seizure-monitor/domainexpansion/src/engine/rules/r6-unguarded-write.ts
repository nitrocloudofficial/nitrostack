/**
 * R6_UNGUARDED_WRITE — CWE-285, Improper Authorization.
 *
 * Same shape of evidence as R3_AUTH_GAP (a template with zero denials, proven
 * suspicious by a same-depth sibling that DOES deny), but scoped to mutating
 * methods only and at a much lower volume threshold. A read endpoint needs
 * volume before "nobody's ever been denied" is meaningful (R3 requires 200+
 * requests); a WRITE endpoint doesn't — a single unauthorized DELETE or
 * PATCH is already damage done, so the bar for flagging is deliberately low.
 */

import type { Finding } from '../types.js';
import type { DetectionContext } from './context.js';
import { CWE_MAP, findingId, capEvidence } from './context.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const MIN_WRITE_REQUESTS = 10;

function depthOf(template: string): number {
  return template.split('/').filter((s) => s.length > 0).length;
}

function denialCount(statusCounts: Record<string, number>): number {
  return (statusCounts['401'] ?? 0) + (statusCounts['403'] ?? 0);
}

export function detectR6UnguardedWrite(ctx: DetectionContext): Finding[] {
  const findings: Finding[] = [];
  const depthGroups = new Map<number, typeof ctx.templates>();
  for (const t of ctx.templates) {
    const d = depthOf(t.template);
    if (!depthGroups.has(d)) depthGroups.set(d, []);
    depthGroups.get(d)!.push(t);
  }

  for (const template of ctx.templates) {
    const records = ctx.byTemplate.get(template.template) ?? [];
    const mutating = records.filter((r) => MUTATING_METHODS.has(r.method));
    if (mutating.length < MIN_WRITE_REQUESTS) continue;

    const denied = mutating.filter((r) => r.status === 401 || r.status === 403);
    if (denied.length !== 0) continue;

    const depth = depthOf(template.template);
    const siblings = (depthGroups.get(depth) ?? []).filter((t) => t.template !== template.template);
    const siblingDenialCount = siblings.reduce((sum, s) => sum + denialCount(s.statusCounts), 0);
    if (siblingDenialCount === 0) continue; // no sibling proves denial is even checkable at this depth

    const successCount = mutating.filter((r) => r.status >= 200 && r.status < 300).length;
    const distinctActors = new Set(mutating.map((r) => r.actor.sub).filter((s): s is string => s !== null)).size;
    const { evidence, evidenceTotalCount } = capEvidence(mutating.map((r) => r.id));

    const { cwe, cweTitle } = CWE_MAP.R6_UNGUARDED_WRITE;
    const id = findingId('R6_UNGUARDED_WRITE', template.template);

    findings.push({
      id,
      rule: 'R6_UNGUARDED_WRITE',
      cwe,
      cweTitle,
      template: template.template,
      methods: template.methods,
      severity: 'LOW',
      score: 0,
      title: 'Mutating endpoint never denies a request',
      rationale:
        `${mutating.length} mutating request(s) (${[...new Set(mutating.map((r) => r.method))].join('/')}) on ` +
        `${template.template} succeeded ${successCount}/${mutating.length} of the time with zero 401/403 denials, ` +
        `while ${siblings.filter((s) => denialCount(s.statusCounts) > 0).length} sibling endpoint(s) at the same ` +
        `path depth correctly deny unauthorized access — suggesting this write path is missing an authorization ` +
        `check the rest of the API enforces.`,
      evidence,
      evidenceUri: `evidence://finding/${id}`,
      metrics: {
        writeRequestCount: mutating.length,
        deniedCount: 0,
        distinctActors,
        siblingDenialCount,
        evidenceTotalCount,
      },
      documented: template.documented,
    });
  }

  return findings;
}
