import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalHash, signApprovalToken } from '../../src/common/approval-token.js';
import { assessFull, cmpVersion, type Analyzer } from '../../src/modules/assessment/assess.js';
import type { DependencyFix, FilePatch, Finding, PlanStage } from '../../src/modules/assessment/types.js';
import { applyStageInDir, buildApplyResult, checkApproval, refreshLocks } from '../../src/modules/planning/apply.js';
import { generatePatches } from '../../src/modules/planning/patches.js';
import { buildPlan } from '../../src/modules/planning/plan.js';
import { writeNodeFixture, writePhpFixture } from '../helpers/fixtures.js';

const SECRET = 'k'.repeat(40);
const NOW = 1_800_000_000;
const TODAY = new Date('2026-10-30T00:00:00Z');
const npmFix = (name: string, to: string): DependencyFix => ({ ecosystem: 'npm', name, from: '1.0.0', to, urgent: false, dev: false });
const phpFix = (name: string, to: string): DependencyFix => ({ ecosystem: 'Packagist', name, from: '1.0.0', to, urgent: false, dev: false });
const json = (v: unknown) => JSON.stringify(v, null, 2);

describe('refreshLocks', () => {
  it('updates npm lockfileVersion 1', () => {
    const lock = json({ lockfileVersion: 1, dependencies: { lodash: { version: '4.17.15' }, other: { version: '1.0.0' } } });
    const out = JSON.parse(refreshLocks({ 'package-lock.json': lock }, [npmFix('lodash', '4.17.21')])['package-lock.json']);
    expect(out.dependencies.lodash.version).toBe('4.17.21');
    expect(out.dependencies.other.version).toBe('1.0.0');
  });

  it('updates npm lockfileVersion 2 in packages and dependencies', () => {
    const lock = json({
      lockfileVersion: 2,
      packages: { '': { name: 'x' }, 'node_modules/lodash': { version: '4.17.15' } },
      dependencies: { lodash: { version: '4.17.15' } }
    });
    const out = JSON.parse(refreshLocks({ 'package-lock.json': lock }, [npmFix('lodash', '4.17.21')])['package-lock.json']);
    expect(out.packages['node_modules/lodash'].version).toBe('4.17.21');
    expect(out.dependencies.lodash.version).toBe('4.17.21');
  });

  it('updates npm lockfileVersion 3 in packages only', () => {
    const lock = json({ lockfileVersion: 3, packages: { 'node_modules/express': { version: '4.16.0' } } });
    const out = JSON.parse(refreshLocks({ 'package-lock.json': lock }, [npmFix('express', '4.19.2')])['package-lock.json']);
    expect(out.packages['node_modules/express'].version).toBe('4.19.2');
    expect(out.dependencies).toBeUndefined();
  });

  it('updates composer.lock and keeps a leading v', () => {
    const lock = json({
      packages: [{ name: 'guzzlehttp/guzzle', version: '6.5.0' }, { name: 'symfony/http-kernel', version: 'v4.4.0' }],
      'packages-dev': [{ name: 'phpunit/phpunit', version: 'v9.0.0' }]
    });
    const out = JSON.parse(
      refreshLocks({ 'composer.lock': lock }, [phpFix('guzzlehttp/guzzle', '8.3.1'), phpFix('symfony/http-kernel', '7.3.0'), phpFix('phpunit/phpunit', '9.6.0')])['composer.lock']
    );
    expect(out.packages[0].version).toBe('8.3.1');
    expect(out.packages[1].version).toBe('v7.3.0');
    expect(out['packages-dev'][0].version).toBe('v9.6.0');
  });

  it('leaves files alone when the lockfile is missing, broken or the name is absent', () => {
    expect(refreshLocks({ 'package.json': '{}' }, [npmFix('lodash', '4.17.21')])).toEqual({ 'package.json': '{}' });
    const broken = { 'package-lock.json': '{ nope', 'composer.lock': 'also nope' };
    expect(refreshLocks(broken, [npmFix('lodash', '4.17.21'), phpFix('a/b', '2.0.0')])).toEqual(broken);
    const lock = json({ lockfileVersion: 3, packages: { 'node_modules/a': { version: '1.0.0' } } });
    expect(refreshLocks({ 'package-lock.json': lock }, [npmFix('lodash', '4.17.21')])['package-lock.json']).toBe(lock);
  });

  it('does not mutate its input', () => {
    const files = { 'package-lock.json': json({ lockfileVersion: 1, dependencies: { a: { version: '1.0.0' } } }) };
    const copy = { ...files };
    refreshLocks(files, [npmFix('a', '2.0.0')]);
    expect(files).toEqual(copy);
  });
});

