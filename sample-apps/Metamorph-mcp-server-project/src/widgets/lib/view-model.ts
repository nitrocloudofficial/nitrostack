// Pure data shaping for the score dashboard widget. No React, no I/O, never throws.
// Accepts the output of assess_project or plan_modernization and returns a capped, typed view model.

export const MAX_FINDINGS = 10;
export const MAX_STAGES = 8;
export const MAX_STEPS = 6;
export const MAX_STRING = 200;
export const MAX_FIXED = 15;
export const MAX_REMAINING = 5;
export const MAX_FILES = 10;
export const MAX_REPORT_FILES = 3;
export const MAX_REPORT_FINDINGS = 3;
// Largest inline (base64 or text) copy the widget will turn into a Blob link. Matches the server's INLINE_LIMIT_BYTES (the text the model reads contains it too).
export const MAX_INLINE_BYTES = 24 * 1024;
export const MAX_CHECKS = 25;
export const MAX_REASONS = 6;
export const MAX_PROJECTS = 10;
export const MAX_NOTES = 5;
export const MAX_WATCH = 20;
export const MAX_WATCH_ITEMS = 10;
const ORIGINS = ['measured', 'projected', 'unverified', 'reported'] as const;

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Risk = 'low' | 'medium' | 'high';

// What the server echoes back about the call that produced a result (see src/modules/assessment/echo.ts). Every field
// is optional: older servers and resumed verifications do not send them. Never holds a secret.
export interface EchoVM {
  repoUrl?: string;
  subfolder?: string;
  commit?: string;
  generatedAt?: string;
}

export interface FindingVM {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  evidence?: string;
  recommendation?: string;
  rankReason?: string;
  source?: string;
  // Known exploited (CISA KEV) and EPSS probability 0..1, only when the result carries them.
  kev?: boolean;
  epss?: number;
  // Folder of the project in a monorepo, when the result says so.
  project?: string;
}

export interface StageVM {
  index: number;
  id: string;
  title: string;
  kind: string;
  automated: boolean;
  risk: Risk;
  steps: string[];
  rollback?: string;
  scoreAfter?: number;
}

export interface DependenciesVM {
  total?: number;
  checked: number;
  vulnerable: number;
  urgent: number;
  approximateVersions: boolean;
}

export interface AssessmentVM {
  kind: 'assessment';
  stack: string;
  score: number;
  byCategory: Array<{ category: string; score: number }>;
  counts: Array<{ severity: Severity; count: number }>;
  findings: FindingVM[];
  findingCount: number;
  dependencies?: DependenciesVM;
  runtime: { declared?: string; source?: string };
  hosting: string[];
  truncated: boolean;
  // Evidence label of the score (docs/EVIDENCE.md): a static assessment is computed from the repository files and live
  // advisory data, so it is 'measured' unless the result says otherwise.
  origin: 'measured' | 'projected' | 'unverified' | 'reported';
  assessmentId?: string;
  // Only when the result carries them (assess_project does not echo its input today): used for the header and for
  // composing the next call.
  repoUrl?: string;
  subfolder?: string;
  commit?: string;
  generatedAt?: string;
  projects: Array<{ path: string; stack: string; assessed: boolean }>;
  notes: string[];
  dependencyTotal?: number;
}

export interface PlanVM extends EchoVM {
  kind: 'plan';
  assessmentId?: string;
  stack: string;
  goal: string;
  scoreBefore?: number;
  scoreAfter?: number;
  stages: StageVM[];
  hint?: string;
}

export interface ApplyVM extends EchoVM {
  kind: 'apply';
  stage: { id: string; index?: number; title: string; risk: Risk };
  mode: 'projected';
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  findingsFixed: string[];
  fixedCount: number;
  remaining: Array<{ id: string; severity: Severity; title: string }>;
  remainingCount: number;
  files: Array<{ path: string; action: 'create' | 'edit' | 'delete' }>;
  fileCount: number;
  note?: string;
  // Numbers about the patch, never the patch itself.
  patchSummary?: { bytes: number; lines: number; added: number; removed: number };
  howToApply: string[];
  howToApplyCount: number;
  nextStep?: string;
}

