// Turns raw OSV records into small, filtered findings (OWASP MCP10). Summaries are untrusted data.
import { OsvClient, assertPackageList, type OsvVuln, type PackageRef } from './osv.client.js';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'unknown';
export type UrgentReason = 'high_severity' | 'known_exploited' | 'malicious_package';

export interface AdvisoryFinding {
  id: string;
  aliases: string[];
  severity: Severity;
  summary: string;
  fixedVersions: string[];
  urgent: boolean;
  urgentReasons: UrgentReason[];
  cvss?: number; // CVSS v3 base score when OSV carries a vector or number
  cwes?: string[]; // from GHSA database_specific.cwe_ids, when present
}

export interface PackageAnalysis {
  package: PackageRef;
  affected: boolean;
  findings: AdvisoryFinding[];
  truncated: boolean;
}

export interface AdvisoryDeps {
  client?: OsvClient;
  kevFetch?: () => Promise<Set<string>>;
}

const MAX_FINDINGS = 10;
const MAX_FIXED = 5;
const MAX_SUMMARY = 160;
const MAX_ALIASES = 10;
const MAX_CHANGED_LOOKUPS = 50;
const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };

// A KEV failure means "not known exploited"; it never throws.
export async function fetchKev(fetchFn: typeof fetch = fetch, timeoutMs = 10000): Promise<Set<string>> {
  try {
    const res = await fetchFn(KEV_URL, { redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return new Set();
    const data = (await res.json()) as { vulnerabilities?: Array<{ cveID?: unknown }> };
    const ids = (data.vulnerabilities ?? []).map((v) => v.cveID).filter((v): v is string => typeof v === 'string');
    return new Set(ids);
  } catch {
    return new Set();
  }
}

async function safeKev(deps: AdvisoryDeps): Promise<Set<string>> {
  try {
    return await (deps.kevFetch ?? fetchKev)();
  } catch {
    return new Set();
  }
}

export function cleanText(s: unknown, max = MAX_SUMMARY): string {
  if (typeof s !== 'string') return '';
  // control characters, zero-width characters and bidi overrides/isolates (text that reads differently from how it is stored)
  // eslint-disable-next-line no-control-regex
  const flat = s.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]+/g, ' ').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 3)}...` : flat;
}

function bandScore(score: number): Severity {
  if (score >= 9) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  if (score > 0) return 'low';
  return 'unknown';
}

const W: Record<string, Record<string, number>> = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  AC: { L: 0.77, H: 0.44 },
  UI: { N: 0.85, R: 0.62 },
  C: { H: 0.56, L: 0.22, N: 0 },
  I: { H: 0.56, L: 0.22, N: 0 },
  A: { H: 0.56, L: 0.22, N: 0 }
};

function roundUp(x: number): number {
  const i = Math.round(x * 100000);
  return i % 10000 === 0 ? i / 100000 : (Math.floor(i / 10000) + 1) / 10;
}

// CVSS v3 base score from a vector string; undefined for anything else.
function cvss3Score(vector: string): number | undefined {
  if (!/^CVSS:3\.[01]\//.test(vector)) return undefined;
  const m = new Map(vector.split('/').slice(1).map((kv) => kv.split(':') as [string, string]));
  const scope = m.get('S');
  if (scope !== 'C' && scope !== 'U') return undefined;
  const changed = scope === 'C';
  const pr = ({ N: 0.85, L: changed ? 0.68 : 0.62, H: changed ? 0.5 : 0.27 } as Record<string, number>)[m.get('PR') ?? ''];
  const parts = ['AV', 'AC', 'UI', 'C', 'I', 'A'].map((k) => W[k][m.get(k) ?? '']);
  if (pr === undefined || parts.some((v) => v === undefined)) return undefined;
  const [av, ac, ui, c, i, a] = parts;
  const iss = 1 - (1 - c) * (1 - i) * (1 - a);
  const impact = changed ? 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15 : 6.42 * iss;
  if (impact <= 0) return 0;
  const expl = 8.22 * av * ac * pr * ui;
  return roundUp(Math.min(changed ? 1.08 * (impact + expl) : impact + expl, 10));
}

// Highest numeric CVSS v3 score OSV gives for this record (vector or plain number).
export function cvssScoreOf(v: OsvVuln): number | undefined {
  let best: number | undefined;
  for (const s of Array.isArray(v.severity) ? v.severity : []) {
    if (typeof s?.score !== 'string') continue;
    const n = /^\d+(\.\d+)?$/.test(s.score) ? Number(s.score) : cvss3Score(s.score);
    if (n !== undefined && n > 0 && n <= 10 && (best === undefined || n > best)) best = n;
  }
  return best;
}

function cweIdsOf(v: OsvVuln): string[] {
  const raw = v.database_specific?.cwe_ids;
  return (Array.isArray(raw) ? raw : [])
    .filter((c): c is string => typeof c === 'string' && /^CWE-\d{1,5}$/.test(c))
    .slice(0, 5);
}

export function mapSeverity(v: OsvVuln): Severity {
  const label = typeof v.database_specific?.severity === 'string' ? v.database_specific.severity.toUpperCase() : '';
  if (label === 'CRITICAL') return 'critical';
  if (label === 'HIGH') return 'high';
  if (label === 'MODERATE' || label === 'MEDIUM') return 'medium';
  if (label === 'LOW') return 'low';
  for (const s of Array.isArray(v.severity) ? v.severity : []) {
    if (typeof s?.score !== 'string') continue;
    const n = /^\d+(\.\d+)?$/.test(s.score) ? Number(s.score) : cvss3Score(s.score);
    if (n !== undefined && n > 0) return bandScore(n);
  }
  return 'unknown';
}

export function fixedVersionsFor(v: OsvVuln, p: PackageRef): string[] {
  const out = new Set<string>();
  for (const a of Array.isArray(v.affected) ? v.affected : []) {
    const pkg = a?.package;
    if (!pkg || pkg.ecosystem !== p.ecosystem || typeof pkg.name !== 'string') continue;
    if (pkg.name.toLowerCase() !== p.name.toLowerCase()) continue;
    for (const r of Array.isArray(a.ranges) ? a.ranges : []) {
      for (const e of Array.isArray(r?.events) ? r.events : []) {
        if (typeof e?.fixed === 'string') {
          const f = cleanText(e.fixed, 64);
          if (f) out.add(f);
        }
      }
    }
  }
  return [...out].slice(0, MAX_FIXED);
}

export function toFinding(v: OsvVuln, p: PackageRef, kev: Set<string>): AdvisoryFinding {
  const severity = mapSeverity(v);
  const cvss = cvssScoreOf(v);
  const cwes = cweIdsOf(v);
  const aliases = (Array.isArray(v.aliases) ? v.aliases : [])
    .filter((a): a is string => typeof a === 'string')
    .map((a) => cleanText(a, 40))
    .slice(0, MAX_ALIASES);
  const reasons: UrgentReason[] = [];
  if (severity === 'high' || severity === 'critical') reasons.push('high_severity');
  if ([v.id, ...aliases].some((a) => kev.has(a))) reasons.push('known_exploited');
  if (v.id.startsWith('MAL-')) reasons.push('malicious_package');
  return {
    id: cleanText(v.id, 40),
    aliases,
    severity,
    summary: cleanText(v.summary),
    fixedVersions: fixedVersionsFor(v, p),
    urgent: reasons.length > 0,
    urgentReasons: reasons,
    ...(cvss !== undefined ? { cvss } : {}),
    ...(cwes.length > 0 ? { cwes } : {})
  };
}

function bySeverity(a: AdvisoryFinding, b: AdvisoryFinding): number {
  return RANK[b.severity] - RANK[a.severity] || Number(b.urgent) - Number(a.urgent) || a.id.localeCompare(b.id);
}

function isNonEmpty(x: unknown): x is string {
  return typeof x === 'string' && x.length > 0;
}

// Raw OSV records for one package -> the small analysis the rest of the server uses.
export function analysisFor(p: PackageRef, records: OsvVuln[], kev: Set<string>): PackageAnalysis {
  const all = records.filter((v) => v && isNonEmpty(v.id)).map((v) => toFinding(v, p, kev)).sort(bySeverity);
  return {
    package: { name: p.name, ecosystem: p.ecosystem, version: p.version },
    affected: all.length > 0,
    findings: all.slice(0, MAX_FINDINGS),
    truncated: all.length > MAX_FINDINGS
  };
}

export async function loadKev(deps: AdvisoryDeps): Promise<Set<string>> {
  return safeKev(deps);
}

export async function analyzePackages(packages: PackageRef[], deps: AdvisoryDeps = {}): Promise<PackageAnalysis[]> {
  assertPackageList(packages);
  const client = deps.client ?? new OsvClient();
  const kev = await safeKev(deps);
  const out: PackageAnalysis[] = [];
  for (const p of packages) out.push(analysisFor(p, await client.queryPackage(p), kev));
  return out;
}

// The cursor is the newest `modified` timestamp handled; the client stores it and sends it back.
export async function changedSince(
  packages: PackageRef[],
  sinceIso: string | undefined,
  deps: AdvisoryDeps = {}
): Promise<{ changed: AdvisoryFinding[]; nextCursor: string }> {
  assertPackageList(packages);
  let since = 0;
  if (sinceIso !== undefined) {
    since = Date.parse(sinceIso);
    if (sinceIso.length > 40 || Number.isNaN(since)) throw new RangeError('Invalid cursor: expected an ISO 8601 timestamp.');
  }
  const client = deps.client ?? new OsvClient();
  const batch = await client.queryBatch(packages);

  const seen = new Map<string, { t: number; pkg: PackageRef }>();
  batch.forEach((vulns, i) => {
    for (const v of vulns) {
      const t = Date.parse(v.modified);
      if (Number.isNaN(t) || !isNonEmpty(v.id) || t <= since || seen.has(v.id)) continue;
      seen.set(v.id, { t, pkg: packages[i] });
    }
  });

  // Oldest first, so a capped run can resume from the cursor without skipping anything.
  const picked = [...seen].sort((a, b) => a[1].t - b[1].t).slice(0, MAX_CHANGED_LOOKUPS);
  if (picked.length === 0) return { changed: [], nextCursor: sinceIso ?? new Date().toISOString() };

  const kev = await safeKev(deps);
  const changed: AdvisoryFinding[] = [];
  for (const [id, { pkg }] of picked) {
    const full = await client.getVuln(id);
    if (full) changed.push(toFinding(full, pkg, kev));
  }
  const last = picked[picked.length - 1][1].t;
  return { changed: changed.sort(bySeverity), nextCursor: new Date(last).toISOString() };
}
