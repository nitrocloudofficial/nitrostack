/**
 * R3_AUTH_GAP — CWE-306, Missing Authentication for Critical Function.
 *
 * Flags a high-traffic template (>=200 requests) that has NEVER once
 * returned 401/403 — but only when a sibling template at the same path
 * depth clearly does enforce auth. That sibling condition is the
 * false-positive control: it's what keeps a route that's simply *supposed*
 * to be public (like /auth/login, which has plenty of its own 401s and so
 * never even reaches the zero-denial check) from being confused with one
 * that's missing a check everything around it has.
 */

import type { Finding } from '../types.js';
import type { DetectionContext } from './context.js';
import { CWE_MAP, findingId, capEvidence } from './context.js';

const MIN_REQUESTS = 200;

function depthOf(template: string): number {
  return template.split('/').filter((s) => s.length > 0).length;
}

function denialCount(statusCounts: Record<string, number>): number {
  return (statusCounts['401'] ?? 0) + (statusCounts['403'] ?? 0);
}

export function detectR3AuthGap(ctx: DetectionContext): Finding[] {
  const findings: Finding[] = [];
  const depthGroups = new Map<number, typeof ctx.templates>();
  for (const t of ctx.templates) {
    const d = depthOf(t.template);
    if (!depthGroups.has(d)) depthGroups.set(d, []);
    depthGroups.get(d)!.push(t);
  }

  for (const template of ctx.templates) {
    if (template.requestCount < MIN_REQUESTS) continue;
    if (denialCount(template.statusCounts) !== 0) continue;

    const depth = depthOf(template.template);
    const siblings = (depthGroups.get(depth) ?? []).filter((t) => t.template !== template.template);
    const siblingDenialCount = siblings.reduce((sum, s) => sum + denialCount(s.statusCounts), 0);
    if (siblingDenialCount === 0) continue; // no sibling proves auth is even checkable at this depth

    const records = ctx.byTemplate.get(template.template) ?? [];
    const { evidence, evidenceTotalCount } = capEvidence(records.map((r) => r.id));

    const { cwe, cweTitle } = CWE_MAP.R3_AUTH_GAP;
    findings.push({
      id: findingId('R3_AUTH_GAP', template.template),
      rule: 'R3_AUTH_GAP',
      cwe,
      cweTitle,
      template: template.template,
      methods: template.methods,
      severity: 'LOW',
      score: 0,
      title: 'Endpoint never returns an authentication or authorization denial',
      rationale:
        `${template.template} served ${template.requestCount} requests with zero 401/403 responses, while ` +
        `${siblings.filter((s) => denialCount(s.statusCounts) > 0).length} sibling endpoint(s) at the same path ` +
        `depth correctly deny unauthorized access — suggesting this endpoint is missing an auth check the rest ` +
        `of the API enforces.`,
      evidence,
      evidenceUri: `evidence://finding/${findingId('R3_AUTH_GAP', template.template)}`,
      metrics: {
        requestCount: template.requestCount,
        denialCount: 0,
        siblingDenialCount,
        depth,
        evidenceTotalCount,
      },
      documented: template.documented,
    });
  }

  return findings;
}
