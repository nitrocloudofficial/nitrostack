import { createHash } from 'node:crypto';
import type { AccessLogRecord, EndpointTemplate, RuleId } from '../types.js';

/** Precomputed once per detection run and threaded through every rule. */
export interface DetectionContext {
  records: AccessLogRecord[];
  templates: EndpointTemplate[];
  /** Raw documented-template strings, empty when no spec was ever imported. */
  documented: string[];
  byTemplate: Map<string, AccessLogRecord[]>;
}

export const CWE_MAP: Record<RuleId, { cwe: string; cweTitle: string }> = {
  R1_CROSS_ACTOR: { cwe: 'CWE-639', cweTitle: 'Authorization Bypass Through User-Controlled Key' },
  R2_ENUMERATION: { cwe: 'CWE-799', cweTitle: 'Improper Control of Interaction Frequency' },
  R3_AUTH_GAP: { cwe: 'CWE-306', cweTitle: 'Missing Authentication for Critical Function' },
  R4_EXISTENCE_ORACLE: { cwe: 'CWE-204', cweTitle: 'Observable Response Discrepancy' },
  R5_SHADOW: { cwe: 'CWE-1059', cweTitle: 'Insufficient Documentation' },
  R6_UNGUARDED_WRITE: { cwe: 'CWE-285', cweTitle: 'Improper Authorization' },
  R7_LOG_INJECTION: { cwe: 'CWE-117', cweTitle: 'Improper Output Neutralization for Logs' },
};

/** Stable, non-random finding id derived from rule+template — never index-based. */
export function findingId(rule: RuleId, template: string): string {
  const digest = createHash('sha256').update(`${rule}::${template}`).digest('hex');
  return `${rule.toLowerCase()}_${digest.slice(0, 12)}`;
}

export const EVIDENCE_CAP = 25;

/** Caps an evidence-id list and reports the true count as a metric. */
export function capEvidence(ids: string[]): { evidence: string[]; evidenceTotalCount: number } {
  return { evidence: ids.slice(0, EVIDENCE_CAP), evidenceTotalCount: ids.length };
}
