// Joins the inventories, hosting hints, OSV check and scoring into one filtered assessment (OWASP MCP10: small outputs).
import { canonicalHash } from '../../common/approval-token.js';
import type { PackageAnalysis, Severity as OsvSeverity } from '../intake/advisory.js';
import { analyzePackagesBulk, packageKey, type BulkOptions, type UncheckedReason } from '../intake/bulk.js';
import type { PackageRef } from '../intake/osv.client.js';
import { EolClient } from '../feeds/eol.js';
import { EpssClient } from '../feeds/epss.js';
import { classifyRule, owaspForCwes } from '../feeds/standards.js';
import { discoverProjects, MAX_DEPTH, MAX_PROJECTS, ownerOf, shown, type ProjectStack } from './discover.js';
import { readKeyFiles, type KeyFiles } from './files.js';
import { detectHosting } from './hosting.js';
import { inventoryNode, nodeFindings, NODE_EOL } from './node-inventory.js';
import { inventoryPhp, phpFindings, PHP_EOL, scanPhpSources } from './php-inventory.js';
import { rankFindings } from './rank.js';
import { scanSecrets, scanWorkflows } from './repo-rules.js';
import { scoreFindings, topFindings, type Score } from './score.js';
import type { DependencyFix, DepRef, Finding, Severity } from './types.js';

export type Analyzer = (packages: PackageRef[]) => Promise<PackageAnalysis[]>;
// EPSS lookup by CVE id (probability 0..1). Optional enrichment: a failure adds nothing.
export type EpssLookup = (cves: string[]) => Promise<Map<string, number>>;
// Live end-of-life check for a release cycle. Answers:
//   { eolDate, latest }  the cycle is past its end of support
//   { supported: true }  endoflife.date answered and the cycle is still supported
//   undefined            no answer (feed down, unknown cycle, or a stub): nothing is claimed about the feed
// fetchedAt / url describe the real answer when the lookup knows them (they are copied to the report's source list).
export type EolAnswer = { eolDate: string; latest: string; fetchedAt?: string; url?: string } | { supported: true; fetchedAt?: string; url?: string };
export type EolLookup = (product: 'php' | 'nodejs', cycle: string) => Promise<EolAnswer | undefined>;

// An outside or built-in source the assessment relied on. `builtIn` sources were never fetched, so they have no time.
export interface AssessmentSource {
  name: string;
  url?: string;
  fetchedAt?: string;
  builtIn?: boolean;
}

export const EOL_LIVE_SOURCE = 'endoflife.date';
export const PHP_EOL_TABLE_SOURCE: AssessmentSource = { name: 'PHP end-of-life table (built-in, offline fallback)', url: 'https://www.php.net/supported-versions.php', builtIn: true };
export const NODE_EOL_TABLE_SOURCE: AssessmentSource = { name: 'Node.js end-of-life table (built-in, offline fallback)', url: 'https://github.com/nodejs/Release/blob/main/schedule.json', builtIn: true };

export interface AssessOptions {
  // Custom vulnerability check (tests, offline runs). It may return analyses for only some of the packages: the rest are
  // reported as not checked. Without it the bulk OSV check runs (src/modules/intake/bulk.ts).
  analyze?: Analyzer;
  today?: Date;
  epss?: EpssLookup;
  eol?: EolLookup;
  budgetMs?: number; // total time for the OSV check (default 60 s); after it the assessment returns what it has
  bulk?: BulkOptions; // test hooks for the bulk check (client, clock, chunk size)
}

const MAX_EPSS_CVES = 50;

export function liveEpss(client: EpssClient = new EpssClient()): EpssLookup {
  return async (cves) => new Map((await client.getScores(cves)).map((s) => [s.cve, s.epss]));
}

export function liveEol(client: EolClient = new EolClient()): EolLookup {
  return async (product, cycle) => {
    const c = await client.tryCheck(product, cycle);
    if (!c) return undefined;
    return c.isEol && typeof c.eol === 'string' ? { eolDate: c.eol, latest: c.latest, fetchedAt: c.fetchedAt, url: c.source } : { supported: true, fetchedAt: c.fetchedAt, url: c.source };
  };
}

