// WS8: the MEASURED score. The runner's findings are normalised (normalize.ts), deduplicated across tools (dedupe.ts) and
// scored with the same formula and ranking as the static assessment (assessment/score.ts, assessment/rank.ts; the weights
// are not copied here). The two scores use one formula over different inputs and are not comparable numbers.
import type { Finding, Severity } from '../assessment/types.js';
import { rankFindings } from '../assessment/rank.js';
import { scoreFindings, type Score } from '../assessment/score.js';
import type { RunnerResult } from '../verify/result.js';
import { dedupeFindings, type DedupeCounts, type DedupeOptions } from './dedupe.js';
import { normalizeResult, type MeasuredFinding } from './normalize.js';

export const MEASURED_ORIGIN = 'measured by runner tools' as const;
export const STATIC_ORIGIN = 'static assessment of the repository files and OSV advisories' as const;

export const SCORES_DIFFER_NOTE =
  'The measured score covers only what the runner tools reported (dependency audits, Semgrep, secret and configuration scanners, code-quality tools), after removing findings several tools reported twice. The static assessment score covers repository files, runtime and hosting checks and OSV advisories. Both use the same formula but look at different things, so do not compare them with each other.';

export interface MeasuredScore extends Score {
  origin: typeof MEASURED_ORIGIN;
}

/** The existing score formula over deduplicated runner findings, labelled with where the number comes from. */
export function scoreMeasured(findings: Finding[]): MeasuredScore {
  return { origin: MEASURED_ORIGIN, ...scoreFindings(findings) };
}

export interface ToolCount {
  tool: string;
  version?: string;
  status?: 'pass' | 'fail' | 'error' | 'skipped';
  reported: number; // findings the tool reported (before deduplication)
  uniqueOnly: number; // distinct findings only this tool reported
}

export interface MeasuredAnalysis {
  origin: typeof MEASURED_ORIGIN;
  findings: MeasuredFinding[]; // deduplicated and ranked (known-exploited, severity, EPSS)
  score: MeasuredScore;
  dedupe: DedupeCounts;
  perTool: ToolCount[];
  /** Findings the runner counted but did not list (its cap), plus any not processed here. The score covers the listed ones only. */
  notListed: number;
  staticCheck?: { packagesInBoth: string[]; advisoriesConfirmed: number };
}

const FINDING_TOOLS_SKIP = new Set(['git-clone', 'git-apply', 'composer-install', 'npm-ci', 'phpunit', 'npm-test', 'runner', 'input-validation']);

export function analyzeFindings(result: Pick<RunnerResult, 'checks' | 'findings' | 'findingsTotal'>, opts: DedupeOptions = {}): MeasuredAnalysis {
  const norm = normalizeResult(result);
  const dd = dedupeFindings(norm.findings, opts);
  const ranked = rankFindings(dd.findings) as MeasuredFinding[];
  const checks = new Map(result.checks.map((c) => [c.tool, c]));
  const tools = new Set<string>([...Object.keys(dd.reportedByTool), ...result.checks.filter((c) => !FINDING_TOOLS_SKIP.has(c.tool) && c.status !== 'skipped').map((c) => c.tool)]);
  const perTool: ToolCount[] = [...tools].sort().map((tool) => {
    const c = checks.get(tool);
    return {
      tool,
      ...(c && c.version !== 'n/a' ? { version: c.version } : {}),
      ...(c ? { status: c.status } : {}),
      reported: dd.reportedByTool[tool] ?? 0,
      uniqueOnly: dd.uniqueByTool[tool] ?? 0
    };
  });
  const total = result.findingsTotal ?? result.findings.length;
  return {
    origin: MEASURED_ORIGIN,
    findings: ranked,
    score: scoreMeasured(ranked),
    dedupe: dd.counts,
    perTool,
    notListed: Math.max(0, total - result.findings.length) + norm.notProcessed,
    ...(dd.staticCheck ? { staticCheck: dd.staticCheck } : {})
  };
}

/** Small object for tool output and the report: numbers only, no text from the repository. */
export interface MeasuredSummary {
  origin: typeof MEASURED_ORIGIN;
  score: number;
  counts: Record<Severity, number>;
  distinct: number; // after deduplication
  reported: number; // before deduplication
  collapsed: number;
  perTool: Array<{ tool: string; reported: number }>;
  notListed: number; // findings beyond the runner's cap; the score does not include them
  knownExploited: number; // distinct findings listed by CISA KEV (0 when KEV data was not available)
}

export function summarizeMeasured(a: MeasuredAnalysis): MeasuredSummary {
  return {
    origin: a.origin,
    score: a.score.overall,
    counts: a.score.counts,
    distinct: a.dedupe.after,
    reported: a.dedupe.before,
    collapsed: a.dedupe.collapsed,
    perTool: a.perTool.filter((t) => t.reported > 0 || t.status === 'pass' || t.status === 'fail').map((t) => ({ tool: t.tool, reported: t.reported })),
    notListed: a.notListed,
    knownExploited: a.findings.filter((f) => f.kev === true).length
  };
}

export interface MeasuredComparison {
  origin: typeof MEASURED_ORIGIN;
  baseline: MeasuredSummary;
  patched: MeasuredSummary;
  scoreDelta: number; // patched minus baseline
  note: string;
}

export function compareMeasured(baseline: MeasuredAnalysis, patched: MeasuredAnalysis): MeasuredComparison {
  return {
    origin: MEASURED_ORIGIN,
    baseline: summarizeMeasured(baseline),
    patched: summarizeMeasured(patched),
    scoreDelta: patched.score.overall - baseline.score.overall,
    note: SCORES_DIFFER_NOTE
  };
}

export interface Enrichment {
  kev?: Set<string>; // CVE ids listed by CISA KEV
  epss?: Map<string, number>; // CVE id -> probability 0..1
}

/** Adds KEV and EPSS from feed data the caller already holds (matched by CVE alias) so the shared ranking can use them. Pure. */
export function enrichMeasured(findings: MeasuredFinding[], e: Enrichment): MeasuredFinding[] {
  return findings.map((f) => {
    const cves = f.aliases.filter((a) => a.startsWith('CVE-'));
    const kev = cves.some((c) => e.kev?.has(c));
    const scores = cves.map((c) => e.epss?.get(c)).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
    if (!kev && scores.length === 0) return f;
    return { ...f, ...(kev ? { kev: true } : {}), ...(scores.length ? { epss: Math.max(...scores) } : {}) };
  });
}
