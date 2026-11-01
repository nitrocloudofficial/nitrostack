// Monorepo discovery, the no-lockfile score discount and partial OSV checks, through the real assessment with offline feeds.
import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { assessFull, assessRepository, rootManifestGuard, type Analyzer } from '../../src/modules/assessment/assess.js';
import { discoverProjects } from '../../src/modules/assessment/discover.js';
import { rankReason } from '../../src/modules/assessment/rank.js';
import { scoreFindings } from '../../src/modules/assessment/score.js';
import type { Finding } from '../../src/modules/assessment/types.js';
import type { PackageAnalysis } from '../../src/modules/intake/advisory.js';
import type { OsvClient, PackageRef } from '../../src/modules/intake/osv.client.js';

const TODAY = new Date('2026-10-30T00:00:00Z');
type Files = Record<string, string>;
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});
async function materialize(files: Files): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'metamorph-ws-'));
  dirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, rel)), { recursive: true });
    await writeFile(join(dir, rel), content);
  }
  return dir;
}

const pkgJson = (deps: Record<string, string> = {}, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ name: 'app', type: 'module', engines: { node: '>=22' }, scripts: { test: 'vitest run' }, dependencies: deps, ...extra });
const lockOf = (entries: Record<string, string>) => JSON.stringify({ lockfileVersion: 3, packages: Object.fromEntries(Object.entries(entries).map(([n, v]) => [`node_modules/${n}`, { version: v }])) });
const CI = { '.github/workflows/ci.yml': 'name: CI\non: [push]\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n' };
const DOCKER = { Dockerfile: 'FROM node:22-alpine\nUSER node\n' };

// Every package is affected by one high advisory fixed in 9.9.9.
const allVulnerable: Analyzer = async (pkgs) =>
  pkgs.map((p): PackageAnalysis => ({ package: p, affected: true, truncated: false, findings: [{ id: 'GHSA-fake-0000-0001', aliases: [], severity: 'high', summary: 's', fixedVersions: ['9.9.9'], urgent: true, urgentReasons: ['high_severity'] }] }));
const noneVulnerable: Analyzer = async (pkgs) => pkgs.map((p): PackageAnalysis => ({ package: p, affected: false, truncated: false, findings: [] }));

describe('discoverProjects', () => {
  it('finds manifests up to depth 3, root first, with the stack of each', () => {
    const d = discoverProjects(['package.json', 'apps/api/package.json', 'apps/web/package.json', 'apps/web/composer.json', 'services/billing/composer.json', 'a/b/c/d/package.json', 'README.md']);
    expect(d.projects).toEqual([
      { path: '', stack: 'node' },
      { path: 'apps/api', stack: 'node' },
      { path: 'apps/web', stack: 'mixed' },
      { path: 'services/billing', stack: 'php' }
    ]);
    expect(d.rootHasManifest).toBe(true);
    expect(d.tooDeep).toBe(1);
  });

  it('does not treat test, example, demo or hidden folders as projects, and says what it ignored', () => {
    const d = discoverProjects(['package.json', 'tests/sample-app/package.json', 'examples/basic/package.json', 'demo/composer.json', '.devcontainer/package.json', 'packages/core/package.json']);
    expect(d.projects.map((p) => p.path)).toEqual(['', 'packages/core']);
    expect(d.ignored.map((i) => i.path)).toEqual(['.devcontainer', 'demo', 'examples/basic', 'tests/sample-app']);
  });
});

