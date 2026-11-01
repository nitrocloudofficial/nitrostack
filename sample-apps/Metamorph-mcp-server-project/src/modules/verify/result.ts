// Schema for the runner's result.json v1 (runner/metamorph-run.mjs). The file comes from a job that ran
// untrusted project code, so every string is length-capped and every array is capped. Strings are data: they are
// never interpreted, only counted and displayed.
import { z } from 'zod';
import type { Severity } from '../assessment/types.js';

const short = (n: number) => z.string().max(n);

export const RESULT_LIMITS = { findings: 500, checks: 40, cwe: 10 } as const;

export const CheckStatusSchema = z.enum(['pass', 'fail', 'error', 'skipped']);
export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);

export const CheckSchema = z.object({
  tool: short(64),
  version: short(64),
  status: CheckStatusSchema,
  durationMs: z.number().int().min(0).max(86_400_000),
  summary: short(500),
  counts: z.record(short(64), z.number().int().min(0).max(10_000_000)).refine((c) => Object.keys(c).length <= 20, 'too many counts')
});

export const ResultFindingSchema = z.object({
  tool: short(64),
  ruleId: short(200),
  severity: SeveritySchema,
  title: short(200),
  path: short(500).optional(),
  line: z.number().int().min(1).max(10_000_000).optional(),
  cwe: z.array(short(32)).max(RESULT_LIMITS.cwe).optional(),
  // Optional identity fields added for WS8 (older results do not carry them): advisory ids (CVE, GHSA, PKSA), the affected
  // package, versions, OWASP Top 10 2021 ids the tool itself listed, and a CVSS score when the tool gave one.
  aliases: z.array(short(64)).max(RESULT_LIMITS.cwe).optional(),
  package: short(214).optional(),
  installedVersion: short(100).optional(),
  fixedVersion: short(100).optional(),
  affectedVersions: short(200).optional(),
  owasp: z.array(short(20)).max(RESULT_LIMITS.cwe).optional(),
  cvss: z.number().min(0).max(10).optional()
});

// PHP version the runner chose for composer and phpunit, and why. Optional: older results do not carry it.
export const PhpSelectionSchema = z.object({
  selected: short(16).optional(),
  version: short(32).optional(),
  constraint: short(200).optional(),
  constraintSource: short(40),
  reason: short(400),
  supported: z.boolean(),
  // true when composer.lock was unusable and dependencies were resolved afresh in a scratch copy
  lockRegenerated: z.boolean().optional()
});

export const RunnerResultSchema = z.object({
  schema: z.literal(1),
  repo: short(200),
  commit: short(64),
  patchApplied: z.boolean(),
  startedAt: short(40),
  finishedAt: short(40),
  checks: z.array(CheckSchema).max(RESULT_LIMITS.checks),
  findings: z.array(ResultFindingSchema).max(RESULT_LIMITS.findings),
  // findings beyond the cap are counted, not listed
  findingsTotal: z.number().int().min(0).max(100_000_000).optional(),
  findingsDropped: z.number().int().min(0).max(100_000_000).optional(),
  tests: z.object({
    ran: z.number().int().min(0).max(10_000_000),
    passed: z.number().int().min(0).max(10_000_000),
    failed: z.number().int().min(0).max(10_000_000)
  }),
  buildOk: z.boolean(),
  php: PhpSelectionSchema.optional()
});

export type RunnerResult = z.infer<typeof RunnerResultSchema>;

export interface ResultSummary {
  repo: string;
  commit: string;
  patchApplied: boolean;
  buildOk: boolean;
  findingsBySeverity: Record<Severity, number>;
  findingsTotal: number;
  checksByTool: Record<string, 'pass' | 'fail' | 'error' | 'skipped'>;
  checkStatusCounts: Record<'pass' | 'fail' | 'error' | 'skipped', number>;
  tests: { ran: number; passed: number; failed: number };
}

export type ParseOutcome = { ok: true; result: RunnerResult } | { ok: false; error: string };

/** Parse untrusted result.json text. Never throws. Rejects oversize input before JSON.parse. */
export function parseRunnerResult(text: string, maxBytes = 2_000_000): ParseOutcome {
  if (text.length > maxBytes) return { ok: false, error: `result.json larger than ${maxBytes} bytes` };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'result.json is not valid JSON' };
  }
  const parsed = RunnerResultSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: `result.json failed validation at ${first?.path.join('.') || '(root)'}: ${first?.message ?? 'invalid'}`.slice(0, 300) };
  }
  return { ok: true, result: parsed.data };
}

/** Small object for tool output: counts only, no free text from the repo. */
export function summarizeResult(result: RunnerResult): ResultSummary {
  const findingsBySeverity: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of result.findings) findingsBySeverity[f.severity]++;
  // listed findings are capped at 500; add the dropped ones to the total, not to a severity we cannot know
  const checksByTool: ResultSummary['checksByTool'] = {};
  const checkStatusCounts: ResultSummary['checkStatusCounts'] = { pass: 0, fail: 0, error: 0, skipped: 0 };
  for (const c of result.checks) {
    checksByTool[c.tool] = c.status;
    checkStatusCounts[c.status]++;
  }
  return {
    repo: result.repo,
    commit: result.commit,
    patchApplied: result.patchApplied,
    buildOk: result.buildOk,
    findingsBySeverity,
    findingsTotal: result.findingsTotal ?? result.findings.length,
    checksByTool,
    checkStatusCounts,
    tests: { ...result.tests }
  };
}