export type ReportFormatId = 'pdf' | 'sarif' | 'sbom';

export interface ReportFileVM {
  format: ReportFormatId;
  label: string;
  fileName: string;
  bytes: number;
  sizeLabel: string;
  // Where the user gets the file, best first: a signed absolute link, else bytes embedded by the server (the page
  // makes a Blob link), else a relative path or resource URI to show as text.
  href?: string;
  inline?: { encoding: 'base64' | 'utf8'; data: string; mimeType: string };
  path?: string;
  uri?: string;
}

export interface ReportVM extends EchoVM {
  kind: 'report';
  reportId: string;
  score: number;
  origin: 'measured' | 'projected' | 'unverified' | 'reported';
  counts: Array<{ severity: Severity; count: number }>;
  findingTotal: number;
  topFindings: Array<{ severity: Severity; title: string }>;
  pages?: number;
  files: ReportFileVM[];
  expiresInMinutes?: number;
  message?: string;
}

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'timed_out';
export type CheckStatus = 'pass' | 'fail' | 'error' | 'skipped';

export interface RunVM {
  status: RunStatus;
  htmlUrl?: string;
  runId?: string;
  buildOk?: boolean;
  patchApplied?: boolean;
  tests?: { ran: number; passed: number; failed: number };
  php?: { selected?: string; supported: boolean; lockRegenerated?: boolean };
}

export interface CheckVM {
  tool: string;
  status: CheckStatus;
  durationMs?: number;
}

export interface MeasuredSideVM {
  score: number;
  distinct: number;
  perTool: Array<{ tool: string; reported: number }>;
}

export interface VerifyVM extends EchoVM {
  kind: 'verify';
  status: RunStatus;
  verified: boolean;
  reasons: string[];
  reasonCount: number;
  stage?: string;
  patched: RunVM;
  baseline: RunVM;
  checks: CheckVM[];
  checkCount: number;
  notes: string[];
  // Measured score (runner tools) of the baseline and patched runs, when both completed. Never read as verification.
  measured?: { baseline: number; patched: number; delta: number; baselineFindings: number; patchedFindings: number; baselineSide: MeasuredSideVM; patchedSide: MeasuredSideVM; note?: string };
  hint?: string;
}

export interface EmptyVM {
  kind: 'empty';
}

// Data arrived but is none of the known results. `empty` means nothing arrived at all.
export interface UnknownVM {
  kind: 'unknown';
  shape: 'object' | 'array' | 'text' | 'other';
  keys: string[];
}

// check_watch output (src/modules/feeds/check.ts). Every row keeps its source URL and fetch time.
export interface WatchVM {
  kind: 'watch';
  kev: Array<{ cveId: string; vendor: string; product: string; dateAdded?: string; dueDate?: string; ransomware: boolean; source?: string; fetchedAt?: string }>;
  epss: Array<{ cve: string; epss: number; percentile: number; date?: string; source?: string; fetchedAt?: string }>;
  eol: Array<{ product: string; cycle: string; eolDate?: string; isEol: boolean; latest?: string; support?: string; source?: string; fetchedAt?: string }>;
  feedItems: Array<{ title: string; link?: string; published?: string; feed: string; source?: string; fetchedAt?: string }>;
  unavailable: string[];
  fetchedAt?: string;
  nextStep?: string;
}

// cloud_inventory output (src/modules/cloud/inventory.ts). The account is only ever the masked form.
export interface CloudVM {
  kind: 'cloud';
  account: string;
  regions: string[];
  counts: Array<{ service: string; count: number }>;
  severityCounts: Array<{ severity: Severity; count: number }>;
  findingsTotal: number;
  findings: FindingVM[];
  moreFindings: number;
  notChecked: Array<{ service: string; region?: string; code: string; note?: string }>;
  limits: string[];
  generatedAt?: string;
  note?: string;
}

