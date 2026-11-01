// Typed, sanitized input for every report format (PDF, SARIF, CycloneDX). Built once from the assessment pipeline.
// Honest-claims rule (PLAN_V2 section 11): every number carries where it came from.
//   measured  = output of a tool run by Metamorph on the repository (assessment, runner)
//   projected = apply/plan preview: what the score WOULD be, not something that was run
//   reported  = taken from an outside feed (OSV, CISA KEV, EPSS, endoflife.date)
import type { FullAssessment } from '../assessment/assess.js';
import { inventoryNode } from '../assessment/node-inventory.js';
import { inventoryPhp } from '../assessment/php-inventory.js';
import type { Category, DependencyFix, Finding, ModernizationPlan, Severity } from '../assessment/types.js';
import { rankFindings, rankReason } from '../assessment/rank.js';
import type { ApplyResult } from '../planning/apply.js';
import { MEASURED_ORIGIN, SCORES_DIFFER_NOTE, type MeasuredAnalysis, type MeasuredSummary } from '../scanners/measured.js';
import type { DedupeCounts } from '../scanners/dedupe.js';
import type { EnrichmentInfo } from '../scanners/enrich.js';

export type Origin = 'measured' | 'projected' | 'reported';

export interface Labelled<T> {
  value: T;
  origin: Origin;
  source?: string;
}

// src/modules/verify/result.ts does not exist on this branch, so this is the minimal shape the report needs from a
// runner. When the real runner result lands, map it onto this interface (or make it extend it).
export interface RunnerSummary {
  runner: string; // e.g. "github-actions" or "docker"
  startedAt?: string; // ISO 8601
  finishedAt?: string;
  checks: Array<{ name: string; status: 'passed' | 'failed' | 'skipped'; detail?: string; durationMs?: number }>;
  tools?: Array<{ name: string; version: string }>;
  scoreBefore?: number; // measured by the runner
  scoreAfter?: number;
  // Runner-evaluated verdict (verify/evaluate.ts judge). The report says "verified" only when `verified` is true; a summary
  // without a verdict is shown as not verified.
  verified?: boolean;
  unverifiedReasons?: string[];
  patchApplied?: boolean;
  buildOk?: boolean;
  tests?: { ran: number; passed: number; failed: number };
  // PHP version the runner chose and why (result.json `php` block), when the project is PHP.
  php?: { selected?: string; version?: string; constraint?: string; constraintSource: string; reason: string; supported: boolean; lockRegenerated?: boolean };
  // WS8: findings the runner tools reported, normalised and deduplicated (scanners/), with the measured score. `basis` says which
  // run the list and score come from (the patched run when there is one). baseline/patched hold both runs' summaries when both exist.
  // `enrichment` says which KEV/EPSS lookups were made for the findings and which feed was unavailable.
  measured?: { basis: 'patched' | 'baseline'; analysis: MeasuredAnalysis; baseline?: MeasuredSummary; patched?: MeasuredSummary; enrichment?: EnrichmentInfo };
}

// Optional feed provenance: which outside sources were consulted and when.
export interface FeedsData {
  sources: Array<{ name: string; url?: string; fetchedAt?: string }>;
}

export interface ReportMeta {
  repoUrl: string;
  subfolder?: string;
  commit?: string; // what the cover shows: the commit sha when known, otherwise a ref description
  commitSha?: string; // resolved 40-hex commit sha (from the GitHub archive); only set when valid
  generatedAt: string; // ISO 8601; also the PDF creation date, so identical input gives identical bytes
}

export interface ReportFinding {
  id: string;
  category: Category;
  severity: Severity;
  title: string;
  evidence?: string;
  recommendation: string;
  cwe: string[];
  owasp: string[];
  cvss?: Labelled<number>;
  epss?: Labelled<number>;
  kev: boolean; // origin: CISA KEV feed (reported); only ever true when listed
  rankReason: string; // why it sits at this position: KEV first, then severity, then EPSS
  source?: string;
  project?: string; // folder of the project the finding belongs to (multi-project runs); absent for single-project and repo-wide
}

