// WS8: collapses findings that several tools reported about the same thing into one canonical finding.
//
//  - Advisory findings (a package plus a CVE, GHSA or vendor id) collapse when they name a compatible package and share an
//    advisory id. Aliases are followed, so trivy's CVE and a composer advisory listing both the CVE and a GHSA end up together
//    (union-find over shared ids).
//  - Code findings collapse by path, line window and rule class: the same tool only merges identical rule and line (a real
//    duplicate); different tools merge when their lines are within LINE_WINDOW and they share a CWE or the same rule name.
//
// The canonical finding keeps the strongest severity, the union of CWE/OWASP, the maximum CVSS, every reporting tool in
// `sources` and the raw reports in `reports`. When tools disagreed on severity, `severityBySource` says who said what.
// Nothing is dropped silently: the result states {before, after, collapsed}.
import { SEVERITY_RANK, type Finding, type Severity } from '../assessment/types.js';
import { MAX_REPORTS, ruleLeaf, upgradeText, type MeasuredFinding } from './normalize.js';

export const LINE_WINDOW = 3;
export const STATIC_SOURCE = 'osv.dev';

export interface DedupeCounts {
  before: number;
  after: number;
  collapsed: number;
}

export interface DedupeResult {
  findings: MeasuredFinding[];
  counts: DedupeCounts;
  /** Raw findings per reporting tool, before deduplication. */
  reportedByTool: Record<string, number>;
  /** Findings that only one tool reported, by tool (after deduplication). */
  uniqueByTool: Record<string, number>;
  /** Present when the static assessment's findings were passed in. */
  staticCheck?: { packagesInBoth: string[]; advisoriesConfirmed: number };
}

class Sets {
  private parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]];
      i = this.parent[i];
    }
    return i;
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[Math.max(ra, rb)] = Math.min(ra, rb);
  }
}

const pkgKey = (f: MeasuredFinding): string | undefined => f.package?.toLowerCase();
// A finding without a package may join one that has a package when they share an id; two different packages never merge.
const packagesCompatible = (a: MeasuredFinding, b: MeasuredFinding): boolean => !pkgKey(a) || !pkgKey(b) || pkgKey(a) === pkgKey(b);

function linkAdvisories(list: MeasuredFinding[], sets: Sets): void {
  const byId = new Map<string, number[]>();
  list.forEach((f, i) => {
    if (f.kind !== 'advisory') return;
    // advisories without an id (abandoned-package) are keyed by rule, and only merge within one package
    const keys = f.aliases.length > 0 ? f.aliases : pkgKey(f) ? [`rule:${f.ruleId}`] : [];
    for (const k of keys) {
      for (const j of byId.get(k) ?? []) if (packagesCompatible(f, list[j])) sets.union(i, j);
      byId.set(k, [...(byId.get(k) ?? []), i]);
    }
  });
}

function sameClass(a: MeasuredFinding, b: MeasuredFinding): boolean {
  if (a.tool === b.tool) return a.ruleId === b.ruleId && a.line === b.line;
  const lineOk = a.line === undefined || b.line === undefined ? a.line === b.line : Math.abs(a.line - b.line) <= LINE_WINDOW;
  if (!lineOk) return false;
  const sharedCwe = (a.cwe ?? []).some((c) => (b.cwe ?? []).includes(c));
  return sharedCwe || ruleLeaf(a.ruleId) === ruleLeaf(b.ruleId);
}

function linkCode(list: MeasuredFinding[], sets: Sets): void {
  const byPath = new Map<string, number[]>();
  list.forEach((f, i) => {
    if (f.kind !== 'code') return;
    const k = f.path ?? '';
    byPath.set(k, [...(byPath.get(k) ?? []), i]);
  });
  for (const idxs of byPath.values()) {
    for (let x = 0; x < idxs.length; x++) for (let y = x + 1; y < idxs.length; y++) if (sameClass(list[idxs[x]], list[idxs[y]])) sets.union(idxs[x], idxs[y]);
  }
}

const TOOL_PREFERENCE = ['composer-audit', 'npm-audit', 'trivy', 'semgrep', 'gitleaks', 'checkov', 'hadolint', 'phpstan', 'eslint', 'tsc', 'rector'];
const toolOrder = (t: string): number => {
  const i = TOOL_PREFERENCE.indexOf(t);
  return i < 0 ? TOOL_PREFERENCE.length : i;
};

// The tool whose wording is kept: its own title (not one built here), then the strongest severity, then a fixed tool order.
function pickCanonical(group: MeasuredFinding[]): MeasuredFinding {
  return [...group].sort(
    (a, b) => Number(a.genericTitle === true) - Number(b.genericTitle === true) || SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || toolOrder(a.tool) - toolOrder(b.tool)
  )[0];
}

const uniq = <T>(xs: T[]): T[] => [...new Set(xs)];