export type ViewModel = AssessmentVM | PlanVM | ApplyVM | VerifyVM | ReportVM | WatchVM | CloudVM | EmptyVM | UnknownVM;

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const RISKS: Risk[] = ['low', 'medium', 'high'];

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (t === '') return undefined;
  return t.length > MAX_STRING ? `${t.slice(0, MAX_STRING - 1)}…` : t;
}

function strList(v: unknown, cap: number): string[] {
  return Array.isArray(v) ? v.map(str).filter((s): s is string => s !== undefined).slice(0, cap) : [];
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function count(v: unknown): number {
  const n = num(v);
  return n === undefined ? 0 : Math.max(0, Math.round(n));
}

function pct(v: unknown): number | undefined {
  const n = num(v);
  return n === undefined ? undefined : Math.min(100, Math.max(0, Math.round(n)));
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

const SHA_RE = /^[0-9a-f]{7,40}$/i;

// http(s) only: never hand a javascript: or data: URL to an anchor.
function safeHttpUrl(v: unknown): string | undefined {
  if (typeof v !== 'string' || v.length > 2048) return undefined;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

// The server's `input` echo (and, for older shapes, top-level repo_url / commit). A URL with credentials or a query is
// dropped: the widget only ever shows or re-sends a plain repository link.
function echoOf(o: Record<string, unknown>): EchoVM {
  const inp = isObj(o.input) ? o.input : {};
  const rawUrl = str(inp.repo_url) ?? str(o.repo_url) ?? str(o.repoUrl);
  let repoUrl: string | undefined;
  const safe = safeHttpUrl(rawUrl);
  if (safe && rawUrl) {
    const u = new URL(safe);
    if (!u.username && !u.password && !u.search && !u.hash) repoUrl = rawUrl;
  }
  const commit = str(o.commit) ?? str(o.sha);
  const at = str(o.generatedAt);
  const sub = str(inp.subfolder) ?? str(o.subfolder);
  return {
    ...(repoUrl ? { repoUrl } : {}),
    ...(sub ? { subfolder: sub } : {}),
    ...(commit && SHA_RE.test(commit) ? { commit } : {}),
    ...(at && !Number.isNaN(new Date(at).getTime()) ? { generatedAt: at } : {})
  };
}

function finding(raw: unknown): FindingVM | undefined {
  if (!isObj(raw)) return undefined;
  const title = str(raw.title);
  if (!title) return undefined;
  return {
    id: str(raw.id) ?? title,
    severity: oneOf(raw.severity, SEVERITIES, 'info'),
    category: str(raw.category) ?? 'general',
    title,
    evidence: str(raw.evidence),
    recommendation: str(raw.recommendation),
    rankReason: str(raw.rankReason),
    source: str(raw.source),
    ...(raw.kev === true ? { kev: true } : {}),
    ...(num(raw.epss) !== undefined && num(raw.epss)! >= 0 && num(raw.epss)! <= 1 ? { epss: num(raw.epss) } : {}),
    ...(str(raw.project) ? { project: str(raw.project) } : {})
  };
}

function stage(raw: unknown, i: number): StageVM | undefined {
  if (!isObj(raw)) return undefined;
  const title = str(raw.title);
  if (!title) return undefined;
  return {
    index: num(raw.index) ?? i + 1,
    id: str(raw.id) ?? `stage-${i + 1}`,
    title,
    kind: str(raw.kind) ?? 'code',
    automated: raw.automated === true,
    risk: oneOf(raw.risk, RISKS, 'medium'),
    steps: strList(raw.steps, MAX_STEPS),
    rollback: str(raw.rollback),
    scoreAfter: pct(raw.scoreAfter)
  };
}

function list<T>(raw: unknown, cap: number, map: (x: unknown, i: number) => T | undefined): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (let i = 0; i < raw.length && out.length < cap; i++) {
    const v = map(raw[i], i);
    if (v !== undefined) out.push(v);
  }
  return out;
}

export const MAX_HOW = 8;

// Counts from a unified diff. The patch text itself is never kept.
export function patchStats(patch: string): { bytes: number; lines: number; added: number; removed: number } {
  let added = 0;
  let removed = 0;
  let lines = 0;
  for (const l of patch.split('\n')) {
    lines++;
    if (l.startsWith('+') && !l.startsWith('+++')) added++;
    else if (l.startsWith('-') && !l.startsWith('---')) removed++;
  }
  return { bytes: patch.length, lines, added, removed };
}

function toApply(o: Record<string, unknown>, before: number, after: number): ApplyVM {
  const st = isObj(o.stage) ? o.stage : {};
  const fixedAll = Array.isArray(o.findingsFixed) ? o.findingsFixed.length : 0;
  const fixed = strList(o.findingsFixed, MAX_FIXED);
  const remainingAll = Array.isArray(o.remaining) ? o.remaining.length : 0;
  const remaining = list(o.remaining, MAX_REMAINING, (r) => {
    if (!isObj(r)) return undefined;
    const title = str(r.title);
    if (!title) return undefined;
    return { id: str(r.id) ?? title, severity: oneOf(r.severity, SEVERITIES, 'info'), title };
  });
  const filesAll = Array.isArray(o.files) ? o.files.length : 0;
  const files = list(o.files, MAX_FILES, (f) => {
    if (!isObj(f)) return undefined;
    const path = str(f.path);
    if (!path) return undefined;
    return { path, action: oneOf(f.action, ['create', 'edit', 'delete'] as const, 'edit') };
  });
  const patchText = typeof o.patch === 'string' ? o.patch : undefined;
  const howAll = Array.isArray(o.howToApply) ? o.howToApply.length : 0;
  const how = strList(o.howToApply, MAX_HOW);
  return {
    kind: 'apply',
    ...echoOf(o),
    ...(patchText !== undefined ? { patchSummary: patchStats(patchText) } : {}),
    howToApply: how,
    howToApplyCount: Math.max(howAll, how.length),
    nextStep: str(o.nextStep),
    stage: { id: str(st.id) ?? 'stage', index: num(st.index), title: str(st.title) ?? str(st.id) ?? 'Stage', risk: oneOf(st.risk, RISKS, 'medium') },
    mode: 'projected',
    scoreBefore: before,
    scoreAfter: after,
    scoreDelta: Math.round(num(o.scoreDelta) ?? after - before),
    findingsFixed: fixed,
    fixedCount: Math.max(fixedAll, fixed.length),
    remaining,
    remainingCount: Math.max(remainingAll, remaining.length),
    files,
    fileCount: Math.max(filesAll, files.length),
    note: str(o.note)
  };
}

const RUN_STATUSES: RunStatus[] = ['queued', 'running', 'completed', 'failed', 'timed_out'];
const CHECK_STATUSES: CheckStatus[] = ['pass', 'fail', 'error', 'skipped'];

function run(raw: unknown): RunVM {
  const o = isObj(raw) ? raw : {};
  const t = isObj(o.tests) ? o.tests : undefined;
  return {
    status: oneOf(o.status, RUN_STATUSES, 'failed'),
    runId: str(o.runId),
    ...(safeHttpUrl(o.htmlUrl) ? { htmlUrl: safeHttpUrl(o.htmlUrl) } : {}),
    buildOk: typeof o.buildOk === 'boolean' ? o.buildOk : undefined,
    patchApplied: typeof o.patchApplied === 'boolean' ? o.patchApplied : undefined,
    tests: t ? { ran: count(t.ran), passed: count(t.passed), failed: count(t.failed) } : undefined,
    ...(isObj(o.php) ? { php: { selected: str(o.php.selected), supported: o.php.supported !== false, ...(typeof o.php.lockRegenerated === 'boolean' ? { lockRegenerated: o.php.lockRegenerated } : {}) } } : {})
  };
}

// verify_patch output. `verified` is true only when the tool says so AND no reason is listed: a green label can never
// come from a missing field or from a reason list that was dropped.
function toVerify(o: Record<string, unknown>): VerifyVM {
  const reasonsAll = Array.isArray(o.unverifiedReasons) ? o.unverifiedReasons.length : 0;
  const reasons = strList(o.unverifiedReasons, MAX_REASONS);
  const patched = isObj(o.patched) ? o.patched : {};
  const checksAll = Array.isArray(patched.checks) ? patched.checks.length : 0;
  const checks = list(patched.checks, MAX_CHECKS, (c) => {
    if (!isObj(c)) return undefined;
    const tool = str(c.tool);
    return tool ? { tool, status: oneOf(c.status, CHECK_STATUSES, 'error'), ...(num(c.durationMs) !== undefined ? { durationMs: Math.max(0, Math.round(num(c.durationMs)!)) } : {}) } : undefined;
  });
  const st = isObj(o.stage) ? o.stage : undefined;
  return {
    kind: 'verify',
    ...echoOf(o),
    status: oneOf(o.status, RUN_STATUSES, 'failed'),
    verified: o.verified === true && reasonsAll === 0 && run(o.patched).status === 'completed',
    reasons,
    reasonCount: Math.max(reasonsAll, reasons.length),
    stage: st ? (str(st.title) ?? str(st.id)) : undefined,
    patched: run(o.patched),
    baseline: run(o.baseline),
    checks,
    checkCount: Math.max(checksAll, checks.length, count(patched.checkCount)),
    notes: strList(o.notes, MAX_NOTES),
    measured: measuredOf(o.measured),
    hint: str(o.hint)
  };
}

function measuredOf(raw: unknown): VerifyVM['measured'] {
  if (!isObj(raw) || !isObj(raw.baseline) || !isObj(raw.patched)) return undefined;
  const b = pct(raw.baseline.score);
  const p = pct(raw.patched.score);
  if (b === undefined || p === undefined) return undefined;
  const side = (x: Record<string, unknown>, score: number): MeasuredSideVM => ({
    score,
    distinct: count(x.distinct),
    perTool: list(x.perTool, MAX_CHECKS, (t) => {
      if (!isObj(t)) return undefined;
      const tool = str(t.tool);
      return tool ? { tool, reported: count(t.reported) } : undefined;
    })
  });
  return { baseline: b, patched: p, delta: p - b, baselineFindings: count(raw.baseline.distinct), patchedFindings: count(raw.patched.distinct), baselineSide: side(raw.baseline, b), patchedSide: side(raw.patched, p), note: str(raw.note) };
}

function toAssessment(o: Record<string, unknown>, score: Record<string, unknown>): AssessmentVM {
  const byCat = isObj(score.byCategory) ? score.byCategory : {};
  const counts = isObj(score.counts) ? score.counts : {};
  const deps = isObj(o.dependencies) ? o.dependencies : undefined;
  const runtime = isObj(o.runtime) ? o.runtime : {};
  const findings = list(o.topFindings, MAX_FINDINGS, finding);
  return {
    kind: 'assessment',
    stack: str(o.stack) ?? 'unknown',
    score: pct(score.overall) ?? 0,
    byCategory: Object.entries(byCat)
      .map(([category, v]) => ({ category: category.slice(0, 40), score: pct(v) }))
      .filter((x): x is { category: string; score: number } => x.score !== undefined),
    counts: SEVERITIES.map((severity) => ({ severity, count: count(counts[severity]) })),
    findings,
    findingCount: Math.max(count(o.findingCount), findings.length),
    dependencies: deps
      ? {
          total: num(deps.total) === undefined ? undefined : count(deps.total),
          checked: count(deps.checked),
          vulnerable: count(deps.vulnerable),
          urgent: count(deps.urgent),
          approximateVersions: deps.approximateVersions === true
        }
      : undefined,
    runtime: { declared: str(runtime.declared), source: str(runtime.source) },
    hosting: strList(o.hosting, 10),
    truncated: o.truncated === true,
    origin: oneOf(isObj(o.score) ? o.score.origin : undefined, ORIGINS, 'measured'),
    assessmentId: str(o.assessmentId),
    ...echoOf(o),
    projects: list(o.projects, MAX_PROJECTS, (p) => {
      if (!isObj(p)) return undefined;
      const path = str(p.path);
      return path ? { path, stack: str(p.stack) ?? 'unknown', assessed: p.assessed !== false } : undefined;
    }),
    notes: strList(o.notes, MAX_NOTES),
    dependencyTotal: deps && num(deps.total) !== undefined ? count(deps.total) : undefined
  };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const FORMATS_ID: readonly ReportFormatId[] = ['pdf', 'sarif', 'sbom'];
const MIME_BY_FORMAT: Record<ReportFormatId, string> = { pdf: 'application/pdf', sarif: 'application/sarif+json', sbom: 'application/vnd.cyclonedx+json' };
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

function inlineOf(raw: unknown, format: ReportFormatId): ReportFileVM['inline'] {
  if (!isObj(raw) || typeof raw.data !== 'string') return undefined;
  const encoding = raw.encoding === 'base64' ? 'base64' : raw.encoding === 'utf8' ? 'utf8' : undefined;
  if (!encoding) return undefined;
  const size = encoding === 'base64' ? Math.floor((raw.data.length * 3) / 4) : raw.data.length;
  if (size > MAX_INLINE_BYTES) return undefined;
  if (encoding === 'base64' && !BASE64.test(raw.data)) return undefined;
  return { encoding, data: raw.data, mimeType: MIME_BY_FORMAT[format] };
}

function reportFile(raw: unknown): ReportFileVM | undefined {
  if (!isObj(raw)) return undefined;
  const format = oneOf(raw.format, FORMATS_ID, 'pdf');
  if (!FORMATS_ID.includes(raw.format as ReportFormatId)) return undefined;
  const bytes = count(raw.bytes);
  const path = str(raw.downloadPath);
  return {
    format,
    label: str(raw.label) ?? format.toUpperCase(),
    fileName: str(raw.fileName) ?? `report.${format}`,
    bytes,
    sizeLabel: formatBytes(bytes),
    href: safeHttpUrl(raw.downloadUrl),
    inline: inlineOf(raw.inline, format),
    path: path && path.startsWith('/') ? path : undefined,
    uri: str(raw.uri)
  };
}

function toReport(o: Record<string, unknown>, score: Record<string, unknown>): ReportVM {
  const f = isObj(o.findings) ? o.findings : {};
  const counts = SEVERITIES.map((severity) => ({ severity, count: count(f[severity]) }));
  const top = list(o.topFindings, MAX_REPORT_FINDINGS, (t) => {
    if (!isObj(t)) return undefined;
    const title = str(t.title);
    return title ? { severity: oneOf(t.severity, SEVERITIES, 'info'), title } : undefined;
  });
  return {
    kind: 'report',
    ...echoOf(o),
    reportId: (str(o.reportId) ?? '').slice(0, 24),
    score: pct(score.overall) ?? 0,
    origin: oneOf(score.origin, ORIGINS, 'measured'),
    counts,
    findingTotal: Math.max(count(f.total), counts.reduce((a, c) => a + c.count, 0)),
    topFindings: top,
    pages: num(o.pages) === undefined ? undefined : count(o.pages),
    files: list(o.files, MAX_REPORT_FILES, reportFile),
    expiresInMinutes: num(o.expiresInMinutes) === undefined ? undefined : count(o.expiresInMinutes),
    message: typeof o.message === 'string' ? o.message.trim().slice(0, 1000) || undefined : undefined
  };
}

// Shapes a host may wrap the tool result in. The widget SDK only unwraps structuredContent and a content array, so
// {result: ...}, {data: ...}, a bare content array or a JSON string all used to land on the empty state.
const WRAPPER_KEYS = ['structuredContent', 'result', 'data', 'output', 'toolOutput', 'payload', 'response', 'params'] as const;
const MAX_UNWRAP_DEPTH = 5;
const MAX_BLOCKS = 20;

// Classify one object by its own fields. Undefined when it is none of the known results.
function toWatch(o: Record<string, unknown>): WatchVM {
  const src = (r: Record<string, unknown>) => ({ source: str(r.source), fetchedAt: str(r.fetchedAt) });
  return {
    kind: 'watch',
    kev: list(o.kevHits, MAX_WATCH, (r) => {
      if (!isObj(r)) return undefined;
      const cveId = str(r.cveId);
      return cveId ? { cveId, vendor: str(r.vendor) ?? '', product: str(r.product) ?? '', dateAdded: str(r.dateAdded), dueDate: str(r.dueDate), ransomware: r.ransomware === true, ...src(r) } : undefined;
    }),
    epss: list(o.epss, MAX_WATCH, (r) => {
      if (!isObj(r)) return undefined;
      const cve = str(r.cve);
      const e = num(r.epss);
      return cve && e !== undefined ? { cve, epss: Math.min(1, Math.max(0, e)), percentile: Math.min(1, Math.max(0, num(r.percentile) ?? 0)), date: str(r.date), ...src(r) } : undefined;
    }),
    eol: list(o.eol, MAX_WATCH, (r) => {
      if (!isObj(r)) return undefined;
      const product = str(r.product);
      const cycle = str(r.cycle);
      return product && cycle ? { product, cycle, eolDate: typeof r.eol === 'string' ? str(r.eol) : undefined, isEol: r.isEol === true, latest: str(r.latest), support: str(r.support), ...src(r) } : undefined;
    }),
    feedItems: list(o.feedItems, MAX_WATCH_ITEMS, (r) => {
      if (!isObj(r)) return undefined;
      const title = str(r.title);
      return title ? { title, link: safeHttpUrl(r.link), published: str(r.published), feed: str(r.feed) ?? 'feed', ...src(r) } : undefined;
    }),
    unavailable: strList(o.unavailable, MAX_NOTES * 2),
    fetchedAt: str(o.fetchedAt),
    nextStep: str(o.nextStep)
  };
}

const MASKED = /^\*{1,12}[0-9]{1,4}$/;

function toCloud(o: Record<string, unknown>): CloudVM {
  const counts = isObj(o.counts) ? o.counts : {};
  const sev = isObj(o.severityCounts) ? o.severityCounts : {};
  const findings = list(o.findings, MAX_FINDINGS, finding);
  return {
    kind: 'cloud',
    account: typeof o.account === 'string' && MASKED.test(o.account) ? o.account : '****',
    regions: strList(o.regions, 6),
    counts: Object.entries(counts).filter(([, v]) => num(v) !== undefined).slice(0, 8).map(([service, v]) => ({ service: service.slice(0, 20), count: count(v) })),
    severityCounts: SEVERITIES.map((severity) => ({ severity, count: count(sev[severity]) })),
    findingsTotal: Math.max(count(o.findingsTotal), findings.length),
    findings,
    moreFindings: count(o.moreFindings),
    notChecked: list(o.notChecked, MAX_WATCH, (r) => {
      if (!isObj(r)) return undefined;
      const service = str(r.service);
      const code = str(r.code);
      return service && code ? { service, region: str(r.region), code, note: str(r.note) } : undefined;
    }),
    limits: strList(o.limits, MAX_NOTES),
    generatedAt: str(o.generatedAt),
    note: str(o.note)
  };
}

function classify(o: Record<string, unknown>): ViewModel | undefined {
  // Unique key sets: these cannot match an assessment (score), plan (stages), apply (scoreBefore), verify or report.
  if (Array.isArray(o.kevHits) && Array.isArray(o.epss) && Array.isArray(o.eol) && Array.isArray(o.feedItems)) return toWatch(o);
  if (o.provider === 'aws' && typeof o.account === 'string' && isObj(o.counts) && Array.isArray(o.findings) && !('score' in o)) return toCloud(o);
  if (typeof o.reportId === 'string' && Array.isArray(o.files) && isObj(o.score) && num(o.score.overall) !== undefined) return toReport(o, o.score);
  if (Array.isArray(o.stages)) {
    return {
      kind: 'plan',
      ...echoOf(o),
      assessmentId: str(o.assessmentId),
      stack: str(o.stack) ?? 'unknown',
      goal: str(o.goal) ?? 'modernize_all',
      scoreBefore: pct(o.scoreBefore),
      scoreAfter: pct(o.scoreAfter),
      stages: list(o.stages, MAX_STAGES, stage),
      hint: str(o.hint)
    };
  }
  if (o.mode === 'measured' && typeof o.verified === 'boolean' && isObj(o.patched)) return toVerify(o);
  const before = pct(o.scoreBefore);
  const after = pct(o.scoreAfter);
  if (before !== undefined && after !== undefined && (o.mode === 'projected' || (isObj(o.stage) && Array.isArray(o.files)))) {
    return toApply(o, before, after);
  }
  if (isObj(o.score) && num(o.score.overall) !== undefined) return toAssessment(o, o.score);
  return undefined;
}

// Look for a known result in the value itself, then inside JSON text, content blocks and the usual wrapper keys.
function search(v: unknown, depth: number): ViewModel | undefined {
  if (depth > MAX_UNWRAP_DEPTH) return undefined;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t.startsWith('{') && !t.startsWith('[')) return undefined;
    try {
      return search(JSON.parse(t), depth + 1);
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(v)) {
    for (const el of v.slice(0, MAX_BLOCKS)) {
      const hit = search(isObj(el) && typeof el.text === 'string' ? el.text : el, depth + 1);
      if (hit) return hit;
    }
    return undefined;
  }
  if (!isObj(v)) return undefined;
  const own = classify(v);
  if (own) return own;
  for (const key of WRAPPER_KEYS) {
    if (v[key] === undefined || v[key] === null) continue;
    const hit = search(v[key], depth + 1);
    if (hit) return hit;
  }
  for (const key of ['content', 'contents'] as const) {
    if (Array.isArray(v[key])) {
      const hit = search(v[key], depth + 1);
      if (hit) return hit;
    }
  }
  return undefined;
}

function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (isObj(v)) return Object.keys(v).length === 0;
  return false;
}

const MAX_KEYS = 20;
const MAX_KEY_LENGTH = 40;

// Top-level key NAMES only, capped. Never values: the result can hold paths, tokens or source text.
export function describeUnrecognised(output: unknown): UnknownVM {
  try {
    const shape: UnknownVM['shape'] = typeof output === 'string' ? 'text' : Array.isArray(output) ? 'array' : isObj(output) ? 'object' : 'other';
    let keys: string[] = [];
    if (isObj(output)) keys = Object.keys(output);
    else if (Array.isArray(output)) keys = [...new Set(output.slice(0, MAX_BLOCKS).flatMap((el) => (isObj(el) ? Object.keys(el) : [])))];
    else if (typeof output === 'string') {
      // JSON text: report the names inside it, never the text.
      try {
        const parsed: unknown = JSON.parse(output);
        if (isObj(parsed)) keys = Object.keys(parsed);
      } catch {
        keys = [];
      }
    }
    return { kind: 'unknown', shape, keys: keys.slice(0, MAX_KEYS).map((k) => (k.length > MAX_KEY_LENGTH ? `${k.slice(0, MAX_KEY_LENGTH - 1)}…` : k)) };
  } catch {
    return { kind: 'unknown', shape: 'other', keys: [] };
  }
}

export const UNRECOGNISED_HEADLINE = 'Received a result the dashboard does not recognise.';

// The text the widget shows for an unclassified result. Key names only, never values.
export function unrecognisedDetail(vm: UnknownVM, renderError?: string): string {
  const keys = vm.keys.length > 0 ? `Top-level keys: ${vm.keys.join(', ')}.` : vm.shape === 'text' ? 'The result was text, not an object.' : vm.shape === 'array' ? 'The result was a list with no named keys.' : 'The result had no named keys.';
  return renderError ? `${keys} Rendering failed with ${renderError}.` : keys;
}

export function toViewModel(output: unknown): ViewModel {
  try {
    if (isBlank(output)) return { kind: 'empty' };
    return search(output, 0) ?? describeUnrecognised(output);
  } catch {
    return describeUnrecognised(output);
  }
}

export function scoreBand(score: number): 'ok' | 'warn' | 'danger' {
  return score >= 80 ? 'ok' : score >= 50 ? 'warn' : 'danger';
}