// A finding the runner tools reported. `sources` lists every tool that reported it (after deduplication).
export interface ReportMeasuredFinding extends ReportFinding {
  sources: string[];
  package?: string;
  aliases: string[];
  fixedVersion?: string;
  severityNote?: string; // set only when the tools disagreed, e.g. "composer-audit: medium; trivy: high (strongest kept)"
}

export const MAX_MEASURED_FINDINGS = 500;

export interface ReportMeasuredRun {
  score: Labelled<number>;
  distinct: number;
  reported: number;
  perTool: Array<{ tool: string; reported: number }>;
}

export interface ReportMeasured {
  origin: typeof MEASURED_ORIGIN;
  basis: 'patched' | 'baseline';
  score: Labelled<number>; // measured, from the deduplicated runner findings
  scoreByCategory: Array<{ category: Category; score: Labelled<number> }>;
  counts: Array<{ severity: Severity; count: Labelled<number> }>;
  dedupe: DedupeCounts;
  perTool: Array<{ tool: string; version?: string; status?: string; reported: number; uniqueOnly: number }>;
  notListed: number; // findings the runner counted but did not list; not in the score
  baseline?: ReportMeasuredRun; // set only when both runs exist
  patched?: ReportMeasuredRun;
  staticScore: Labelled<number>; // the static assessment score of the same report, shown next to it
  findings: ReportMeasuredFinding[]; // ranked, deduplicated, at most MAX_MEASURED_FINDINGS
  omitted: number; // deduplicated findings beyond MAX_MEASURED_FINDINGS
  note: string; // states that the two scores differ in what they cover
  staticCheck?: { packagesInBoth: string[]; advisoriesConfirmed: number };
  /** KEV/EPSS lookups made for these findings; `unavailable` names feeds that could not be used (ranking then used what was left). */
  enrichment?: { cves: number; unavailable: string[] };
}

// Optional AWS section (generate_report include_cloud). Its own group: never part of `findings`, `measured` or any score of the
// repository. `status` says whether a scan ran; the other two statuses carry only a short fixed sentence in `summary`.
export interface ReportCloudFinding extends ReportFinding {
  service: string;
  region: string;
  resource: string; // resource id or name as AWS reports it (untrusted text, cleaned)
}

export interface ReportCloud {
  status: 'scanned' | 'not-configured' | 'failed';
  heading: string;
  summary: string;
  regions: string[];
  counts: Array<{ service: string; count: Labelled<number> }>;
  findings: ReportCloudFinding[]; // ranked, at most the inventory's cap
  findingsTotal: number;
  moreFindings: number;
  notChecked: Array<{ service: string; region?: string; code: string; note?: string }>;
  limits: string[];
  note: string;
  generatedAt?: string;
}

export const CLOUD_SOURCE = 'AWS read-only inventory (assumed role)';
export const CLOUD_FINDING_SOURCE = 'aws-readonly';

export interface ReportDependency {
  ecosystem: 'npm' | 'composer';
  name: string;
  version: string;
  dev: boolean;
  approximate: boolean; // version derived from a range, not a lockfile
}

export interface ReportStage {
  index: number;
  id: string;
  title: string;
  kind: string;
  automated: boolean;
  risk: string;
  addresses: number; // count of finding ids
  scoreAfter: Labelled<number>; // projected
}

export interface ReportPatch {
  stageId: string;
  title: string;
  risk: string;
  files: Array<{ path: string; action: string }>;
  scoreBefore: Labelled<number>; // projected
  scoreAfter: Labelled<number>; // projected
  scoreDelta: Labelled<number>; // projected
  findingsFixed: number;
  remaining: number;
}