function cvesOf(f: { id: string; aliases: string[] }): string[] {
  return [f.id, ...f.aliases].filter((a) => /^CVE-\d{4}-\d{4,}$/.test(a));
}

export interface Assessment {
  assessmentId: string;
  stack: 'node' | 'php' | 'mixed' | 'unknown';
  runtime: { declared?: string; minMajor?: number; source?: string };
  frameworks: string[];
  uiLibraries: string[];
  hosting: string[];
  dependencies: {
    total: number;
    checked: number;
    vulnerable: number;
    urgent: number;
    approximateVersions: boolean;
    // Present only when some dependencies were not checked: counts by kind and the reason, never dropped silently.
    unchecked?: { production: number; dev: number; reason: string };
    // Vulnerable dependencies matched on a version guessed from a range (no lockfile); they count at half weight in the score.
    lowConfidence?: number;
  };
  // Present when the repository was searched for projects (no subfolder given), or the folder has no manifest.
  projects?: Array<{ path: string; stack: ProjectStack | 'unknown'; assessed: boolean }>;
  notes?: string[]; // short plain-language statements about what was and was not assessed
  score: Score;
  topFindings: Finding[];
  findingCount: number;
  truncated: boolean;
}

export interface FullAssessment {
  assessment: Assessment;
  findings: Finding[];
  fixes: DependencyFix[];
  files: Record<string, string>;
  sources?: AssessmentSource[]; // outside or built-in sources the runtime end-of-life check relied on (report appendix)
}

const MAX_CHECKED = 500; // unique package@version per assessment; the rest is reported as not checked
const OSV_TO_FINDING: Record<OsvSeverity, Severity> = { critical: 'critical', high: 'high', medium: 'medium', low: 'low', unknown: 'medium' };

function dockerNodeMajor(dockerfile: string | undefined): number | undefined {
  const m = dockerfile ? /^\s*FROM\s+node:(\d+)/im.exec(dockerfile) : null;
  return m ? Number(m[1]) : undefined;
}

function toRefs(deps: DepRef[], ecosystem: PackageRef['ecosystem']): PackageRef[] {
  return deps.map((d) => ({ name: d.name, ecosystem, version: d.version }));
}

function dependencyFindings(analyses: PackageAnalysis[], approx: Map<string, boolean>, epss: Map<string, number> = new Map()): Finding[] {
  const out: Finding[] = [];
  for (const a of analyses) {
    if (!a.affected || a.findings.length === 0) continue;
    const top = a.findings[0]; // already sorted most severe first
    const urgent = a.findings.some((f) => f.urgent);
    const fixed = top.fixedVersions[0];
    const approximate = approx.get(`${a.package.ecosystem}:${a.package.name}`) === true;
    // Enrichment only ever adds facts we actually have; missing data leaves the fields off.
    const cwe = top.cwes ?? [];
    const owasp = owaspForCwes(cwe);
    const scores = cvesOf(top).map((c) => epss.get(c)).filter((n): n is number => n !== undefined);
    const kev = a.findings.some((f) => f.urgentReasons.includes('known_exploited'));
    out.push({
      id: `dep-vulnerable:${a.package.name}`,
      category: 'dependencies',
      severity: OSV_TO_FINDING[top.severity],
      title: `${a.package.name}@${a.package.version} has ${a.findings.length}${a.truncated ? '+' : ''} known advisories${urgent ? ' (urgent)' : ''}${approximate ? ' (version range, no lockfile)' : ''}`,
      ...(approximate ? { confidence: 'low' as const } : {}),
      evidence: `${top.id}${approximate ? ' (version is approximate: no lockfile)' : ''}`,
      recommendation: fixed ? `Upgrade ${a.package.name} to ${fixed} or later.` : `Check ${top.id} for a fixed release of ${a.package.name}.`,
      ...(cwe.length > 0 ? { cwe } : {}),
      ...(owasp.length > 0 ? { owasp } : {}),
      ...(top.cvss !== undefined ? { cvss: top.cvss } : {}),
      ...(kev ? { kev: true } : {}),
      ...(scores.length > 0 ? { epss: Math.max(...scores) } : {}),
      source: 'osv.dev'
    });
  }
  return out;
}

