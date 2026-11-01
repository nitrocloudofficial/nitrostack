// WS8: maps every finding in a runner result.json onto the shared Finding shape (assessment/types.ts), keeping the tool
// that reported it as `source` ("trivy 0.76.1") and `sources`. Pure, offline, no network.
//
// Honest-claims rules:
//  - Nothing is invented. Severity, CWE, OWASP and CVSS come from the tool's own output; OWASP is also derived from a CWE
//    only through the table copied from owasp.org in feeds/standards.ts. KEV and EPSS are never set here (the runner tools
//    do not carry them); see enrichMeasured in measured.ts.
//  - Text from the repository or from a scanner is data: control characters are stripped, lengths are capped, and nothing
//    here interprets it.
//  - Categories reuse the existing union. Runner tool families map as: dependencies (trivy vulnerabilities, composer-audit,
//    npm-audit) -> 'dependencies'; security (semgrep, gitleaks) -> 'security'; infrastructure and CI (checkov, hadolint,
//    trivy misconfiguration) -> 'cloud'; code quality (phpstan, eslint, tsc, rector) -> 'standards'.
import { SEVERITY_RANK, type Category, type Finding, type Severity } from '../assessment/types.js';
import { normalizeCwe, owaspForCwes } from '../feeds/standards.js';
import type { RunnerResult } from '../verify/result.js';

export type ResultFinding = RunnerResult['findings'][number];

export const MAX_NORMALISED = 5000; // hard cap for direct callers; a runner result carries at most 500 findings
export const MAX_TITLE = 200;

const DEP_TOOLS = new Set(['composer-audit', 'npm-audit']);

export const TOOL_CATEGORY: Record<string, Category> = {
  trivy: 'dependencies', // refined per finding: misconfiguration results are 'cloud'
  'composer-audit': 'dependencies',
  'npm-audit': 'dependencies',
  semgrep: 'security',
  gitleaks: 'security',
  checkov: 'cloud',
  hadolint: 'cloud',
  phpstan: 'standards',
  eslint: 'standards',
  tsc: 'standards',
  rector: 'standards'
};

// A report one tool made about one place or one advisory. Kept on the canonical finding so nothing is silently dropped.
export interface RawReport {
  tool: string;
  ruleId: string;
  severity: Severity;
  path?: string;
  line?: number;
}

export interface MeasuredFinding extends Finding {
  sources: string[]; // every tool that reported it (sorted); also contains 'osv.dev' when the static assessment confirmed it
  kind: 'advisory' | 'code';
  tool: string; // the tool whose wording and ruleId the canonical finding uses
  ruleId: string;
  path?: string;
  line?: number;
  package?: string;
  installedVersion?: string;
  fixedVersion?: string;
  affectedVersions?: string;
  aliases: string[]; // CVE, GHSA and vendor advisory ids, normalised
  severityBySource?: Record<string, Severity>; // present only when the tools disagreed
  reports: RawReport[]; // the raw reports behind this finding (at most MAX_REPORTS)
  genericTitle?: boolean; // title was built here, so a tool's own wording is preferred when merging
}

export const MAX_REPORTS = 10;

// eslint-disable-next-line no-control-regex
const CONTROL = new RegExp('[\\u0000-\\u001F\\u007F-\\u009F\\u2028\\u2029\\u202A-\\u202E\\u2066-\\u2069\\u200E\\u200F\\uFEFF]', 'g');

export function clean(v: unknown, max: number): string {
  if (v === undefined || v === null) return '';
  const s = (typeof v === 'string' ? v : String(v)).replace(CONTROL, ' ').replace(/ {2,}/g, ' ').trim();
  return s.length > max ? s.slice(0, max) : s;
}

const ADVISORY_RE = /^(?:CVE-\d{4}-\d{4,}|GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}|PKSA-[0-9a-z-]+|OSV-\d{4}-\d+|GO-\d{4}-\d+|RUSTSEC-\d{4}-\d+|PYSEC-\d{4}-\d+)$/i;