export interface ReportData {
  meta: ReportMeta;
  stack: string;
  runtime: string; // declared runtime constraint or "not declared"
  score: Labelled<number>;
  scoreByCategory: Array<{ category: Category; score: Labelled<number> }>;
  counts: Array<{ severity: Severity; count: Labelled<number> }>;
  findings: ReportFinding[]; // ranked: KEV, severity, EPSS (assessment/rank.ts)
  truncatedScan: boolean;
  dependencies: ReportDependency[];
  dependencyStats: { total: Labelled<number>; checked: Labelled<number>; vulnerable: Labelled<number>; urgent: Labelled<number>; approximate: boolean };
  fixes: Array<{ ecosystem: string; name: string; from: string; to: string; urgent: boolean; dev: boolean; origin: Origin }>;
  plan?: { goal: string; stack: string; scoreBefore: Labelled<number>; scoreAfter: Labelled<number>; stages: ReportStage[] };
  patches: ReportPatch[];
  verification?: {
    runner: string;
    startedAt?: string;
    finishedAt?: string;
    checks: RunnerSummary['checks'];
    scoreBefore?: Labelled<number>;
    scoreAfter?: Labelled<number>;
    verified: boolean; // as evaluated by the runner module: build ok AND tests ran AND passed AND no other reason
    unverifiedReasons: string[];
    patchApplied?: boolean;
    buildOk?: boolean;
    tests?: { ran: number; passed: number; failed: number };
    php?: NonNullable<RunnerSummary['php']>;
  };
  // Text of the manifest and lockfiles (package.json, package-lock.json, composer.json, composer.lock; paths relative to the
  // analysed folder) so SARIF can point at the line that declares a package. Never rendered into the PDF.
  manifests?: Record<string, string>;
  measured?: ReportMeasured;
  cloud?: ReportCloud;
  tools: Array<{ name: string; version: string }>;
  sources: Array<{ name: string; url?: string; fetchedAt: string }>; // fetchedAt: ISO time, "unavailable" (feed was down) or "not recorded"
}

export const TOOL_NAME = 'Metamorph';
export const TOOL_VERSION = '1.0.0';
export const NOT_RECORDED = 'not recorded';
export const SHA_RE = /^[0-9a-f]{40}$/;
export const NOT_FETCHED_BUILT_IN = 'not fetched (built-in table)';

// ---- untrusted text handling ----

// Control characters (C0 except none, DEL, C1), line/paragraph separators and bidi override/isolate marks (spoofing).
// Tabs and newlines become one space: all report text is single-line plain text.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001F\u007F-\u009F\u2028\u2029\u202A-\u202E\u2066-\u2069\u200E\u200F\uFEFF]/g;

export function cleanText(v: unknown, max = 2000): string {
  if (v === undefined || v === null) return '';
  const s = (typeof v === 'string' ? v : String(v)).replace(CONTROL, ' ').replace(/ {2,}/g, ' ').trim();
  return s.length > max ? s.slice(0, max) : s;
}

function opt(v: unknown, max = 2000): string | undefined {
  const s = cleanText(v, max);
  return s === '' ? undefined : s;
}

// ---- builders ----

export function dependenciesFromFiles(files: Record<string, string>): ReportDependency[] {
  const out: ReportDependency[] = [];
  if ('package.json' in files) {
    const inv = inventoryNode({ packageJson: files['package.json'], packageLock: files['package-lock.json'] });
    for (const d of inv.deps) out.push({ ecosystem: 'npm', name: cleanText(d.name, 214), version: cleanText(d.version, 100), dev: d.dev, approximate: d.approximate });
  }
  if ('composer.json' in files) {
    const inv = inventoryPhp({ composerJson: files['composer.json'], composerLock: files['composer.lock'] }, 0);
    for (const d of inv.deps) out.push({ ecosystem: 'composer', name: cleanText(d.name, 214), version: cleanText(d.version, 100), dev: d.dev, approximate: d.approximate });
  }
  return out;
}