// Adds CWE / OWASP ids for our own rules where a defensible mapping exists. Never overrides data already on the finding.
function withStandards(f: Finding): Finding {
  if (f.cwe) return f;
  const c = classifyRule(f.id);
  if (c.cwe.length === 0) return f;
  return { ...f, cwe: c.cwe, ...(c.owasp.length > 0 ? { owasp: c.owasp } : {}) };
}

// Which EOL source decided the runtime verdict: the built-in tables when they know the version, otherwise endoflife.date
// when it answered. A source is listed only if it was really used; a live source carries the time it was really fetched.
async function extraEolFindings(nodeMajor: number | undefined, phpMinor: string | undefined, lookup: EolLookup | undefined): Promise<{ findings: Finding[]; sources: AssessmentSource[] }> {
  const out: Finding[] = [];
  const sources: AssessmentSource[] = [];
  if (nodeMajor !== undefined && NODE_EOL[nodeMajor] !== undefined) sources.push(NODE_EOL_TABLE_SOURCE);
  if (phpMinor !== undefined && PHP_EOL[phpMinor] !== undefined) sources.push(PHP_EOL_TABLE_SOURCE);
  if (!lookup) return { findings: out, sources };
  const live = (r: EolAnswer, product: string): AssessmentSource => ({ name: EOL_LIVE_SOURCE, url: r.url ?? `https://endoflife.date/api/${product}.json`, ...(r.fetchedAt ? { fetchedAt: r.fetchedAt } : {}) });
  try {
    if (nodeMajor !== undefined && NODE_EOL[nodeMajor] === undefined) {
      const r = await lookup('nodejs', String(nodeMajor));
      if (r) sources.push(live(r, 'nodejs'));
      if (r && 'eolDate' in r) out.push({ id: 'node-runtime-eol', category: 'runtime', severity: 'high', title: `Node.js ${nodeMajor} is past end of life`, evidence: `Node ${nodeMajor} ended ${r.eolDate} (endoflife.date)`, recommendation: 'Move to the current maintained LTS (Node 22 or 24).', source: 'endoflife.date' });
    }
    if (phpMinor !== undefined && PHP_EOL[phpMinor] === undefined) {
      const r = await lookup('php', phpMinor);
      if (r) sources.push(live(r, 'php'));
      if (r && 'eolDate' in r) out.push({ id: 'php-version-eol', category: 'runtime', severity: 'high', title: `PHP ${phpMinor} no longer receives security fixes`, evidence: `PHP ${phpMinor} ended ${r.eolDate} (endoflife.date)`, recommendation: 'Raise the PHP requirement to a version that still receives security support.', source: 'endoflife.date' });
    }
  } catch {
    // feed trouble never fails an assessment
  }
  return { findings: out, sources };
}

// One finding per rule: repeats collapse into "<first evidence> (+N more)" so the list stays readable and the score
// reflects how many distinct problems exist, not how many lines repeat one problem.
function groupByRule(findings: Finding[]): Finding[] {
  const groups = new Map<string, { first: Finding; count: number }>();
  for (const f of findings) {
    const key = `${f.id}\u0000${f.project ?? ''}`; // the same rule in two projects stays two findings
    const g = groups.get(key);
    if (g) g.count++;
    else groups.set(key, { first: f, count: 1 });
  }
  return [...groups.values()].map(({ first, count }) =>
    count === 1 ? first : { ...first, evidence: `${first.evidence ?? ''} (+${count - 1} more)`.trim() }
  );
}

