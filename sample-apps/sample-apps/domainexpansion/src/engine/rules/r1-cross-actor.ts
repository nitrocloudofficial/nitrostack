/**
 * R1_CROSS_ACTOR — CWE-639, Authorization Bypass Through User-Controlled Key.
 *
 * For each path-param position, groups 2xx responses by the concrete value
 * seen at that position. If two or more distinct non-admin/service accounts
 * both got a successful response for the *same* object, the object
 * identifier isn't scoped to the requesting account — classic BOLA.
 */

import type { Finding } from '../types.js';
import type { DetectionContext } from './context.js';
import { CWE_MAP, findingId, capEvidence } from './context.js';

interface SharedObject {
  position: number;
  value: string;
  subs: Set<string>;
  recordIds: string[];
}

export function detectR1CrossActor(ctx: DetectionContext): Finding[] {
  const findings: Finding[] = [];

  for (const template of ctx.templates) {
    if (template.params.length === 0) continue;
    const records = ctx.byTemplate.get(template.template) ?? [];

    const sharedObjects: SharedObject[] = [];

    for (const param of template.params) {
      // value -> { subs, hasPrivilegedAccessor, recordIds }
      const byValue = new Map<string, { subs: Set<string>; privileged: boolean; recordIds: string[] }>();

      for (const r of records) {
        if (r.status < 200 || r.status >= 300) continue;
        if (!r.actor.sub) continue;
        const segs = r.path.split('/').filter((s) => s.length > 0);
        const value = segs[param.position];
        if (value === undefined) continue;

        let bucket = byValue.get(value);
        if (!bucket) {
          bucket = { subs: new Set(), privileged: false, recordIds: [] };
          byValue.set(value, bucket);
        }
        bucket.subs.add(r.actor.sub);
        bucket.recordIds.push(r.id);
        if (r.actor.role === 'admin' || r.actor.role === 'service') bucket.privileged = true;
      }

      for (const [value, bucket] of byValue) {
        if (bucket.subs.size >= 2 && !bucket.privileged) {
          sharedObjects.push({ position: param.position, value, subs: bucket.subs, recordIds: bucket.recordIds });
        }
      }
    }

    if (sharedObjects.length === 0) continue;

    const allRecordIds = sharedObjects.flatMap((s) => s.recordIds).sort();
    const { evidence, evidenceTotalCount } = capEvidence(allRecordIds);
    const maxActorsPerObject = Math.max(...sharedObjects.map((s) => s.subs.size));
    const affectedRequests = allRecordIds.length;

    const { cwe, cweTitle } = CWE_MAP.R1_CROSS_ACTOR;
    findings.push({
      id: findingId('R1_CROSS_ACTOR', template.template),
      rule: 'R1_CROSS_ACTOR',
      cwe,
      cweTitle,
      template: template.template,
      methods: template.methods,
      severity: 'LOW', // finalised by scoreFindings
      score: 0,
      title: `${sharedObjects.length} object(s) on this endpoint are reachable by multiple unrelated accounts`,
      rationale:
        `${sharedObjects.length} distinct object value(s) on ${template.template} were fetched successfully by ` +
        `${maxActorsPerObject >= 2 ? `up to ${maxActorsPerObject}` : 'multiple'} distinct, non-privileged accounts each, ` +
        `across ${affectedRequests} request(s) — the object identifier does not appear to be scoped to the requesting account.`,
      evidence,
      evidenceUri: `evidence://finding/${findingId('R1_CROSS_ACTOR', template.template)}`,
      metrics: {
        sharedObjectCount: sharedObjects.length,
        maxActorsPerObject,
        affectedRequests,
        evidenceTotalCount,
      },
      documented: template.documented,
    });
  }

  return findings;
}