function toReportFinding(f: Finding): ReportFinding {
  const source = opt(f.source, 100);
  return {
    id: cleanText(f.id, 200),
    category: f.category,
    severity: f.severity,
    title: cleanText(f.title, 1000),
    ...(opt(f.evidence) ? { evidence: opt(f.evidence) } : {}),
    recommendation: cleanText(f.recommendation, 1000),
    cwe: (f.cwe ?? []).map((c) => cleanText(c, 20)).filter(Boolean),
    owasp: (f.owasp ?? []).map((c) => cleanText(c, 20)).filter(Boolean),
    ...(typeof f.cvss === 'number' && Number.isFinite(f.cvss) ? { cvss: { value: f.cvss, origin: 'reported' as const, ...(source ? { source } : {}) } } : {}),
    ...(typeof f.epss === 'number' && Number.isFinite(f.epss) ? { epss: { value: f.epss, origin: 'reported' as const, source: 'first.org EPSS' } } : {}),
    kev: f.kev === true,
    rankReason: cleanText(f.rankReason ?? rankReason(f), 80),
    ...(source ? { source } : {}),
    ...(opt(f.project, 200) ? { project: opt(f.project, 200) } : {})
  };
}

const MANIFEST_BASENAMES = new Set(['package.json', 'package-lock.json', 'composer.json', 'composer.lock']);

// Manifest and lockfile texts out of the assessed key files (only these four names, nothing else from the repository).
export function manifestsFromFiles(files: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, text] of Object.entries(files)) {
    if (typeof text === 'string' && MANIFEST_BASENAMES.has(path.split('/').pop() ?? '')) out[path] = text;
  }
  return out;
}

const m = (value: number, source?: string): Labelled<number> => ({ value, origin: 'measured', ...(source ? { source } : {}) });
const p = (value: number, source?: string): Labelled<number> => ({ value, origin: 'projected', ...(source ? { source } : {}) });

function verificationOf(runner: RunnerSummary): NonNullable<ReportData['verification']> {
  const verified = runner.verified === true;
  const given = (runner.unverifiedReasons ?? []).map((r) => cleanText(r, 200)).filter(Boolean);
  const t = runner.tests;
  const php = runner.php;
  return {
    verified,
    // A summary that carries no verdict is never shown as verified, and says why.
    unverifiedReasons: verified ? [] : given.length > 0 ? given : [runner.verified === undefined ? 'the runner result carries no verdict' : 'not verified'],
    ...(typeof runner.patchApplied === 'boolean' ? { patchApplied: runner.patchApplied } : {}),
    ...(typeof runner.buildOk === 'boolean' ? { buildOk: runner.buildOk } : {}),
    ...(t ? { tests: { ran: t.ran, passed: t.passed, failed: t.failed } } : {}),
    ...(php
      ? {
          php: {
            ...(opt(php.selected, 16) ? { selected: opt(php.selected, 16) } : {}),
            ...(opt(php.version, 32) ? { version: opt(php.version, 32) } : {}),
            ...(opt(php.constraint, 200) ? { constraint: opt(php.constraint, 200) } : {}),
            constraintSource: cleanText(php.constraintSource, 40),
            reason: cleanText(php.reason, 400),
            supported: php.supported === true,
            ...(typeof php.lockRegenerated === 'boolean' ? { lockRegenerated: php.lockRegenerated } : {})
          }
        }
      : {}),
    runner: cleanText(runner.runner, 80),
    ...(opt(runner.startedAt, 40) ? { startedAt: opt(runner.startedAt, 40) } : {}),
    ...(opt(runner.finishedAt, 40) ? { finishedAt: opt(runner.finishedAt, 40) } : {}),
    checks: runner.checks.map((c) => ({ name: cleanText(c.name, 200), status: c.status, ...(opt(c.detail, 500) ? { detail: opt(c.detail, 500) } : {}), ...(typeof c.durationMs === 'number' ? { durationMs: c.durationMs } : {}) })),
    ...(typeof runner.scoreBefore === 'number' ? { scoreBefore: m(runner.scoreBefore, runner.runner) } : {}),
    ...(typeof runner.scoreAfter === 'number' ? { scoreAfter: m(runner.scoreAfter, runner.runner) } : {})
  };
}

function runnerTools(runner: RunnerSummary | undefined): ReportData['tools'] {
  return (runner?.tools ?? []).map((t) => ({ name: cleanText(t.name, 80), version: cleanText(t.version, 40) }));
}