function merge(group: MeasuredFinding[]): MeasuredFinding {
  if (group.length === 1) return group[0];
  const canon = pickCanonical(group);
  const strongest = group.reduce<Severity>((s, f) => (SEVERITY_RANK[f.severity] > SEVERITY_RANK[s] ? f.severity : s), 'info');
  const bySource: Record<string, Severity> = {};
  for (const f of group) {
    for (const r of f.reports) {
      const prev = bySource[r.tool];
      if (!prev || SEVERITY_RANK[r.severity] > SEVERITY_RANK[prev]) bySource[r.tool] = r.severity;
    }
  }
  const disagree = new Set(Object.values(bySource)).size > 1;
  const cwe = uniq(group.flatMap((f) => f.cwe ?? [])).sort();
  const owasp = uniq(group.flatMap((f) => f.owasp ?? [])).sort();
  const cvss = group.map((f) => f.cvss).filter((n): n is number => typeof n === 'number');
  const epss = group.map((f) => f.epss).filter((n): n is number => typeof n === 'number');
  const withLine = group.find((f) => f.line !== undefined && f.path !== undefined);
  const firstVal = <K extends keyof MeasuredFinding>(k: K): MeasuredFinding[K] | undefined => group.map((f) => f[k]).find((v) => v !== undefined && v !== '');
  const sources = uniq(group.flatMap((f) => f.sources)).sort();
  const sourceText = uniq(group.flatMap((f) => (f.source ?? '').split(', ').filter(Boolean)))
    .sort()
    .join(', ');
  const fixed = firstVal('fixedVersion');
  const pkg = canon.package ?? (firstVal('package') as string | undefined);
  const out: MeasuredFinding = {
    ...canon,
    severity: strongest,
    sources,
    source: sourceText || canon.source,
    aliases: uniq(group.flatMap((f) => f.aliases)).sort(),
    reports: group.flatMap((f) => f.reports).slice(0, MAX_REPORTS),
    ...(cwe.length ? { cwe } : {}),
    ...(owasp.length ? { owasp } : {}),
    ...(cvss.length ? { cvss: Math.max(...cvss) } : {}),
    ...(epss.length ? { epss: Math.max(...epss) } : {}),
    ...(group.some((f) => f.kev === true) ? { kev: true } : {}),
    ...(pkg ? { package: pkg } : {}),
    ...(fixed ? { fixedVersion: fixed as string } : {}),
    ...(disagree ? { severityBySource: bySource } : {})
  };
  if (withLine && out.line === undefined) {
    out.path = withLine.path;
    out.line = withLine.line;
    out.evidence = withLine.evidence;
  } else if (!out.evidence) {
    const e = firstVal('evidence');
    if (e) out.evidence = e as string;
  }
  if (out.kind === 'advisory' && out.aliases.length > 0) out.id = `runner-advisory:${out.aliases.find((a) => a.startsWith('CVE-')) ?? out.aliases[0]}`;
  if (out.kind === 'advisory' && fixed && out.fixedVersion) out.recommendation = upgradeText(out.package, out.fixedVersion);
  // a canonical finding whose title was built here takes a tool's own title when another group member has one
  if (out.genericTitle) {
    const own = group.find((f) => !f.genericTitle);
    if (own) {
      out.title = own.title;
      delete out.genericTitle;
    }
  }
  return out;
}

export interface DedupeOptions {
  /** Findings of the static assessment (assess_project). Used to mark advisories OSV also reported; they are never added to the result. */
  staticFindings?: Finding[];
}

export function dedupeFindings(input: MeasuredFinding[], opts: DedupeOptions = {}): DedupeResult {
  const sets = new Sets(input.length);
  linkAdvisories(input, sets);
  linkCode(input, sets);
  const groups = new Map<number, MeasuredFinding[]>();
  input.forEach((f, i) => {
    const r = sets.find(i);
    groups.set(r, [...(groups.get(r) ?? []), f]);
  });
  let findings = [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => merge(g));

  let staticCheck: DedupeResult['staticCheck'];
  if (opts.staticFindings) {
    const byPkg = new Map<string, Finding>();
    for (const s of opts.staticFindings) if (s.id.startsWith('dep-vulnerable:')) byPkg.set(s.id.slice('dep-vulnerable:'.length).toLowerCase(), s);
    const both = new Set<string>();
    let confirmed = 0;
    findings = findings.map((f) => {
      const s = f.kind === 'advisory' && f.package ? byPkg.get(f.package.toLowerCase()) : undefined;
      if (!s) return f;
      both.add(f.package as string);
      // the static finding names one advisory (its top one) in `evidence`; only that exact id is a confirmation
      const topId = (s.evidence ?? '').trim().split(/\s+/)[0]?.toUpperCase();
      const hit = !!topId && f.aliases.some((a) => a.toUpperCase() === topId);
      if (!hit) return f;
      confirmed++;
      return { ...f, sources: uniq([...f.sources, STATIC_SOURCE]).sort(), source: uniq([...(f.source ?? '').split(', ').filter(Boolean), STATIC_SOURCE]).sort().join(', ') };
    });
    staticCheck = { packagesInBoth: [...both].sort(), advisoriesConfirmed: confirmed };
  }

  const reportedByTool: Record<string, number> = {};
  for (const f of input) reportedByTool[f.tool] = (reportedByTool[f.tool] ?? 0) + 1;
  const uniqueByTool: Record<string, number> = {};
  for (const f of findings) {
    const tools = f.sources.filter((s) => s !== STATIC_SOURCE);
    if (tools.length === 1) uniqueByTool[tools[0]] = (uniqueByTool[tools[0]] ?? 0) + 1;
  }
  return {
    findings,
    counts: { before: input.length, after: findings.length, collapsed: input.length - findings.length },
    reportedByTool,
    uniqueByTool,
    ...(staticCheck ? { staticCheck } : {})
  };
}
