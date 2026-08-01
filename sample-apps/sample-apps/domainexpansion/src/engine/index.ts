/**
 * Engine barrel — the one entry point the MCP layer (src/modules/**) should
 * import from. Wires templatising, aggregation, the five core rules, and
 * scoring into a single deterministic call.
 */

import type { AccessLogRecord, EndpointTemplate, Finding } from './types.js';
import { templatisePaths } from './templatise.js';
import { aggregateEndpoints } from './topology.js';
import type { DetectionContext } from './rules/index.js';
import {
  detectR1CrossActor,
  detectR2Enumeration,
  detectR3AuthGap,
  detectR4ExistenceOracle,
  detectR5Shadow,
  detectR6UnguardedWrite,
  detectR7LogInjection,
} from './rules/index.js';
import { scoreFindings } from './score.js';

export function runDetection(
  records: AccessLogRecord[],
  documentedTemplates: string[],
): { findings: Finding[]; templates: EndpointTemplate[] } {
  const templates = aggregateEndpoints(records, documentedTemplates);

  const templateMap = templatisePaths(records.map((r) => r.path));
  const byTemplate = new Map<string, AccessLogRecord[]>();
  for (const r of records) {
    const template = templateMap.get(r.path);
    if (template === undefined) continue;
    if (!byTemplate.has(template)) byTemplate.set(template, []);
    byTemplate.get(template)!.push(r);
  }

  const ctx: DetectionContext = { records, templates, documented: documentedTemplates, byTemplate };

  const rawFindings: Finding[] = [
    ...detectR1CrossActor(ctx),
    ...detectR2Enumeration(ctx),
    ...detectR3AuthGap(ctx),
    ...detectR4ExistenceOracle(ctx),
    ...detectR5Shadow(ctx),
    ...detectR6UnguardedWrite(ctx),
    ...detectR7LogInjection(ctx),
  ];

  const findings = scoreFindings(rawFindings, templates);
  return { findings, templates };
}

export * from './types.js';
export { templatisePaths } from './templatise.js';
export { aggregateEndpoints, buildTopology } from './topology.js';
export { parseOpenApiTemplates, diffSpec } from './spec.js';
export { neutralise, detectInjectionAttempt } from './sanitise.js';
export { scoreFindings } from './score.js';
export { exportReconstructedSpec, generateAuthzTestSuite } from './artifacts.js';
export { parseCombinedLogFormat } from './adapters/combined-log-format.js';
export { parseAwsAlbLogFormat } from './adapters/aws-alb.js';
export { reconstructAttackSession } from './session.js';