function severityNote(by: Record<string, Severity> | undefined): string | undefined {
  if (!by) return undefined;
  return `${Object.entries(by).sort().map(([t, sv]) => `${cleanText(t, 40)}: ${sv}`).join('; ')} (strongest kept)`;
}

function runOf(x: MeasuredSummary): ReportMeasuredRun {
  return {
    score: { value: x.score, origin: 'measured', source: MEASURED_ORIGIN },
    distinct: x.distinct,
    reported: x.reported,
    perTool: x.perTool.map((t) => ({ tool: cleanText(t.tool, 64), reported: t.reported }))
  };
}

function measuredOf(m: NonNullable<RunnerSummary['measured']>, staticScore: number): ReportMeasured {
  const a = m.analysis;
  const lab = (n: number): Labelled<number> => ({ value: n, origin: 'measured', source: MEASURED_ORIGIN });
  const listed = a.findings.slice(0, MAX_MEASURED_FINDINGS).map((f): ReportMeasuredFinding => {
    const base = toReportFinding(f);
    const note = severityNote(f.severityBySource);
    return {
      ...base,
      sources: f.sources.map((x) => cleanText(x, 64)).filter(Boolean).slice(0, 12),
      ...(opt(f.package, 214) ? { package: opt(f.package, 214) } : {}),
      aliases: f.aliases.map((x) => cleanText(x, 64)).filter(Boolean).slice(0, 10),
      ...(opt(f.fixedVersion, 100) ? { fixedVersion: opt(f.fixedVersion, 100) } : {}),
      ...(note ? { severityNote: note } : {})
    };
  });
  return {
    origin: MEASURED_ORIGIN,
    basis: m.basis,
    score: lab(a.score.overall),
    scoreByCategory: (Object.keys(a.score.byCategory) as Category[]).map((c) => ({ category: c, score: lab(a.score.byCategory[c]) })),
    counts: (['critical', 'high', 'medium', 'low', 'info'] as Severity[]).map((s) => ({ severity: s, count: lab(a.score.counts[s]) })),
    dedupe: { ...a.dedupe },
    perTool: a.perTool.map((t) => ({ tool: cleanText(t.tool, 64), ...(t.version ? { version: cleanText(t.version, 40) } : {}), ...(t.status ? { status: t.status } : {}), reported: t.reported, uniqueOnly: t.uniqueOnly })),
    notListed: a.notListed,
    ...(m.baseline && m.patched ? { baseline: runOf(m.baseline), patched: runOf(m.patched) } : {}),
    staticScore: { value: staticScore, origin: 'measured', source: 'Metamorph static assessment' },
    findings: listed,
    omitted: Math.max(0, a.findings.length - listed.length),
    note: SCORES_DIFFER_NOTE,
    ...(a.staticCheck ? { staticCheck: a.staticCheck } : {}),
    ...(m.enrichment ? { enrichment: { cves: m.enrichment.cves, unavailable: [...m.enrichment.unavailable] } } : {})
  };
}

// Adds feed sources by name. A real fetch time beats "unavailable", and the first real fetch time stays (same rule as feed-sources.ts).
export function mergeSources(base: ReportData['sources'], extra: Array<{ name: string; url?: string; fetchedAt?: string }>): ReportData['sources'] {
  const map = new Map(base.map((s) => [s.name, s]));
  for (const s of extra) {
    const name = cleanText(s.name, 120);
    if (!name) continue;
    const cur = map.get(name);
    const at = opt(s.fetchedAt, 40) ?? NOT_RECORDED;
    if (!cur || cur.fetchedAt === 'unavailable' || cur.fetchedAt === NOT_RECORDED) {
      const url = opt(s.url, 300) ?? cur?.url;
      map.set(name, { name, ...(url ? { url } : {}), fetchedAt: at });
    }
  }
  return [...map.values()];
}

const CHECK_STATUS = new Set(['passed', 'failed', 'skipped']);