describe('assessRepository: monorepo and nested manifests', () => {
  const monorepo: Files = {
    'apps/api/package.json': pkgJson({ express: '^4.21.0' }),
    'apps/api/package-lock.json': lockOf({ express: '4.21.0' }),
    'apps/web/package.json': pkgJson({ react: '^18.0.0' }),
    'services/billing/composer.json': JSON.stringify({ name: 'a/b', require: { php: '^8.4', 'monolog/monolog': '^3.0' } }),
    'services/billing/src/legacy.php': '<?php\n$r = mysql_query($sql);\n',
    ...CI,
    ...DOCKER
  };

  it('with no manifest at the root, says so and assesses every subfolder project, tagging each finding', async () => {
    const full = await assessRepository(await materialize(monorepo), { analyze: noneVulnerable, today: TODAY });
    const a = full.assessment;
    expect(a.notes?.[0]).toMatch(/No package\.json or composer\.json at the repository root/);
    expect(a.projects).toEqual([
      { path: 'apps/api', stack: 'node', assessed: true },
      { path: 'apps/web', stack: 'node', assessed: true },
      { path: 'services/billing', stack: 'php', assessed: true }
    ]);
    expect(a.stack).toBe('mixed');
    const mysql = full.findings.find((f) => f.id === 'php-mysql-removed-api');
    expect(mysql?.project).toBe('services/billing');
    expect(mysql?.evidence).toBe('services/billing/src/legacy.php:2');
    // the same rule in two projects stays two findings
    const noLock = full.findings.filter((f) => f.id === 'node-no-lockfile');
    expect(noLock.map((f) => f.project)).toEqual(['apps/web']);
    // repository-wide findings carry no project
    expect(full.findings.every((f) => f.id !== 'no-ci')).toBe(true);
  });

  it('keeps the same rule from two projects as two findings, each with its own project path', async () => {
    const files: Files = { ...monorepo, 'apps/web/package.json': pkgJson({ react: '^18.0.0' }, { scripts: {} }), 'apps/api/package.json': pkgJson({ express: '^4.21.0' }, { scripts: {} }) };
    const full = await assessRepository(await materialize(files), { analyze: noneVulnerable, today: TODAY });
    expect(full.findings.filter((f) => f.id === 'node-no-tests').map((f) => f.project).sort()).toEqual(['apps/api', 'apps/web']);
  });

  it('assesses the root plus nested projects and does not count nested PHP files against the root', async () => {
    const files: Files = { 'package.json': pkgJson({ express: '^4.21.0' }), 'package-lock.json': lockOf({ express: '4.21.0' }), 'tools/php-lint/composer.json': JSON.stringify({ name: 'a/b', require: { php: '^8.4' } }), 'tools/php-lint/a.php': '<?php\n$r = mysql_query($sql);\n', ...CI, ...DOCKER };
    const full = await assessRepository(await materialize(files), { analyze: noneVulnerable, today: TODAY });
    expect(full.assessment.projects?.map((p) => p.path)).toEqual(['.', 'tools/php-lint']);
    expect(full.assessment.notes?.[0]).toMatch(/assessed 2: \., tools\/php-lint/);
    const mysql = full.findings.filter((f) => f.id === 'php-mysql-removed-api');
    expect(mysql).toHaveLength(1);
    expect(mysql[0].project).toBe('tools/php-lint');
    expect(full.findings.some((f) => f.id === 'composer-missing')).toBe(false);
  });

  it('caps at 5 projects, assesses those and states how many were left', async () => {
    const files: Files = { ...CI, ...DOCKER };
    for (let i = 1; i <= 8; i++) files[`pkg${i}/package.json`] = pkgJson({});
    const full = await assessRepository(await materialize(files), { analyze: noneVulnerable, today: TODAY });
    const a = full.assessment;
    expect(a.projects).toHaveLength(8);
    expect(a.projects?.filter((p) => p.assessed)).toHaveLength(5);
    expect(a.notes?.join(' ')).toMatch(/3 more projects not assessed \(limit 5\): pkg6, pkg7, pkg8/);
  });

  it('does not assess fixture or test folders as the project', async () => {
    const files: Files = {
      'package.json': pkgJson({ express: '^4.21.0' }),
      'package-lock.json': lockOf({ express: '4.21.0' }),
      'tests/fixtures/legacy/composer.json': JSON.stringify({ require: { php: '>=5.3' } }),
      'tests/fixtures/legacy/index.php': '<?php\nmysql_query($x);\n',
      'tests/fixtures/legacy/.env': 'A=1\n',
      'tests/sample/package.json': pkgJson({ request: '^2.0.0' }),
      ...CI,
      ...DOCKER
    };
    const full = await assessRepository(await materialize(files), { analyze: noneVulnerable, today: TODAY });
    expect(full.assessment.stack).toBe('node');
    expect(full.findings.filter((f) => /php|composer|env-file/.test(f.id))).toEqual([]);
    expect(full.assessment.notes?.join(' ')).toMatch(/Ignored 1 manifest in test, example or hidden folders: tests\/sample/);
    expect(full.assessment.projects).toEqual([{ path: '.', stack: 'node', assessed: true }]);
  });

  it('with no manifest anywhere, assesses the root as plain files and says dependencies were not checked', async () => {
    const full = await assessRepository(await materialize({ 'index.php': '<?php echo 1;', ...CI, ...DOCKER }), { analyze: noneVulnerable, today: TODAY });
    expect(full.assessment.notes?.[0]).toMatch(/No package\.json or composer\.json found within 3 folder levels/);
    expect(full.findings.some((f) => f.id === 'composer-missing')).toBe(true);
  });

  it('assessFull (a given subfolder or a single project) behaves as before: no project tags, same root-only scope', async () => {
    const nodeOnly = Object.fromEntries(Object.entries(monorepo).filter(([k]) => !k.startsWith('services/')));
    const dir = await materialize({ ...nodeOnly, 'package.json': pkgJson({ express: '^4.21.0' }), 'package-lock.json': lockOf({ express: '4.21.0' }) });
    const full = await assessFull(dir, { analyze: noneVulnerable, today: TODAY });
    expect(full.assessment.projects).toBeUndefined();
    expect(full.findings.every((f) => f.project === undefined)).toBe(true);
    expect(full.assessment.stack).toBe('node');
  });

  it('assessFull on a folder without a manifest says so', async () => {
    const full = await assessFull(await materialize({ 'readme.txt': 'x' }), { analyze: noneVulnerable, today: TODAY });
    expect(full.assessment.notes?.[0]).toMatch(/No package\.json or composer\.json in this folder/);
  });

  it('rootManifestGuard names the subfolder projects when the root has none, and passes otherwise', async () => {
    await expect(rootManifestGuard(await materialize(monorepo))).rejects.toThrow(/Projects found in subfolders: apps\/api \(node\), apps\/web \(node\), services\/billing \(php\).*subfolder/);
    await expect(rootManifestGuard(await materialize({ 'package.json': pkgJson({}) }))).resolves.toBeUndefined();
    await expect(rootManifestGuard(await materialize({ 'index.php': '<?php' }))).resolves.toBeUndefined();
  });
});

