/**
 * R7_LOG_INJECTION — CWE-117, Improper Output Neutralization for Logs.
 *
 * Runs detectInjectionAttempt over every record and groups hits by
 * template. IMPORTANT: this finding's own title/rationale/metrics must never
 * contain the raw attacker text — only pattern *names*. The actual payload
 * is only ever reachable through evidence://finding/{id}, and even there
 * only after passing through neutralise(). A detector that echoes the
 * payload back into its own output would just be a second injection vector.
 */

import type { Finding } from '../types.js';
import type { DetectionContext } from './context.js';
import { CWE_MAP, findingId, capEvidence } from './context.js';
import { detectInjectionAttempt } from '../sanitise.js';

export function detectR7LogInjection(ctx: DetectionContext): Finding[] {
  const findings: Finding[] = [];

  for (const template of ctx.templates) {
    const records = ctx.byTemplate.get(template.template) ?? [];
    const offendingIds: string[] = [];
    const ips = new Set<string>();
    const patternNames = new Set<string>();

    for (const r of records) {
      const hits = detectInjectionAttempt(r);
      if (!hits) continue;
      offendingIds.push(r.id);
      ips.add(r.ip);
      for (const h of hits) patternNames.add(h.pattern);
    }

    if (offendingIds.length === 0) continue;

    const { evidence, evidenceTotalCount } = capEvidence(offendingIds);
    const { cwe, cweTitle } = CWE_MAP.R7_LOG_INJECTION;
    const id = findingId('R7_LOG_INJECTION', template.template);

    findings.push({
      id,
      rule: 'R7_LOG_INJECTION',
      cwe,
      cweTitle,
      template: template.template,
      methods: template.methods,
      severity: 'LOW',
      score: 0,
      title: 'Prompt-injection payload observed in request metadata',
      rationale:
        `${offendingIds.length} request(s) on ${template.template} contained prompt-injection-shaped content ` +
        `(pattern${patternNames.size > 1 ? 's' : ''}: ${[...patternNames].sort().join(', ')}) in their path, query, ` +
        `or User-Agent. The payload was neutralised before reaching any model — this is an attempt to manipulate ` +
        `automated log analysis, not evidence of a successful compromise.`,
      evidence,
      evidenceUri: `evidence://finding/${id}`,
      metrics: {
        attemptCount: offendingIds.length,
        distinctIps: ips.size,
        distinctPatterns: patternNames.size,
        evidenceTotalCount,
      },
      documented: template.documented,
    });
  }

  return findings;
}