// Internal seam for the verification runner: the owner calls this with the runner's validated result once it exists
// (map its zod-parsed output onto RunnerSummary). It is deliberately not reachable from any tool input. Returns a new
// ReportData with the verification section filled and the runner's tools added; `data` is not modified.
export function attachRunnerResult(data: ReportData, summary: RunnerSummary): ReportData {
  if (typeof summary?.runner !== 'string' || !Array.isArray(summary.checks) || summary.checks.some((c) => !CHECK_STATUS.has(c?.status))) {
    throw new TypeError('Invalid runner summary: expected a runner name and checks with status passed, failed or skipped.');
  }
  return {
    ...data,
    verification: verificationOf(summary),
    tools: [...data.tools, ...runnerTools(summary)],
    ...(summary.measured ? { measured: measuredOf(summary.measured, data.score.value) } : {}),
    sources: mergeSources(data.sources, summary.measured?.enrichment?.sources ?? [])
  };
}

// Returns a new ReportData with the cloud section; texts from AWS are cleaned again here (they are untrusted). The repository
// score, counts and findings are not touched.
export function attachCloud(data: ReportData, cloud: ReportCloud): ReportData {
  const c = (v: unknown, n: number) => cleanText(v, n);
  const clean: ReportCloud = {
    status: cloud.status,
    heading: c(cloud.heading, 120),
    summary: c(cloud.summary, 400),
    regions: cloud.regions.map((r) => c(r, 30)).filter(Boolean).slice(0, 6),
    counts: cloud.counts.map((x) => ({ service: c(x.service, 30), count: { value: x.count.value, origin: 'measured' as const, source: CLOUD_SOURCE } })),
    findings: cloud.findings.map((f) => ({
      ...f,
      id: c(f.id, 200),
      title: c(f.title, 300),
      ...(opt(f.evidence, 300) ? { evidence: opt(f.evidence, 300) } : {}),
      recommendation: c(f.recommendation, 300),
      rankReason: c(f.rankReason, 80),
      source: CLOUD_FINDING_SOURCE,
      service: c(f.service, 30),
      region: c(f.region, 30),
      resource: c(f.resource, 200),
      kev: false
    })),
    findingsTotal: cloud.findingsTotal,
    moreFindings: cloud.moreFindings,
    notChecked: cloud.notChecked.map((n) => ({ service: c(n.service, 30), ...(n.region ? { region: c(n.region, 30) } : {}), code: c(n.code, 64), ...(n.note ? { note: c(n.note, 200) } : {}) })),
    limits: cloud.limits.map((l) => c(l, 200)),
    note: c(cloud.note, 400),
    ...(cloud.generatedAt ? { generatedAt: c(cloud.generatedAt, 40) } : {})
  };
  const at = clean.generatedAt ?? data.meta.generatedAt;
  return { ...data, cloud: clean, sources: clean.status === 'scanned' ? mergeSources(data.sources, [{ name: CLOUD_SOURCE, fetchedAt: at }]) : data.sources };
}

export interface BuildReportInput {
  full: FullAssessment;
  meta: ReportMeta;
  plan?: ModernizationPlan;
  apply?: ApplyResult[];
  runner?: RunnerSummary;
  feeds?: FeedsData;
  dependencies?: ReportDependency[]; // defaults to the lockfile/manifest inventory of full.files
}