const stage: PlanStage = { index: 1, id: 'patch-dependencies', title: 'Patch', kind: 'dependencies', automated: true, risk: 'low', addresses: [], steps: ['s'], rollback: 'r', scoreAfter: 80 };
const finding = (id: string, severity: Finding['severity'] = 'high'): Finding => ({ id, category: 'dependencies', severity, title: `title ${id}`, recommendation: 'r' });

describe('buildApplyResult', () => {
  const patches: FilePatch[] = [{ path: 'package.json', before: '{"a":1}\n', after: '{"a":2}\n', reason: 'bump', stageId: 'patch-dependencies' }];
  const filesBefore = { 'package.json': '{"a":1}\n', '.env': 'A=1\n' };
  const filesAfter = { 'package.json': '{"a":2}\n', 'new.txt': 'x' };

  it('builds files, scores, fixed ids, remaining and the patch', () => {
    const before = { score: 50, findings: [finding('a'), finding('b'), finding('c')] };
    const after = { score: 74, findings: [finding('c', 'medium'), ...['d', 'e', 'f', 'g', 'h'].map((i) => finding(i, 'low'))] };
    const r = buildApplyResult({ stage, patches, filesBefore, filesAfter, before, after });
    expect(r).toMatchObject({ applied: true, mode: 'projected', scoreBefore: 50, scoreAfter: 74, scoreDelta: 24 });
    expect(r.stage).toEqual({ id: 'patch-dependencies', index: 1, title: 'Patch', risk: 'low' });
    expect(r.files).toEqual([
      { path: '.env', action: 'delete' },
      { path: 'new.txt', action: 'create' },
      { path: 'package.json', action: 'edit' }
    ]);
    expect(r.findingsFixed).toEqual(['a', 'b']);
    expect(r.remaining).toHaveLength(5);
    expect(r.remaining[0]).toEqual({ id: 'c', severity: 'medium', title: 'title c' });
    expect(r.patch).toContain('--- a/package.json');
    expect(r.howToApply[1]).toBe('Run: git apply fix.patch');
    expect(r.howToApply.at(-1)).toMatch(/assess_project/);
    expect(r.note).toMatch(/Projected/);
  });

  it('caps findingsFixed at 15 and hides env contents', () => {
    const many = Array.from({ length: 20 }, (_, i) => finding(`f${i}`));
    const envPatch: FilePatch = { path: '.env', before: 'KEY=supersecretvalue\n', after: null, reason: 'rm', stageId: 'x' };
    const r = buildApplyResult({ stage, patches: [envPatch], filesBefore: {}, filesAfter: {}, before: { score: 10, findings: many }, after: { score: 90, findings: [] } });
    expect(r.findingsFixed).toHaveLength(15);
    expect(r.patch).toContain('(content hidden: env file)');
    expect(r.patch).not.toContain('supersecretvalue');
  });
});

