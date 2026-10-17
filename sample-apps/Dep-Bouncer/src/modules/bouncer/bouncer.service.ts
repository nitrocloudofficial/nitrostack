import { Injectable } from '@nitrostack/core';
import { AnalysisService } from '../analysis/analysis.service.js';
import type { AnalysisContext, FileMap, Finding, VersionManifest } from '../analysis/signal.js';
import { finding, formatAge, hoursBetween, REPLAY_NOW } from '../analysis/signals/finding.js';
import { decide, type Verdict } from '../analysis/verdict.js';
import { IncidentsService } from '../incidents/incidents.service.js';
import { assertValidName, NpmRegistryService, type Packument } from '../registry/npm-registry.service.js';
import { OsvService, type AdvisoryLookup } from '../registry/osv.service.js';
import { compare, isPrerelease, parse, satisfies } from '../registry/semver.js';
import { TarballService } from '../registry/tarball.service.js';
import { TtlCache } from '../registry/ttl-cache.js';

const BASELINE_SIZE = 10;
const SAFE_VERSION_ATTEMPTS = 4;

/** What the free, advisory-based tools would say about the same release right now. */
export interface OtherTools {
  osv: string;
  npmAudit: string;
  cooldown: string;
}

export interface Report {
  package: string;
  version: string;
  verdict: Verdict;
  score: number;
  summary: string;
  findings: Finding[];
  notes: string[];
  /** Preserves incomplete coverage even when zero-weight findings become note titles. */
  incomplete?: true;
  otherTools: OtherTools;
  safeVersion?: { version: string; reason: string };
  publishedAt?: string;
  checks: string[];
  /** Present on replays: what is real and what was reconstructed. */
  replay?: {
    incident: string;
    title: string;
    disclaimer: string;
    real: string[];
    reconstructed: string[];
    firstAdvisory: { id: string; lagHours: number };
    sources: { name: string; url: string }[];
  };
}

export interface ScriptReview {
  package: string;
  version: string;
  recommendation: 'APPROVE' | 'REVIEW' | 'DENY' | 'NO_SCRIPTS';
  scripts: Record<string, string>;
  reasons: string[];
  safeVersion?: string;
}

const MAX_SCRIPT_REVIEWS = 15;
const MAX_MANIFEST_DEPS = 60;
const MANIFEST_CONCURRENCY = 4;

export interface ManifestEntry {
  name: string;
  range: string;
  /** The version npm would install for `range` right now. */
  resolved?: string;
  verdict: Verdict | 'SKIPPED';
  score?: number;
  reason: string;
  safeVersion?: string;
}

export interface ManifestReport {
  verdict: Verdict;
  summary: string;
  counts: Record<'BLOCK' | 'REVIEW' | 'ALLOW' | 'SKIPPED', number>;
  truncated: boolean;
  cancelled: boolean;
  results: ManifestEntry[];
}

export class PackageNotFoundError extends Error {}

/**
 * Turns a package name and version into a verdict: fetches the release and its history from
 * the registry, runs every signal, and adds what other tools would say.
 */
@Injectable({ deps: [NpmRegistryService, TarballService, OsvService, AnalysisService, IncidentsService] })
export class BouncerService {
  private readonly files = new TtlCache<FileMap>(10 * 60_000, 12, {
    maxBytes: 192 * 1024 * 1024,
    sizeOf: files => [...files.values()].reduce((bytes, file) => bytes + file.byteLength, 0),
  });

  constructor(
    private readonly registry: NpmRegistryService,
    private readonly tarballs: TarballService,
    private readonly osv: OsvService,
    private readonly analysis: AnalysisService,
    private readonly incidents: IncidentsService,
  ) {}

  /** Vet one release (default: the `latest` dist-tag) before installing it. */
  async checkPackage(name: string, version?: string): Promise<Report> {
    const packument = await this.registry.getPackument(name);
    if (!packument) return this.notFound(name);
    const resolved = isSecurityHolder(packument) ? Object.keys(packument.versions)[0] : this.resolveVersion(packument, version);
    const report = await this.checkRelease(packument, resolved);
    if (report.verdict !== 'ALLOW') {
      report.safeVersion = await this.findSafeVersion(packument, `<${resolved}`, resolved);
    }
    return report;
  }