export function buildReportData(input: BuildReportInput): ReportData {
  const { full, meta, plan, apply, runner, feeds } = input;
  const a = full.assessment;
  const findings = rankFindings(full.findings).map(toReportFinding); // the same ranking assess_project and the plan use
  const dependencies = input.dependencies ?? dependenciesFromFiles(full.files);

  const sourceMap = new Map<string, { name: string; url?: string; fetchedAt: string }>();
  // Sources the assessment itself relied on (live endoflife.date answers, built-in EOL tables), then the caller's feed
  // list, which wins on a name clash. Built-in tables were never fetched, so they say so instead of "not recorded".
  for (const s of full.sources ?? []) {
    const name = cleanText(s.name, 120);
    if (name) sourceMap.set(name, { name, ...(opt(s.url, 300) ? { url: opt(s.url, 300) } : {}), fetchedAt: s.builtIn ? NOT_FETCHED_BUILT_IN : (opt(s.fetchedAt, 40) ?? NOT_RECORDED) });
  }
  for (const s of feeds?.sources ?? []) {
    const name = cleanText(s.name, 120);
    if (name) sourceMap.set(name, { name, ...(opt(s.url, 300) ? { url: opt(s.url, 300) } : {}), fetchedAt: opt(s.fetchedAt, 40) ?? NOT_RECORDED });
  }
  // Sources named by findings but not in the feed list: listed with an honest "not recorded" fetch time.
  for (const f of findings) if (f.source && !sourceMap.has(f.source)) sourceMap.set(f.source, { name: f.source, fetchedAt: NOT_RECORDED });

  const tools = [
    { name: TOOL_NAME, version: TOOL_VERSION },
    { name: 'Node.js', version: cleanText(process.versions.node, 20) },
    ...runnerTools(runner)
  ];

  return {
    meta: {
      repoUrl: cleanText(meta.repoUrl, 300),
      ...(opt(meta.subfolder, 200) ? { subfolder: opt(meta.subfolder, 200) } : {}),
      ...(opt(meta.commit, 80) ? { commit: opt(meta.commit, 80) } : {}),
      ...(typeof meta.commitSha === 'string' && SHA_RE.test(meta.commitSha) ? { commitSha: meta.commitSha } : {}),
      generatedAt: meta.generatedAt
    },
    stack: cleanText(a.stack, 20),
    runtime: opt(a.runtime.declared, 100) ?? 'not declared',
    score: m(a.score.overall, 'Metamorph scoring'),
    scoreByCategory: (Object.keys(a.score.byCategory) as Category[]).map((c) => ({ category: c, score: m(a.score.byCategory[c]) })),
    counts: (['critical', 'high', 'medium', 'low', 'info'] as Severity[]).map((s) => ({ severity: s, count: m(a.score.counts[s]) })),
    findings,
    truncatedScan: a.truncated,
    dependencies,
    dependencyStats: {
      total: m(a.dependencies.total),
      checked: m(a.dependencies.checked),
      vulnerable: { value: a.dependencies.vulnerable, origin: 'reported', source: 'osv.dev' },
      urgent: { value: a.dependencies.urgent, origin: 'reported', source: 'osv.dev + CISA KEV' },
      approximate: a.dependencies.approximateVersions
    },
    fixes: full.fixes.map((f: DependencyFix) => ({ ecosystem: f.ecosystem, name: cleanText(f.name, 214), from: cleanText(f.from, 100), to: cleanText(f.to, 100), urgent: f.urgent, dev: f.dev, origin: 'reported' as const })),
    ...(plan
      ? {
          plan: {
            goal: plan.goal,
            stack: plan.stack,
            scoreBefore: m(plan.scoreBefore),
            scoreAfter: p(plan.scoreAfter, 'plan preview'),
            stages: plan.stages.map((s) => ({
              index: s.index,
              id: cleanText(s.id, 60),
              title: cleanText(s.title, 200),
              kind: s.kind,
              automated: s.automated,
              risk: s.risk,
              addresses: s.addresses.length,
              scoreAfter: p(s.scoreAfter, 'plan preview')
            }))
          }
        }
      : {}),
    patches: (apply ?? []).map((r) => ({
      stageId: cleanText(r.stage.id, 60),
      title: cleanText(r.stage.title, 200),
      risk: r.stage.risk,
      files: r.files.map((f) => ({ path: cleanText(f.path, 500), action: f.action })),
      scoreBefore: p(r.scoreBefore, 'apply preview'),
      scoreAfter: p(r.scoreAfter, 'apply preview'),
      scoreDelta: p(r.scoreDelta, 'apply preview'),
      findingsFixed: r.findingsFixed.length,
      remaining: r.remaining.length
    })),
    ...(runner ? { verification: verificationOf(runner) } : {}),
    ...(runner?.measured ? { measured: measuredOf(runner.measured, a.score.overall) } : {}),
    tools,
    manifests: manifestsFromFiles(full.files),
    sources: [...sourceMap.values()]
  };
}