describe('checkApproval', () => {
  const expected = { planHash: 'p', patchHash: 'x', stage: 1 };
  const token = signApprovalToken(expected, SECRET, NOW);

  it('accepts a valid token', () => {
    expect(checkApproval(token, expected, SECRET, NOW + 1)).toEqual({ ok: true });
  });

  it('explains each failure without echoing the token', () => {
    const cases: Array<[RegExp, ReturnType<typeof checkApproval>]> = [
      [/not configured/, checkApproval(token, expected, undefined, NOW)],
      [/not configured/, checkApproval(token, expected, 'short', NOW)],
      [/Invalid approval token.*preview_changes/, checkApproval('garbage', expected, SECRET, NOW)],
      [/Invalid approval token.*preview_changes/, checkApproval(token.slice(0, -2) + 'AA', expected, SECRET, NOW)],
      [/expired.*preview_changes/, checkApproval(token, expected, SECRET, NOW + 1000)],
      [/changed since the preview.*preview_changes/, checkApproval(token, { ...expected, patchHash: 'y' }, SECRET, NOW)],
      [/changed since the preview.*preview_changes/, checkApproval(token, { ...expected, stage: 2 }, SECRET, NOW)]
    ];
    for (const [re, r] of cases) {
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.message).toMatch(re);
        expect(r.message).not.toContain(token);
      }
    }
  });
});

// ---- end to end through the real functions ----

const MIN: Record<string, string> = { lodash: '4.17.21', express: '4.19.2', 'guzzlehttp/guzzle': '8.3.1', 'symfony/http-kernel': '7.3.0' };
const fakeAnalyzer: Analyzer = async (pkgs) =>
  pkgs.map((p) => {
    const fixed = MIN[p.name];
    const affected = fixed !== undefined && cmpVersion(p.version.replace(/^v/, ''), fixed) < 0;
    return {
      package: p,
      affected,
      truncated: false,
      findings: affected ? [{ id: `GHSA-${p.name}`, aliases: [], severity: 'high' as const, summary: 's', fixedVersions: [fixed], urgent: false, urgentReasons: [] }] : []
    };
  });

const dirs: string[] = [];
const temp = async () => {
  const d = await mkdtemp(join(tmpdir(), 'metamorph-apply-'));
  dirs.push(d);
  return d;
};
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function snapshot(dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const walk = async (rel: string) => {
    for (const name of await readdir(join(dir, rel))) {
      const r = rel ? `${rel}/${name}` : name;
      if ((await stat(join(dir, r))).isDirectory()) await walk(r);
      else out[r] = await readFile(join(dir, r), 'utf8');
    }
  };
  await walk('');
  return out;
}

// Signs a token the way buildPreview does.
async function previewToken(dir: string, stageId: string, stageOverride?: number, tamper = false): Promise<string> {
  const { assessment, findings, fixes, files } = await assessFull(dir, { analyze: fakeAnalyzer, today: TODAY });
  const plan = buildPlan({ stack: assessment.stack, findings, fixes, goal: 'modernize_all' });
  const patches = generatePatches({ stack: assessment.stack, files, fixes, stageIds: [stageId] });
  if (tamper) patches[0] = { ...patches[0], after: (patches[0].after ?? '') + ' ' };
  const index = plan.stages.find((s) => s.id === stageId)!.index;
  return signApprovalToken({ planHash: canonicalHash(plan), patchHash: canonicalHash(patches), stage: stageOverride ?? index }, SECRET, NOW);
}

const run = (dir: string, token: string, stageId = 'patch-dependencies') =>
  applyStageInDir(dir, { stage: stageId, token, goal: 'modernize_all', secret: SECRET, analyze: fakeAnalyzer, today: TODAY, now: NOW + 5 });