  /**
   * npm 12 skips dependency install scripts until someone approves them, but its approval list
   * only shows the command. This explains each script and recommends APPROVE / DENY / REVIEW.
   */
  async reviewInstallScripts(packages: { name: string; version?: string }[]): Promise<{
    summary: string;
    packages: ScriptReview[];
  }> {
    const reviews: ScriptReview[] = [];
    for (const p of packages.slice(0, MAX_SCRIPT_REVIEWS)) {
      try {
        reviews.push(await this.reviewOne(p.name.trim(), p.version?.trim()));
      } catch (err) {
        reviews.push({
          package: p.name,
          version: p.version ?? '?',
          recommendation: 'REVIEW',
          scripts: {},
          reasons: [`could not be checked: ${err instanceof Error ? err.message : String(err)}`],
        });
      }
    }
    const count = (r: ScriptReview['recommendation']) => reviews.filter((x) => x.recommendation === r).length;
    return {
      summary: `${count('APPROVE')} approve, ${count('REVIEW')} review, ${count('DENY')} deny, ${count('NO_SCRIPTS')} without install scripts`,
      packages: reviews,
    };
  }

  /**
   * Checks every dependency of a package.json at the version npm would actually install for
   * its range today (the newest match): `^1.14.0` during the axios window resolved to 1.14.1.
   */
  async checkManifest(
    packageJson: string,
    includeDev: boolean,
    progress: (message: string) => void = () => {},
    cancelled: () => boolean = () => false,
  ): Promise<ManifestReport> {
    let manifest: Record<string, unknown>;
    try {
      manifest = JSON.parse(packageJson) as Record<string, unknown>;
    } catch {
      throw new Error('packageJson is not valid JSON');
    }
    if (!isPlainObject(manifest)) throw new Error('packageJson must be a JSON object');
    const sections = [...(includeDev ? ['devDependencies'] : []), 'dependencies', 'optionalDependencies'];
    const deps = new Map<string, string>();
    for (const section of sections) {
      const entries = manifest[section];
      if (isPlainObject(entries)) {
        for (const [name, range] of Object.entries(entries as Record<string, unknown>)) {
          if (typeof range === 'string') deps.set(name, range);
        }
      }
    }
    const all = [...deps.entries()];
    const todo = all.slice(0, MAX_MANIFEST_DEPS);
    const results: ManifestEntry[] = new Array(todo.length);
    let done = 0;
    let next = 0;
    let wasCancelled = false;
    progress(`Checking ${todo.length} dependencies${all.length > todo.length ? ` (first ${todo.length} of ${all.length})` : ''}...`);

    const worker = async () => {
      while (next < todo.length) {
        if (cancelled()) { wasCancelled = true; return; }
        const i = next++;
        const [name, range] = todo[i];
        results[i] = await this.checkDependency(name, range);
        done++;
        const r = results[i];
        progress(`[${done}/${todo.length}] ${name}${r.resolved ? `@${r.resolved}` : ''}: ${r.verdict}`);
      }
    };
    await Promise.all(Array.from({ length: MANIFEST_CONCURRENCY }, worker));

    const finished = results.filter(Boolean);
    const rank = { BLOCK: 0, REVIEW: 1, SKIPPED: 2, ALLOW: 3 } as const;
    finished.sort((a, b) => rank[a.verdict] - rank[b.verdict] || a.name.localeCompare(b.name));
    const count = (v: ManifestEntry['verdict']) => finished.filter((r) => r.verdict === v).length;
    const counts = { BLOCK: count('BLOCK'), REVIEW: count('REVIEW'), ALLOW: count('ALLOW'), SKIPPED: count('SKIPPED') };
    const truncated = all.length > todo.length;
    wasCancelled = wasCancelled || cancelled();
    return {
      verdict: counts.BLOCK ? 'BLOCK' : counts.REVIEW || truncated || wasCancelled ? 'REVIEW' : 'ALLOW',
      summary: `${finished.length} dependencies checked: ${counts.BLOCK} BLOCK, ${counts.REVIEW} REVIEW, ${counts.ALLOW} ALLOW, ${counts.SKIPPED} skipped${truncated ? '; dependency cap reached' : ''}${wasCancelled ? '; check cancelled' : ''}`,
      counts,
      truncated,
      cancelled: wasCancelled,
      results: finished,
    };
  }