describe('no lockfile: range-minimum versions are not treated as certain', () => {
  const withLock: Files = { 'package.json': pkgJson({ lodash: '^4.17.0' }), 'package-lock.json': lockOf({ lodash: '4.17.15' }), ...CI, ...DOCKER };
  const noLock: Files = { 'package.json': pkgJson({ lodash: '^4.17.0' }), ...CI, ...DOCKER };

  it('marks the finding low confidence, suffixes the title and explains it in rankReason', async () => {
    const full = await assessFull(await materialize(noLock), { analyze: allVulnerable, today: TODAY });
    const f = full.findings.find((x) => x.id === 'dep-vulnerable:lodash')!;
    expect(f.confidence).toBe('low');
    expect(f.title).toMatch(/\(version range, no lockfile\)$/);
    expect(f.rankReason).toBe('severity high, version range, no lockfile');
    expect(full.assessment.dependencies.lowConfidence).toBe(1);
    expect(full.assessment.notes?.join(' ')).toMatch(/count at half weight/);
  });

  it('does not mark the same finding when a lockfile gives the exact version', async () => {
    const full = await assessFull(await materialize(withLock), { analyze: allVulnerable, today: TODAY });
    const f = full.findings.find((x) => x.id === 'dep-vulnerable:lodash')!;
    expect(f.confidence).toBeUndefined();
    expect(f.title).not.toMatch(/no lockfile/);
    expect(full.assessment.dependencies.lowConfidence).toBeUndefined();
  });

  it('counts a low-confidence finding at half weight in the score', () => {
    const f = (confidence?: 'low'): Finding => ({ id: 'dep-vulnerable:x', category: 'dependencies', severity: 'high', title: 't', recommendation: 'r', ...(confidence ? { confidence } : {}) });
    expect(scoreFindings([f()]).overall).toBe(88); // 100 - 12
    expect(scoreFindings([f('low')]).overall).toBe(94); // 100 - 6
    expect(scoreFindings([f('low')]).lowConfidenceFindings).toBe(1);
    expect(scoreFindings([f()]).lowConfidenceFindings).toBeUndefined();
    expect(scoreFindings([f('low')]).byCategory.dependencies).toBe(94);
  });

  it('ranks a certain finding above a guessed one of the same severity', async () => {
    const files: Files = { 'package.json': pkgJson({ aaa: '^1.0.0', zzz: '^1.0.0' }), 'package-lock.json': lockOf({ zzz: '1.0.0' }), ...CI, ...DOCKER };
    const full = await assessFull(await materialize(files), { analyze: allVulnerable, today: TODAY });
    const order = full.findings.filter((x) => x.id.startsWith('dep-vulnerable:')).map((x) => x.id);
    expect(order).toEqual(['dep-vulnerable:zzz', 'dep-vulnerable:aaa']);
    expect(rankReason({ id: 'x', category: 'dependencies', severity: 'low', title: 't', recommendation: 'r' })).toBe('severity low');
  });
});