describe('applyStageInDir end to end', () => {
  it.each([
    ['node', writeNodeFixture, 'dep-vulnerable:lodash', 'package-lock.json'],
    ['php', writePhpFixture, 'dep-vulnerable:guzzlehttp/guzzle', 'composer.lock']
  ])('projects a higher score for the legacy %s fixture', async (_name, write, findingId, lock) => {
    const dir = await temp();
    await write(dir);
    const token = await previewToken(dir, 'patch-dependencies');
    const r = await run(dir, token);
    expect(r).toMatchObject({ applied: true, mode: 'projected' });
    expect(r.scoreAfter).toBeGreaterThan(r.scoreBefore);
    expect(r.scoreDelta).toBe(r.scoreAfter - r.scoreBefore);
    expect(r.findingsFixed).toContain(findingId);
    expect(r.findingsFixed.every((id) => id.startsWith('dep-vulnerable:'))).toBe(true);
    expect(r.files.map((f) => f.path)).toContain(lock);
    expect(r.patch).toContain('+++ b/');
  });

  it('rejects a token for another stage and a tampered patch, writing nothing', async () => {
    const dir = await temp();
    await writeNodeFixture(dir);
    const before = await snapshot(dir);
    await expect(run(dir, await previewToken(dir, 'patch-dependencies', 2))).rejects.toThrow(/changed since the preview/);
    await expect(run(dir, await previewToken(dir, 'patch-dependencies', undefined, true))).rejects.toThrow(/changed since the preview/);
    await expect(run(dir, 'not-a-token')).rejects.toThrow(/Invalid approval token/);
    expect(await snapshot(dir)).toEqual(before);
  });

  it('reports unknown stages and a missing secret, writing nothing', async () => {
    const dir = await temp();
    await writeNodeFixture(dir);
    const before = await snapshot(dir);
    await expect(run(dir, 'x', 'nope')).rejects.toThrow(/Valid stage ids: .*patch-dependencies.*plan_modernization/);
    await expect(applyStageInDir(dir, { stage: 'patch-dependencies', token: 'x', goal: 'modernize_all', secret: undefined })).rejects.toThrow(/not configured/);
    expect(await snapshot(dir)).toEqual(before);
  });
});

describe('remove-committed-env stage', () => {
  const V = ['sk_live_' + 'abcdef123456', 'p4ss' + 'w0rd-value-9', 'AKIA' + 'ABCDEFGHIJKLMNOP'];
  const ENV = `# creds\nSTRIPE_KEY=${V[0]}\nDB_PASSWORD=${V[1]}\nAWS_ID=${V[2]}\n`;

  async function setup(extra: Record<string, string> = {}): Promise<string> {
    const dir = await temp();
    await writeNodeFixture(dir);
    await writeFile(join(dir, '.env'), ENV);
    for (const [k, v] of Object.entries(extra)) await writeFile(join(dir, k), v);
    return dir;
  }

  it('keeps the local .env, emits no deletion, hides values, and tells the user how to finish', async () => {
    const dir = await setup();
    const r = await run(dir, await previewToken(dir, 'remove-committed-env'), 'remove-committed-env');
    const out = JSON.stringify(r);
    for (const v of V) expect(out).not.toContain(v);
    expect(r.patch).not.toContain('/dev/null\n(content hidden');
    expect(r.patch).not.toMatch(/\+\+\+ \/dev\/null/);
    expect(r.patch).toContain('+STRIPE_KEY=');
    expect(r.files.some((f) => f.action === 'delete')).toBe(false);
    expect(r.files.map((f) => f.path)).toContain('.env.example');
    expect(r.howToApply).toContain('Run: git rm --cached .env');
    const text = r.howToApply.join('\n');
    expect(text).toMatch(/Rotate.*STRIPE_KEY.*DB_PASSWORD.*AWS_ID/);
    expect(text).toContain('git filter-repo --path .env --invert-paths');
    expect(text).toMatch(/force-push/);
    expect(r.note).toMatch(/git rm --cached/);
    expect(r.findingsFixed).toContain('env-file-committed');
    expect(r.scoreAfter).toBeGreaterThan(r.scoreBefore);
    const after = await snapshot(dir); // the throwaway copy: the projection untracks .env, adds the example and ignore rules
    expect(after['.env']).toBeUndefined();
    expect(after['.env.example']).toBe('STRIPE_KEY=\nDB_PASSWORD=\nAWS_ID=\n');
    expect(after['.gitignore']).toContain('.env.*');
  });

  it('is idempotent when .env.example already lists the keys and .gitignore covers env files', async () => {
    const dir = await setup({ '.env.example': 'STRIPE_KEY=\nDB_PASSWORD=\nAWS_ID=\n', '.gitignore': 'node_modules\n.env\n.env.*\n!.env.example\n' });
    await expect(run(dir, await previewToken(dir, 'remove-committed-env'), 'remove-committed-env')).rejects.toThrow(/Nothing to change/);
  });
});