// Numeric compare by dot/dash segments; missing or non-numeric segments count as 0.
export function cmpVersion(a: string, b: string): number {
  const seg = (v: string) => v.split(/[.-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : 0));
  const pa = seg(a);
  const pb = seg(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function dependencyFixes(analyses: PackageAnalysis[], dev: Map<string, boolean>): DependencyFix[] {
  const out: DependencyFix[] = [];
  for (const a of analyses) {
    if (!a.affected) continue;
    let to: string | undefined;
    for (const f of a.findings) for (const v of f.fixedVersions) if (to === undefined || cmpVersion(v, to) > 0) to = v;
    if (to === undefined) continue;
    const { ecosystem, name, version } = a.package;
    out.push({ ecosystem, name, from: version, to, urgent: a.findings.some((f) => f.urgent), dev: dev.get(`${ecosystem}:${name}`) === true });
  }
  return out.sort((x, y) => Number(y.urgent) - Number(x.urgent) || x.name.localeCompare(y.name));
}


export async function assessDirectory(dir: string, opts: AssessOptions = {}): Promise<Assessment> {
  return (await assessFull(dir, opts)).assessment;
}

// One folder, assessed as one project. Used by every tool when a subfolder is given, and by the planner, patch generator and
// report (their patches are paths relative to this folder).
export async function assessFull(dir: string, opts: AssessOptions = {}): Promise<FullAssessment> {
  return assessTree(dir, opts, false);
}

// The whole repository: finds the projects in it (up to depth 3, see discover.ts), assesses up to MAX_PROJECTS of them and merges
// the findings, each tagged with its project folder. Falls back to the root as one project when no manifest exists anywhere.
export async function assessRepository(dir: string, opts: AssessOptions = {}): Promise<FullAssessment> {
  return assessTree(dir, opts, true);
}

interface Candidate {
  ref: PackageRef;
  dev: boolean;
  approximate: boolean;
  project: string;
}

interface Prepared {
  path: string;
  stack: ProjectStack | 'unknown';
  findings: Finding[];
  candidates: Candidate[];
  frameworks: string[];
  uiLibraries: string[];
  declared?: string;
  minMajor?: number;
  runtimeSource?: string;
  eolSources: AssessmentSource[];
}

const KEY_NAMES = ['package.json', 'package-lock.json', '.nvmrc', '.node-version', 'composer.json', 'composer.lock', 'Dockerfile'];

// Key files that sit directly in the project folder, keyed by plain name (as for a root project).
function contentsOf(kf: KeyFiles, project: string): Record<string, string> {
  const pre = project === '' ? '' : `${project}/`;
  const out: Record<string, string> = {};
  for (const n of KEY_NAMES) if (`${pre}${n}` in kf.contents) out[n] = kf.contents[`${pre}${n}`];
  return out;
}

async function prepareProject(kf: KeyFiles, project: string, owned: { php: KeyFiles['php']; phpPaths: number }, today: Date, eolLookup: EolLookup | undefined): Promise<Prepared> {
  const c = contentsOf(kf, project);
  const hasNode = 'package.json' in c;
  const phpCount = owned.php.length || owned.phpPaths;
  const hasPhp = 'composer.json' in c || phpCount > 0;
  const nodeInv = hasNode
    ? inventoryNode({ packageJson: c['package.json'], packageLock: c['package-lock.json'], nvmrc: c['.nvmrc'], nodeVersionFile: c['.node-version'], dockerNodeMajor: dockerNodeMajor(c['Dockerfile']) })
    : undefined;
  const phpInv = hasPhp ? inventoryPhp({ composerJson: c['composer.json'], composerLock: c['composer.lock'] }, phpCount) : undefined;
  const findings: Finding[] = [];
  if (nodeInv) findings.push(...nodeFindings(nodeInv, today));
  if (phpInv) findings.push(...phpFindings(phpInv, today), ...scanPhpSources(owned.php));
  // Extra EOL signal: only for versions the checked-in tables do not know (they stay the offline source of truth).
  const eol = await extraEolFindings(nodeInv?.minNodeMajor, phpInv?.minPhp, eolLookup);
  findings.push(...eol.findings);
  const candidates: Candidate[] = [];
  for (const d of nodeInv?.deps ?? []) candidates.push({ ref: toRefs([d], 'npm')[0], dev: d.dev, approximate: d.approximate, project });
  for (const d of phpInv?.deps ?? []) candidates.push({ ref: toRefs([d], 'Packagist')[0], dev: d.dev, approximate: d.approximate, project });
  return {
    path: project,
    stack: nodeInv && phpInv ? 'mixed' : nodeInv ? 'node' : phpInv ? 'php' : 'unknown',
    findings,
    candidates,
    frameworks: [...(nodeInv?.frameworks ?? []), ...(phpInv?.framework ? [phpInv.framework] : [])],
    uiLibraries: nodeInv?.uiLibraries ?? [],
    declared: nodeInv?.declaredEngine ?? phpInv?.phpConstraint,
    minMajor: nodeInv?.minNodeMajor,
    runtimeSource: nodeInv?.runtimeSource,
    eolSources: eol.sources
  };
}

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;
type Reason = UncheckedReason | 'cap' | 'no_answer';

function reasonText(r: Reason | undefined, budgetMs: number): string {
  if (r === 'time_budget') return `time budget of ${Math.round(budgetMs / 1000)} s reached`;
  if (r === 'cap') return `limit of ${MAX_CHECKED} packages`;
  if (r === 'incomplete_results') return 'OSV returned partial results';
  if (r === 'no_answer') return 'no answer from the check';
  return 'OSV request failed';
}

async function assessTree(dir: string, opts: AssessOptions, discover: boolean): Promise<FullAssessment> {
  const today = opts.today ?? new Date();
  // Live feeds are the default only when OSV is live too; an injected analyzer means a test or offline run.
  const epssLookup = opts.epss ?? (opts.analyze ? undefined : liveEpss());
  const eolLookup = opts.eol ?? (opts.analyze ? undefined : liveEol());
  const budgetMs = opts.budgetMs ?? opts.bulk?.budgetMs ?? 60000;
  const kf = await readKeyFiles(dir);
  const notes: string[] = [];

  // ---- which projects ----
  let all: Array<{ path: string; stack: ProjectStack | 'unknown' }> = [{ path: '', stack: 'unknown' }];
  let assessedPaths = [''];
  let tagged = false;
  if (discover) {
    const d = discoverProjects(kf.paths);
    if (d.projects.length > 0) {
      all = d.projects;
      assessedPaths = d.projects.slice(0, MAX_PROJECTS).map((p) => p.path);
      tagged = !(assessedPaths.length === 1 && assessedPaths[0] === '');
      const names = (list: string[]) => list.map(shown).join(', ');
      if (!d.rootHasManifest) notes.push(`No package.json or composer.json at the repository root. Assessed ${plural(assessedPaths.length, 'project')} found in subfolders: ${assessedPaths.map((p) => `${shown(p)} (${d.projects.find((x) => x.path === p)?.stack})`).join(', ')}.`);
      else if (assessedPaths.length > 1) notes.push(`Found ${plural(d.projects.length, 'project')}; assessed ${assessedPaths.length}: ${names(assessedPaths)}.`);
      if (d.projects.length > assessedPaths.length) notes.push(`${plural(d.projects.length - assessedPaths.length, 'more project')} not assessed (limit ${MAX_PROJECTS}): ${names(d.projects.slice(MAX_PROJECTS).map((p) => p.path))}. Pass subfolder to assess one.`);
    } else {
      notes.push(`No package.json or composer.json found within ${MAX_DEPTH} folder levels: the root was assessed as plain files, so dependencies were not checked.`);
    }
    if (d.ignored.length > 0) notes.push(`Ignored ${plural(d.ignored.length, 'manifest')} in test, example or hidden folders: ${d.ignored.slice(0, 4).map((i) => i.path).join(', ')}${d.ignored.length > 4 ? ', ...' : ''}. Pass subfolder to assess one.`);
    if (d.tooDeep > 0) notes.push(`${plural(d.tooDeep, 'manifest')} deeper than ${MAX_DEPTH} folder levels not assessed.`);
  } else if (!('package.json' in kf.contents) && !('composer.json' in kf.contents)) {
    notes.push('No package.json or composer.json in this folder: dependencies were not checked.');
  }

  // ---- per project: static findings and the dependencies to check ----
  const prepared: Prepared[] = [];
  const allPaths = all.map((p) => p.path);
  for (const path of assessedPaths) {
    const ownsFile = (p: string) => ownerOf(p, allPaths) === path;
    const php = kf.php.filter((f) => ownsFile(f.path));
    const phpPaths = kf.paths.filter((p) => p.endsWith('.php') && ownsFile(p)).length;
    prepared.push(await prepareProject(kf, path, { php, phpPaths }, today, eolLookup));
  }

  // ---- repository-wide findings (hosting, CI, secrets) are computed once over every file ----
  const todayIso = today.toISOString().slice(0, 10);
  const hosting = detectHosting(kf.paths, kf.contents, { isNodeMajorEol: (major) => (NODE_EOL[major] ?? '9999') < todayIso });
  const textFiles = [...kf.php, ...kf.scan, ...Object.entries(kf.contents).filter(([p]) => !/\.lock$|lock\.json$|(^|\/)\.env/.test(p)).map(([path, content]) => ({ path, content }))];
  const repoFindings: Finding[] = [...hosting.findings, ...scanSecrets(textFiles), ...scanWorkflows(kf.workflows)];

  // ---- known vulnerabilities: one check over every project's direct dependencies, production first ----
  const byKey = new Map<string, Candidate>();
  for (const x of prepared.flatMap((p) => p.candidates)) {
    const k = packageKey(x.ref);
    const prev = byKey.get(k);
    byKey.set(k, prev ? { ...prev, dev: prev.dev && x.dev, approximate: prev.approximate && x.approximate } : x);
  }
  const unique = [...byKey.values()].sort((a, b) => Number(a.dev) - Number(b.dev) || Number(a.approximate) - Number(b.approximate));
  const toCheck = unique.slice(0, MAX_CHECKED);
  const reasons = new Map<string, Reason>();
  for (const x of unique.slice(MAX_CHECKED)) reasons.set(packageKey(x.ref), 'cap');

  const analysisByKey = new Map<string, PackageAnalysis>();
  let osvFailed = false;
  if (toCheck.length > 0) {
    const refs = toCheck.map((x) => x.ref);
    try {
      if (opts.analyze) {
        for (const a of await opts.analyze(refs)) analysisByKey.set(packageKey(a.package), a);
        for (const r of refs) if (!analysisByKey.has(packageKey(r))) reasons.set(packageKey(r), 'no_answer');
      } else {
        const bulk = await analyzePackagesBulk(refs, { ...opts.bulk, budgetMs });
        for (const a of bulk.analyses) analysisByKey.set(packageKey(a.package), a);
        for (const u of bulk.unchecked) reasons.set(packageKey(u.package), u.reason);
        osvFailed = bulk.analyses.length === 0 && bulk.unchecked.length > 0 && bulk.unchecked.every((u) => u.reason === 'osv_error');
      }
    } catch {
      osvFailed = true;
      for (const r of refs) reasons.set(packageKey(r), 'osv_error');
    }
  }
  if (osvFailed) repoFindings.push({ id: 'osv-unavailable', category: 'dependencies', severity: 'info', title: 'Vulnerability data was unavailable', recommendation: 'Run analyze_advisory again later to check the dependencies.' });

  const checked = unique.filter((x) => analysisByKey.has(packageKey(x.ref)));
  const notChecked = unique.filter((x) => !analysisByKey.has(packageKey(x.ref)));
  const notCheckedProd = notChecked.filter((x) => !x.dev).length;
  if (notChecked.length > 0 && !osvFailed) {
    const why = [...new Set(notChecked.map((x) => reasonText(reasons.get(packageKey(x.ref)), budgetMs)))].join('; ');
    notes.push(`Checked ${checked.length} of ${unique.length} dependencies (${why}). Not checked: ${notCheckedProd} production, ${notChecked.length - notCheckedProd} dev.`);
  }

  let epss = new Map<string, number>();
  const analyses = [...analysisByKey.values()];
  if (epssLookup) {
    const cves = [...new Set(analyses.filter((a) => a.affected && a.findings.length > 0).flatMap((a) => cvesOf(a.findings[0])))].slice(0, MAX_EPSS_CVES);
    if (cves.length > 0) {
      try {
        epss = await epssLookup(cves);
      } catch {
        // EPSS down: findings simply carry no epss field
      }
    }
  }

  // ---- merge: per-project findings (tagged) + repository-wide findings ----
  const merged: Finding[] = [];
  for (const p of prepared) {
    const approx = new Map<string, boolean>();
    const mine: PackageAnalysis[] = [];
    for (const x of p.candidates) {
      const a = analysisByKey.get(packageKey(x.ref));
      if (!a) continue;
      approx.set(`${x.ref.ecosystem}:${x.ref.name}`, x.approximate);
      mine.push(a);
    }
    const own = [...p.findings, ...dependencyFindings(mine, approx, epss)].map(withStandards);
    // single-project runs group everything (own + repository-wide) together, exactly as before projects existed
    merged.push(...(tagged ? groupByRule(own.map((f) => ({ ...f, project: shown(p.path) }))) : own));
  }
  merged.push(...(tagged ? groupByRule(repoFindings.map(withStandards)) : repoFindings.map(withStandards)));
  const sorted = rankFindings(tagged ? merged : groupByRule(merged));

  const stacks = prepared.map((p) => p.stack);
  const hasNodeStack = stacks.some((s) => s === 'node' || s === 'mixed');
  const hasPhpStack = stacks.some((s) => s === 'php' || s === 'mixed');
  const stack = hasNodeStack && hasPhpStack ? 'mixed' : hasNodeStack ? 'node' : hasPhpStack ? 'php' : 'unknown';
  const vulnerable = analyses.filter((a) => a.affected).length;
  const urgent = analyses.filter((a) => a.findings.some((f) => f.urgent)).length;
  const lowConfidence = sorted.filter((f) => f.confidence === 'low').length;
  if (lowConfidence > 0) notes.push(`${plural(lowConfidence, 'dependency finding')} rest on a version guessed from a range (no lockfile) and count at half weight in the score.`);
  if (kf.truncated) notes.push('File reading hit a size or depth limit: part of the repository was not read. Pass subfolder to assess a smaller part.');

  const first = prepared[0];
  const devByKey = new Map(checked.map((x) => [`${x.ref.ecosystem}:${x.ref.name}`, x.dev]));
  const assessment: Assessment = {
    assessmentId: canonicalHash({ stack, deps: checked.map((x) => `${x.ref.name}@${x.ref.version}`), findings: sorted.map((f) => f.id), ...(tagged ? { projects: assessedPaths } : {}) }).slice(0, 16),
    stack,
    runtime: { declared: first?.declared, minMajor: first?.minMajor, source: first?.runtimeSource },
    frameworks: [...new Set(prepared.flatMap((p) => p.frameworks))],
    uiLibraries: [...new Set(prepared.flatMap((p) => p.uiLibraries))],
    hosting: hosting.hints,
    dependencies: {
      total: unique.length,
      checked: checked.length,
      vulnerable,
      urgent,
      approximateVersions: checked.some((x) => x.approximate),
      ...(notChecked.length > 0 ? { unchecked: { production: notCheckedProd, dev: notChecked.length - notCheckedProd, reason: [...new Set(notChecked.map((x) => reasons.get(packageKey(x.ref)) ?? 'unknown'))].join(',') } } : {}),
      ...(lowConfidence > 0 ? { lowConfidence } : {})
    },
    // The project list is part of the answer for a repository-wide run, so a missing root manifest is never silent.
    ...(discover ? { projects: all.slice(0, 10).map((p) => ({ path: shown(p.path), stack: p.stack, assessed: assessedPaths.includes(p.path) })) } : {}),
    ...(notes.length > 0 ? { notes } : {}),
    score: scoreFindings(sorted),
    topFindings: topFindings(sorted, 10),
    findingCount: sorted.length,
    truncated: kf.truncated
  };
  return {
    assessment,
    findings: sorted,
    fixes: dependencyFixes(
      checked.map((x) => analysisByKey.get(packageKey(x.ref))!),
      devByKey
    ),
    files: kf.contents,
    sources: [...new Map(prepared.flatMap((p) => p.eolSources).map((s) => [s.name + (s.url ?? ''), s])).values()]
  };
}

// For tools that plan or patch the files of ONE project (plan_modernization, preview_changes, apply_stage, generate_report,
// verify_patch): when no subfolder is given and the root has no manifest but the repository holds projects in subfolders,
// stop with a message that names them, instead of planning against an empty root and showing false comfort.
export async function rootManifestGuard(dir: string): Promise<void> {
  const kf = await readKeyFiles(dir, { maxPhpFiles: 0, maxScanFiles: 0 });
  const d = discoverProjects(kf.paths);
  if (d.rootHasManifest || d.projects.length === 0) return;
  const list = d.projects.slice(0, MAX_PROJECTS).map((p) => `${p.path} (${p.stack})`).join(', ');
  throw new Error(`No package.json or composer.json at the repository root. Projects found in subfolders: ${list}${d.projects.length > MAX_PROJECTS ? ', ...' : ''}. Run this again with subfolder set to one of them.`);
}