describe('dependency checks beyond 50 and under a time budget', () => {
  const many = (n: number): Files => ({ 'package.json': pkgJson(Object.fromEntries(Array.from({ length: n }, (_, i) => [`dep${String(i).padStart(3, '0')}`, '1.0.0']))), 'package-lock.json': lockOf(Object.fromEntries(Array.from({ length: n }, (_, i) => [`dep${String(i).padStart(3, '0')}`, '1.0.0']))), ...CI, ...DOCKER });

  it('checks all 120 dependencies (the old cap was 50)', async () => {
    const seen: number[] = [];
    const analyze: Analyzer = async (pkgs) => (seen.push(pkgs.length), noneVulnerable(pkgs));
    const full = await assessFull(await materialize(many(120)), { analyze, today: TODAY });
    expect(seen).toEqual([120]);
    expect(full.assessment.dependencies).toMatchObject({ total: 120, checked: 120 });
    expect(full.assessment.dependencies.unchecked).toBeUndefined();
  });

  it('puts production dependencies before dev ones in the check order', async () => {
    const files: Files = { 'package.json': pkgJson({ prodpkg: '1.0.0' }, { devDependencies: { devpkg: '1.0.0', adev: '1.0.0' } }), 'package-lock.json': lockOf({ prodpkg: '1.0.0', devpkg: '1.0.0', adev: '1.0.0' }), ...CI, ...DOCKER };
    let order: string[] = [];
    await assessFull(await materialize(files), { analyze: async (p: PackageRef[]) => ((order = p.map((x) => x.name)), noneVulnerable(p)), today: TODAY });
    expect(order[0]).toBe('prodpkg');
  });

  it('says "checked X of Y" with the unchecked counts when the analyzer returns only some packages', async () => {
    const partial: Analyzer = async (pkgs) => noneVulnerable(pkgs.slice(0, 10));
    const files = { ...many(15), 'package.json': pkgJson(Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`dep${String(i).padStart(3, '0')}`, '1.0.0'])), { devDependencies: { devA: '1.0.0', devB: '1.0.0', devC: '1.0.0' } }) };
    const full = await assessFull(await materialize(files), { analyze: partial, today: TODAY });
    const d = full.assessment.dependencies;
    expect(d.total).toBe(15);
    expect(d.checked).toBe(10);
    expect(d.unchecked).toEqual({ production: 2, dev: 3, reason: 'no_answer' });
    expect(full.assessment.notes?.join(' ')).toMatch(/Checked 10 of 15 dependencies .* Not checked: 2 production, 3 dev\./);
  });

  it('with the real bulk path, a time budget returns partial results and names what was left', async () => {
    const clock = { t: 0 };
    let n = 0;
    const client = {
      async queryBatchLarge(ps: PackageRef[]) {
        return ps.map((p) => ({ vulns: [{ id: `GHSA-${p.name}`, modified: 'x' }], more: false }));
      },
      async getVulnRecord(id: string) {
        n++;
        clock.t += 100; // each advisory fetch "takes" 100 ms of fake time
        return { id, database_specific: { severity: 'HIGH' } };
      }
    } as unknown as OsvClient;
    const full = await assessFull(await materialize(many(20)), {
      today: TODAY,
      epss: async () => new Map(),
      eol: async () => undefined,
      budgetMs: 550,
      bulk: { client, cache: new Map(), now: () => clock.t, detailConcurrency: 1, kevFetch: async () => new Set() }
    });
    const d = full.assessment.dependencies;
    expect(d.checked).toBeGreaterThan(0);
    expect(d.checked).toBeLessThan(20);
    expect(d.checked + (d.unchecked?.production ?? 0)).toBe(20);
    expect(d.unchecked?.reason).toBe('time_budget');
    expect(full.assessment.notes?.join(' ')).toMatch(new RegExp(`Checked ${d.checked} of 20 dependencies \\(time budget of 1 s reached\\)`));
    expect(n).toBe(d.checked);
    expect(full.findings.some((f) => f.id === 'osv-unavailable')).toBe(false);
  });

  it('keeps the old osv-unavailable finding when OSV cannot be reached at all', async () => {
    const client = { async queryBatchLarge() { throw new Error('down'); }, async getVulnRecord() { return null; } } as unknown as OsvClient;
    const full = await assessFull(await materialize(many(3)), { today: TODAY, epss: async () => new Map(), eol: async () => undefined, bulk: { client, cache: new Map(), kevFetch: async () => new Set() } });
    expect(full.findings.some((f) => f.id === 'osv-unavailable')).toBe(true);
    expect(full.assessment.dependencies.checked).toBe(0);
  });
});