/** Canonical spelling of an advisory id: CVE and vendor ids upper case, GHSA with lower case groups. Undefined when it is not one. */
export function normalizeAdvisoryId(raw: unknown): string | undefined {
  const s = clean(raw, 64);
  if (!ADVISORY_RE.test(s)) return undefined;
  const prefix = s.slice(0, s.indexOf('-')).toUpperCase();
  const rest = s.slice(s.indexOf('-') + 1);
  return `${prefix}-${prefix === 'GHSA' || prefix === 'PKSA' ? rest.toLowerCase() : rest.toUpperCase()}`; // GHSA and PKSA ids are lower case after the prefix
}

const asSeverity = (s: unknown): Severity => (typeof s === 'string' && s in SEVERITY_RANK ? (s as Severity) : 'medium');

/** Tool and rule class helper for the dedupe step: lower case last dotted segment without punctuation. */
export function ruleLeaf(ruleId: string): string {
  const last = ruleId.split('.').pop() ?? ruleId;
  return last.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Offline Semgrep rules are named by the path they were loaded from ("opt.metamorph.rules.<id>"); drop that prefix.
const cleanRuleId = (id: string): string => id.replace(/^opt\.metamorph\.rules\./, '');

const NPM_NAME = /^(?:@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/i;

// Older results carry no `package`; the tools' own title formats name it ("Package: x" for trivy, "x: ..." for the audits).
function packageOf(f: ResultFinding, ruleId: string): string | undefined {
  if (f.package) return clean(f.package, 214) || undefined;
  if (f.tool === 'trivy') {
    const m = f.title.match(/^Package:\s*(\S+)/);
    if (m && normalizeAdvisoryId(ruleId)) return clean(m[1], 214);
  }
  if (DEP_TOOLS.has(f.tool)) {
    const head = f.title.split(': ')[0];
    const isNameLike = f.tool === 'composer-audit' ? /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(head) : NPM_NAME.test(head);
    if (isNameLike && head !== f.title) return head;
    const ab = f.title.match(/^(\S+) is abandoned$/);
    if (ab) return ab[1];
  }
  return undefined;
}

function categoryOf(tool: string, isAdvisory: boolean, hasPackage: boolean): Category {
  if (tool === 'trivy') return isAdvisory || hasPackage ? 'dependencies' : 'cloud';
  return TOOL_CATEGORY[tool] ?? 'standards';
}

/** One sentence. A single fixed version reads "X or later"; a list (trivy lists one per supported branch) is quoted, not interpreted. */
export function upgradeText(pkg: string | undefined, fixed: string): string {
  const name = pkg ?? 'the package';
  return /[,|]/.test(fixed) ? `Upgrade ${name} to a fixed release (listed by the scanner: ${fixed.slice(0, 120)}).` : `Upgrade ${name} to ${fixed} or later.`;
}

function recommendationOf(f: { tool: string; kind: 'advisory' | 'code'; ruleId: string; pkg?: string; fixed?: string; path?: string; line?: number; category: Category }): string {
  if (f.kind === 'advisory') {
    if (f.ruleId === 'abandoned-package') return `Replace ${f.pkg ?? 'the package'} with a maintained alternative.`;
    if (f.pkg && f.fixed) return upgradeText(f.pkg, f.fixed);
    return `Check ${f.ruleId} for a fixed release${f.pkg ? ` of ${f.pkg}` : ''} and upgrade.`;
  }
  if (f.tool === 'gitleaks') return 'Treat the credential as exposed: rotate it, remove it from the repository and its history.';
  if (f.category === 'security') return `Review the flagged code against rule ${f.ruleId} and apply the rule's recommended fix.`;
  if (f.category === 'cloud') return `Fix the configuration flagged by ${f.ruleId}.`;
  return `Address the ${f.tool} report ${f.ruleId}; this is a code-quality finding.`;
}

/** Normalises one runner finding. `versions` maps tool name to the version the runner recorded. */
export function normalizeFinding(f: ResultFinding, versions: Record<string, string> = {}): MeasuredFinding {
  const tool = clean(f.tool, 64) || 'unknown';
  const ruleId = cleanRuleId(clean(f.ruleId, 200)) || 'unknown';
  const severity = asSeverity(f.severity);
  const version = versions[tool];
  const source = version && version !== 'n/a' && version !== 'unknown' ? `${tool} ${clean(version, 40)}` : tool;

  const pkg = packageOf({ ...f, tool }, ruleId);
  const aliases = [...new Set([normalizeAdvisoryId(ruleId), ...(f.aliases ?? []).map(normalizeAdvisoryId)].filter((x): x is string => !!x))];
  const advisoryTool = DEP_TOOLS.has(tool) || tool === 'trivy';
  const abandoned = ruleId === 'abandoned-package' && !!pkg;
  const kind: 'advisory' | 'code' = abandoned || (aliases.length > 0 && (advisoryTool || !!pkg)) ? 'advisory' : 'code';
  const category = categoryOf(tool, kind === 'advisory', !!pkg);

  const cwe = [...new Set((f.cwe ?? []).map(normalizeCwe).filter((x): x is string => !!x))];
  const toolOwasp = (f.owasp ?? []).map((o) => clean(o, 20)).filter((o) => /^A(?:0[1-9]|10):2021$/.test(o));
  const owasp = [...new Set([...toolOwasp, ...owaspForCwes(cwe)])].sort();

  const path = f.path ? clean(f.path, 500) || undefined : undefined;
  const line = typeof f.line === 'number' && Number.isInteger(f.line) && f.line >= 1 ? f.line : undefined;
  const evidence = path ? (line !== undefined ? `${path}:${line}` : path) : undefined; // path:line only, never a message

  const primary = aliases.find((a) => a.startsWith('CVE-')) ?? aliases[0];
  const toolTitle = clean(f.title, MAX_TITLE);
  const generic = kind === 'advisory' && (!toolTitle || /^Package:/i.test(toolTitle));
  const installed = f.installedVersion ? clean(f.installedVersion, 100) : undefined;
  const title = generic ? clean(`${pkg}${installed ? `@${installed}` : ''}: ${primary ?? ruleId}`, MAX_TITLE) : toolTitle || ruleId;

  const fixed = f.fixedVersion ? clean(f.fixedVersion, 100) || undefined : undefined;
  const base = {
    id: kind === 'advisory' ? (primary ? `runner-advisory:${primary}` : `runner-advisory:${ruleId}:${pkg ?? ''}`.slice(0, 200)) : `runner-code:${tool}:${ruleId}`.slice(0, 200),
    category,
    severity,
    title,
    ...(evidence ? { evidence } : {}),
    recommendation: recommendationOf({ tool, kind, ruleId, pkg, fixed, path, line, category }),
    ...(cwe.length > 0 ? { cwe } : {}),
    ...(owasp.length > 0 ? { owasp } : {}),
    ...(typeof f.cvss === 'number' && Number.isFinite(f.cvss) && f.cvss >= 0 && f.cvss <= 10 ? { cvss: f.cvss } : {}),
    source,
    sources: [tool]
  };
  return {
    ...base,
    kind,
    tool,
    ruleId,
    ...(path ? { path } : {}),
    ...(line !== undefined ? { line } : {}),
    ...(pkg ? { package: pkg } : {}),
    ...(installed ? { installedVersion: installed } : {}),
    ...(fixed ? { fixedVersion: fixed } : {}),
    ...(f.affectedVersions ? { affectedVersions: clean(f.affectedVersions, 200) } : {}),
    aliases,
    reports: [{ tool, ruleId, severity, ...(path ? { path } : {}), ...(line !== undefined ? { line } : {}) }],
    ...(generic ? { genericTitle: true } : {})
  };
}

export interface NormalizeOutcome {
  findings: MeasuredFinding[];
  /** Findings beyond MAX_NORMALISED that were not processed (counted, never silent). */
  notProcessed: number;
}

export function versionsOf(result: Pick<RunnerResult, 'checks'>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of result.checks) if (c.version && c.version !== 'n/a') out[c.tool] = c.version;
  return out;
}

/** Normalises all findings of a runner result (the listed ones: the runner itself caps the list at 500). */
export function normalizeResult(result: Pick<RunnerResult, 'checks' | 'findings'>): NormalizeOutcome {
  const versions = versionsOf(result);
  const list = result.findings.slice(0, MAX_NORMALISED);
  return { findings: list.map((f) => normalizeFinding(f, versions)), notProcessed: Math.max(0, result.findings.length - list.length) };
}
