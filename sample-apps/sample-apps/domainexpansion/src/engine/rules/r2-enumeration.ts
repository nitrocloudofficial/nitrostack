/**
 * R2_ENUMERATION — CWE-799, Improper Control of Interaction Frequency.
 *
 * Per (actor, template) with at least one path param, slides a 120-second
 * window over that actor's requests using the template's last (most
 * specific) param position. A window touching 20+ distinct values is
 * classified as enumeration — someone systematically walking an ID space.
 */

import type { Finding } from '../types.js';
import type { DetectionContext } from './context.js';
import { CWE_MAP, findingId, capEvidence } from './context.js';

const WINDOW_MS = 120_000;
const THRESHOLD = 20;

interface Offender {
  sub: string;
  idsTouched: number;
  recordIds: string[];
  successCount: number;
}

export function detectR2Enumeration(ctx: DetectionContext): Finding[] {
  const findings: Finding[] = [];

  for (const template of ctx.templates) {
    if (template.params.length === 0) continue;
    const targetPosition = template.params[template.params.length - 1].position;
    const records = ctx.byTemplate.get(template.template) ?? [];

    const bySub = new Map<string, typeof records>();
    for (const r of records) {
      if (!r.actor.sub) continue;
      if (!bySub.has(r.actor.sub)) bySub.set(r.actor.sub, []);
      bySub.get(r.actor.sub)!.push(r);
    }

    let worst: Offender | null = null;

    for (const [sub, subRecords] of bySub) {
      const sorted = [...subRecords].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
      let bestWindowIds: { id: string; status: number; value: string }[] = [];

      let left = 0;
      for (let right = 0; right < sorted.length; right++) {
        while (Date.parse(sorted[right].ts) - Date.parse(sorted[left].ts) > WINDOW_MS) left++;
        const windowSlice = sorted.slice(left, right + 1);
        const distinctValues = new Set(
          windowSlice.map((r) => r.path.split('/').filter((s) => s.length > 0)[targetPosition]),
        );
        if (distinctValues.size > bestWindowIds.length) {
          bestWindowIds = windowSlice.map((r) => ({
            id: r.id,
            status: r.status,
            value: r.path.split('/').filter((s) => s.length > 0)[targetPosition],
          }));
        }
      }

      const idsTouched = new Set(bestWindowIds.map((w) => w.value)).size;
      if (idsTouched >= THRESHOLD) {
        const successCount = bestWindowIds.filter((w) => w.status >= 200 && w.status < 300).length;
        const candidate: Offender = { sub, idsTouched, recordIds: bestWindowIds.map((w) => w.id), successCount };
        if (!worst || candidate.idsTouched > worst.idsTouched) worst = candidate;
      }
    }

    if (!worst) continue;

    const { evidence, evidenceTotalCount } = capEvidence(worst.recordIds);
    const successRatio = worst.recordIds.length > 0 ? worst.successCount / worst.recordIds.length : 0;
    const behaviour = successRatio > 0.8 ? 'mass data extraction' : 'authorization probing';

    const { cwe, cweTitle } = CWE_MAP.R2_ENUMERATION;
    findings.push({
      id: findingId('R2_ENUMERATION', template.template),
      rule: 'R2_ENUMERATION',
      cwe,
      cweTitle,
      template: template.template,
      methods: template.methods,
      severity: 'LOW',
      score: 0,
      title: `Single account enumerated ${worst.idsTouched} distinct object IDs within a 120-second window`,
      rationale:
        `Account ${worst.sub} requested ${worst.idsTouched} distinct object IDs on ${template.template} within a ` +
        `120-second window, with a ${(successRatio * 100).toFixed(0)}% success rate — consistent with ${behaviour}.`,
      evidence,
      evidenceUri: `evidence://finding/${findingId('R2_ENUMERATION', template.template)}`,
      metrics: {
        idsTouched: worst.idsTouched,
        windowSec: WINDOW_MS / 1000,
        successRatio,
        evidenceTotalCount,
      },
      documented: template.documented,
    });
  }

  return findings;
}