  private async checkDependency(name: string, range: string): Promise<ManifestEntry> {
    let registryName = name;
    let registryRange = range.trim();
    if (registryRange.startsWith('npm:')) {
      const alias = /^npm:((?:@[^/\s]+\/)?[^@/\s]+)(?:@(.+))?$/.exec(registryRange);
      if (!alias) return { name, range, verdict: 'REVIEW', reason: 'invalid npm alias' };
      registryName = alias[1];
      registryRange = alias[2] ?? '*';
    } else if (/^(?:file:|link:|workspace:|git\+|git:|git@|github:|gitlab:|bitbucket:|ssh:|https?:)/.test(registryRange) || registryRange.includes('/')) {
      return { name, range, verdict: 'SKIPPED', reason: 'not a plain npm registry range' };
    }
    try {
      assertValidName(name);
      assertValidName(registryName);
      const packument = await this.registry.getPackument(registryName);
      if (!packument) {
        return { name, range, verdict: 'BLOCK', score: 70, reason: `${registryName} does not exist on npm` };
      }
      if (isSecurityHolder(packument)) {
        return { name, range, verdict: 'BLOCK', score: 70, reason: `npm replaced ${registryName} with a security placeholder: it was malware` };
      }
      const resolved = this.candidates(packument, registryRange)[0];
      if (!resolved) {
        return { name, range, verdict: 'REVIEW', reason: `no published version matches ${range}` };
      }
      const report = await this.checkPackage(registryName, resolved);
      return {
        name,
        range,
        resolved,
        verdict: report.verdict,
        score: report.score,
        reason: `${registryName !== name ? `alias for ${registryName}@${resolved}: ` : ''}${report.findings[0]?.title ?? (report.incomplete ? report.notes[0] : undefined) ?? 'no risk signals'}`,
        safeVersion: report.safeVersion?.version,
      };
    } catch (err) {
      return { name, range, verdict: 'REVIEW', reason: `could not be checked: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  private async reviewOne(name: string, version?: string): Promise<ScriptReview> {
    const report = await this.checkPackage(name, version);
    const packument = await this.registry.getPackument(name);
    const manifest = packument ? own(packument.versions, report.version) : undefined;
    const scripts: Record<string, string> = {};
    for (const hook of ['preinstall', 'install', 'postinstall'] as const) {
      const s = manifest?.scripts?.[hook];
      if (s) scripts[hook] = s;
    }
    const base = { package: name, version: report.version, scripts };
    let implicitNative = false;
    let nativeError: string | undefined;
    if (manifest && !manifest.scripts?.install && !manifest.scripts?.preinstall) {
      try {
        implicitNative = (await this.loadFiles(packument!, report.version)).has('binding.gyp');
        if (implicitNative) scripts.install = 'node-gyp rebuild';
      } catch (err) {
        nativeError = `could not check for implicit native install: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    const nativeNote = 'root binding.gyp triggers npm\'s implicit node-gyp rebuild install script';
    if (report.verdict === 'BLOCK') {
      return {
        ...base,
        recommendation: 'DENY',
        reasons: [...report.findings.slice(0, 3).map((f) => f.title), ...(implicitNative ? [nativeNote] : []), ...(nativeError ? [nativeError] : [])],
        safeVersion: report.safeVersion?.version,
      };
    }
    if (nativeError) return { ...base, recommendation: 'REVIEW', reasons: [nativeError] };
    if (Object.keys(scripts).length === 0) {
      if (report.verdict === 'REVIEW') {
        return { ...base, recommendation: 'REVIEW', reasons: [...report.findings.map(f => f.title), ...report.notes].slice(0, 3) };
      }
      return { ...base, recommendation: 'NO_SCRIPTS', reasons: ['this release runs nothing at install time'] };
    }
    const scriptFindings = report.findings.filter((f) => f.signal === 'install-script' || f.signal === 'code-diff');
    if (report.verdict === 'REVIEW' || scriptFindings.length) {
      return {
        ...base,
        recommendation: 'REVIEW',
        reasons: [...(implicitNative ? [nativeNote] : []),
          ...(scriptFindings.length ? scriptFindings : report.findings).slice(0, 3).map((f) => f.title),
          ...(report.incomplete ? report.notes : [])].slice(0, 4),
      };
    }
    // Same script as the releases before it, from the same kind of publisher, no new code risk.
    const previous = this.baselineFor(packument!, report.version).slice(0, 3);
    if (implicitNative) {
      try {
        const prior = previous[0];
        const stable = report.findings.length === 0 && prior && !prior.scripts?.install && !prior.scripts?.preinstall
          && (await this.loadFiles(packument!, prior.version)).has('binding.gyp')
          && Object.entries(scripts).filter(([hook]) => hook !== 'install').every(([hook, cmd]) => prior.scripts?.[hook] === cmd);
        return { ...base, recommendation: stable ? 'APPROVE' : 'REVIEW', reasons: [
          nativeNote,
          stable ? `the previous release ${prior.version} also contains binding.gyp; no risk signals` : 'the native build is new or has no verified baseline; check what it runs',
        ] };
      } catch (err) {
        return { ...base, recommendation: 'REVIEW', reasons: [`implicit node-gyp rebuild; previous release could not be checked: ${err instanceof Error ? err.message : String(err)}`] };
      }
    }
    const stable = previous.length > 0 && previous.every((m) =>
      Object.entries(scripts).every(([hook, cmd]) => m.scripts?.[hook] === cmd),
    );
    return {
      ...base,
      recommendation: stable ? 'APPROVE' : 'REVIEW',
      reasons: stable
        ? [`the same install script shipped in ${previous.map((m) => m.version).join(', ')}`, 'no risk signals in this release']
        : ['the install script is new or changed recently; check what it runs'],
    };
  }

  private baselineFor(packument: Packument, version: string): VersionManifest[] {
    return this.baseline(packument, version);
  }

  /** Vet a version bump: the target is judged against the history up to it. */
  async checkUpgrade(name: string, from: string, to: string): Promise<Report & { change: string[] }> {
    const report = await this.checkPackage(name, to);
    const packument = await this.registry.getPackument(name);
    const a = packument ? own(packument.versions, from) : undefined;
    const b = packument ? own(packument.versions, to) : undefined;
    const change: string[] = [];
    if (!a) change.push(`${from} is not on the registry`);
    if (a && b) change.push(...describeChange(a, b));
    const timeFrom = packument ? own(packument.time, from) : undefined;
    const timeTo = packument ? own(packument.time, to) : undefined;
    if (timeFrom && timeTo) {
      change.push(`${to} was published ${formatAge(Math.abs(hoursBetween(timeFrom, timeTo)))} after ${from}`);
    }
    return { ...report, change };
  }

  /** The newest version in `range` that passes every check. */
  async safeVersion(name: string, range = '*'): Promise<{
    package: string;
    range: string;
    safeVersion?: string;
    verdict?: Verdict;
    skipped: { version: string; verdict: Verdict; reason: string }[];
    note?: string;
  }> {
    const packument = await this.registry.getPackument(name);
    if (!packument) throw new PackageNotFoundError(`${name} does not exist on npm`);
    const skipped: { version: string; verdict: Verdict; reason: string }[] = [];
    const candidates = this.candidates(packument, range);
    for (const v of candidates.slice(0, SAFE_VERSION_ATTEMPTS)) {
      const r = await this.checkRelease(packument, v);
      if (isSafe(r)) {
        return { package: name, range, safeVersion: v, verdict: r.verdict, skipped };
      }
      skipped.push({ version: v, verdict: r.verdict, reason: r.findings[0]?.title ?? r.notes[0] ?? r.verdict });
    }
    return {
      package: name,
      range,
      skipped,
      note: candidates.length
        ? `No version passed among the newest ${Math.min(candidates.length, SAFE_VERSION_ATTEMPTS)} in range; ask a human.`
        : `No published version matches ${range}.`,
    };
  }

  /** Replays a real hijack on its labelled reconstruction. */
  async replay(id: string): Promise<Report> {
    const incident = this.incidents.get(id);
    const ctx = this.incidents.toContext(id);
    const result = await this.analysis.analyze(ctx);
    const verdict = decide([...result.findings, ...result.notes]);
    const advisories: AdvisoryLookup = { available: true, advisories: [] };
    const report = this.report(
      incident.packageName,
      incident.targetVersion,
      own(ctx.time, incident.targetVersion),
      verdict,
      result.checks,
      advisories,
      true,
    );
    report.otherTools.osv = `No advisory yet: OSV's first entry (${incident.osvFirstAdvisory.id}) arrived ${incident.osvFirstAdvisory.lagHours} h after publication`;
    report.otherTools.npmAudit = 'found 0 vulnerabilities (npm audit only knows published advisories)';
    report.safeVersion = { version: incident.safeVersion, reason: 'last release before the hijack' };
    report.replay = {
      incident: incident.id,
      title: incident.title,
      disclaimer:
        'Replay on a labelled reconstruction: the malicious version was removed from npm. Last-good release data is real; the bad release is rebuilt from public reports with benign stand-in code.',
      real: incident.real,
      reconstructed: incident.reconstructed,
      firstAdvisory: incident.osvFirstAdvisory,
      sources: incident.sources,
    };
    return report;
  }

  listIncidents() {
    return this.incidents.list();
  }

  /** One non-recursive check for every release, including fallback candidates. */
  private async checkRelease(packument: Packument, version: string): Promise<Report> {
    if (isSecurityHolder(packument)) return this.securityHolder(packument);
    const manifest = own(packument.versions, version);
    if (!manifest) return this.removed(packument, version, await this.osv.query(packument.name, version));
    const ctx = await this.liveContext(packument, manifest);
    const [result, advisories] = await Promise.all([
      this.analysis.analyze(ctx),
      this.osv.query(packument.name, version),
    ]);
    const findings = [...result.findings, ...result.notes];
    const malware = advisories.advisories.filter(a => a.malicious);
    if (malware.length) findings.push(finding('known-advisory', 'critical',
      `Listed as malware in OSV (${malware[0].id})`, malware.map(a => `${a.id}: ${a.summary ?? ''}`)));
    if (!advisories.available) findings.push({ ...finding('known-advisory', 'warn', 'check incomplete: OSV unavailable', [advisories.error ?? 'OSV could not be reached']), incomplete: true });
    const verdict = decide(findings);
    return this.report(packument.name, version, own(packument.time, version), verdict, result.checks, advisories, false);
  }

  private async liveContext(packument: Packument, target: VersionManifest): Promise<AnalysisContext> {
    return {
      weeklyDownloads: await this.registry.getWeeklyDownloads(packument.name),
      name: packument.name,
      target,
      baseline: this.baseline(packument, target.version),
      time: packument.time,
      loadFiles: (version) => this.loadFiles(packument, version),
      lookupPackage: async (dep, range) => {
        const info = await this.registry.lookupPackage(dep, range);
        if (!info?.resolved) return info;
        const advisories = await this.osv.query(dep, info.resolved.version);
        return { ...info, knownMalicious: advisories.advisories.some(a => a.malicious) };
      },
    };
  }

  /**
   * Previous releases, newest first: same major line first (so a 0.x maintenance release is
   * compared with 0.x, not with 1.x), then the rest; prereleases only for prerelease targets.
   */
  private baseline(packument: Packument, version: string): VersionManifest[] {
    const published = Date.parse(own(packument.time, version) ?? '');
    const pre = isPrerelease(version);
    const major = parse(version)?.major;
    const earlier = Object.keys(packument.versions)
      .filter((v) => parse(v) && v !== version && (pre || !isPrerelease(v)))
      .filter((v) => {
        const t = Date.parse(own(packument.time, v) ?? '');
        return Number.isNaN(published) ? compare(v, version) < 0 : t < published;
      })
      .sort((a, b) => Date.parse(own(packument.time, b) ?? '') - Date.parse(own(packument.time, a) ?? ''));
    const same = earlier.filter((v) => parse(v)?.major === major);
    const ordered = same.length >= 3 ? same : [...same, ...earlier.filter((v) => !same.includes(v))];
    return ordered.slice(0, BASELINE_SIZE).map((v) => own(packument.versions, v)!);
  }

  private loadFiles(packument: Packument, version: string): Promise<FileMap> {
    const manifest = own(packument.versions, version);
    if (!manifest?.dist?.tarball) return Promise.reject(new Error(`no tarball for ${version}`));
    return this.files.get(`${packument.name}@${version}`, () =>
      this.tarballs.fetchFiles(manifest.dist.tarball),
    );
  }

  private resolveVersion(packument: Packument, version?: string): string {
    const v = (version ?? 'latest').trim();
    const tag = own(packument['dist-tags'], v);
    if (typeof tag === 'string' && parse(tag) && (own(packument.versions, tag) || own(packument.time, tag))) return tag;
    if (parse(v) && (own(packument.versions, v) || own(packument.time, v))) return v;
    const matching = this.candidates(packument, v);
    if (matching.length) return matching[0];
    throw new PackageNotFoundError(`${packument.name} has no version matching "${v}"`);
  }

  /** Versions in `range`, newest first, stable only unless the range names a prerelease. */
  private candidates(packument: Packument, range: string): string[] {
    range = range.trim();
    if (Object.hasOwn(packument['dist-tags'], range)) {
      const tagged = own(packument['dist-tags'], range);
      return typeof tagged === 'string' && parse(tagged) && own(packument.versions, tagged) ? [tagged] : [];
    }
    return Object.keys(packument.versions)
      .filter((v) => satisfies(v, range))
      .sort((a, b) => compare(b, a));
  }

  private async findSafeVersion(packument: Packument, range: string, rejected: string) {
    const latest = own(packument['dist-tags'], 'latest');
    const pool = this.candidates(packument, range).filter((v) => v !== rejected);
    if (typeof latest === 'string' && parse(latest) && own(packument.versions, latest)
      && latest !== rejected && compare(latest, rejected) > 0) pool.unshift(latest);
    for (const v of pool.slice(0, 3)) {
      try {
        const r = await this.checkRelease(packument, v);
        if (isSafe(r)) {
          return {
            version: v,
            reason: compare(v, rejected) > 0
              ? 'current latest release, which passes every check'
              : 'newest earlier release that passes every check',
          };
        }
      } catch {
        // Try the next one.
      }
    }
    return undefined;
  }

  private report(
    name: string,
    version: string,
    publishedAt: string | undefined,
    verdict: ReturnType<typeof decide>,
    checks: string[],
    advisories: AdvisoryLookup,
    replay: boolean,
  ): Report {
    const now = replay ? REPLAY_NOW(publishedAt) : new Date().toISOString();
    const age = publishedAt ? hoursBetween(publishedAt, now) : undefined;
    const vulns = advisories.advisories.filter((a) => !a.malicious).length;
    return {
      package: name,
      version,
      verdict: verdict.verdict,
      score: verdict.score,
      summary: summarize(name, version, verdict.verdict, verdict.findings),
      findings: verdict.findings,
      notes: verdict.notes.map((n) => n.title),
      ...([...verdict.findings, ...verdict.notes].some(f => f.incomplete) ? { incomplete: true as const } : {}),
      otherTools: {
        osv: !advisories.available
          ? 'OSV unreachable right now'
          : advisories.advisories.length
            ? [...advisories.advisories]
                .sort((x, y) => Number(y.malicious) - Number(x.malicious))
                .map((a) => (a.malicious ? `${a.id} (malware)` : a.id))
                .slice(0, 5)
                .join(', ')
            : 'no advisory',
        npmAudit: advisories.available
          ? `would report ${vulns} vulnerabilit${vulns === 1 ? 'y' : 'ies'}`
          : 'unknown (OSV unreachable)',
        cooldown:
          age === undefined
            ? 'publish time unknown'
            : age < 24
              ? `published ${formatAge(age)} ago: a 24 h cooldown (pnpm 11 default) would hold it, and every urgent fix too`
              : `published ${formatAge(age)} ago: older than a 24 h cooldown`,
      },
      publishedAt,
      checks,
    };
  }

  private securityHolder(packument: Packument): Report {
    const latest = own(packument['dist-tags'], 'latest') ?? Object.keys(packument.versions)[0];
    const f = finding('existence', 'critical', `npm took ${packument.name} down as malware and replaced it with a security placeholder`, [
      `latest is ${latest}; every real version was removed`,
      'remove it from package.json and any lockfile, and rotate credentials on machines that installed it',
    ]);
    return this.report(packument.name, latest, undefined, decide([f]), ['existence'], { available: true, advisories: [] }, false);
  }

  private notFound(name: string): Report {
    const f = finding('existence', 'critical', `${name} does not exist on npm`, [
      'AI agents sometimes invent package names; attackers register them ("slopsquatting")',
    ]);
    const v = decide([f]);
    return this.report(name, '-', undefined, v, ['existence'], { available: true, advisories: [] }, false);
  }

  private removed(packument: Packument, version: string, advisories: AdvisoryLookup): Report {
    const f = finding('existence', 'critical', `${packument.name}@${version} was published and then removed from npm`, [
      `published ${own(packument.time, version)}`,
      'npm removes versions that turn out to be malware; never install it from a mirror or cache',
      ...advisories.advisories.filter((a) => a.malicious).map((a) => `${a.id}: ${a.summary ?? 'malicious package'}`),
    ]);
    const v = decide([f]);
    const report = this.report(packument.name, version, own(packument.time, version), v, ['existence'], advisories, false);
    report.safeVersion = undefined;
    return report;
  }
}

function own<T>(record: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function isSafe(report: Report): boolean {
  return report.verdict === 'ALLOW' && !report.incomplete && !report.findings.some(f => f.incomplete);
}

function summarize(name: string, version: string, verdict: Verdict, findings: Finding[]): string {
  const top = findings.slice(0, 3).map((f) => f.title);
  if (verdict === 'ALLOW') {
    return `${name}@${version} looks consistent with its own history. ${top.length ? `Minor notes: ${top.join('; ')}.` : 'No risk signals.'}`;
  }
  const action = verdict === 'BLOCK' ? 'Do not install it.' : 'Ask a human before installing it.';
  return `${verdict}: ${name}@${version}. ${top.join('; ')}. ${action}`;
}

function describeChange(a: VersionManifest, b: VersionManifest): string[] {
  const out: string[] = [];
  const depsA = { ...a.dependencies, ...a.optionalDependencies };
  const depsB = { ...b.dependencies, ...b.optionalDependencies };
  const added = Object.keys(depsB).filter((d) => !(d in depsA));
  const removed = Object.keys(depsA).filter((d) => !(d in depsB));
  if (added.length) out.push(`dependencies added: ${added.join(', ')}`);
  if (removed.length) out.push(`dependencies removed: ${removed.join(', ')}`);
  for (const hook of ['preinstall', 'install', 'postinstall']) {
    if (a.scripts?.[hook] !== b.scripts?.[hook]) {
      out.push(`${hook}: ${a.scripts?.[hook] ?? '(none)'} -> ${b.scripts?.[hook] ?? '(none)'}`);
    }
  }
  if (a._npmUser?.name !== b._npmUser?.name) {
    out.push(`publisher: ${a._npmUser?.name ?? '?'} -> ${b._npmUser?.name ?? '?'}`);
  }
  if (Boolean(a.dist.attestations) !== Boolean(b.dist.attestations)) {
    out.push(`provenance: ${a.dist.attestations ? 'yes' : 'no'} -> ${b.dist.attestations ? 'yes' : 'no'}`);
  }
  if (!out.length) out.push('no manifest-level changes (publisher, provenance, scripts, dependencies)');
  return out;
}

/** npm's placeholder for a package it removed as malware, e.g. plain-crypto-js@0.0.1-security.0. */
function isSecurityHolder(packument: Packument): boolean {
  const versions = Object.keys(packument.versions);
  return versions.length > 0 && versions.every((v) => /-security(\.\d+)?$/.test(v));
}
