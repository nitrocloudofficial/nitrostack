import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExecutionContext } from '@nitrostack/core';
import { canonicalHash, signApprovalToken } from '../../src/common/approval-token.js';
import { cmpVersion, assessFull, type Analyzer } from '../../src/modules/assessment/assess.js';
import { withRepo } from '../../src/modules/assessment/repo-source.js';
import { generatePatches } from '../../src/modules/planning/patches.js';
import { buildPlan } from '../../src/modules/planning/plan.js';
import { collectReportData } from '../../src/modules/report/report.tools.js';
import { attachRunnerResult, buildReportData, type RunnerSummary } from '../../src/modules/report/report-data.js';
import { judge, runnerResultToSummary, viewOf } from '../../src/modules/verify/evaluate.js';
import { GithubRunner } from '../../src/modules/verify/github-runner.js';
import { parseRunnerResult, type RunnerResult } from '../../src/modules/verify/result.js';
import { VerifyTools } from '../../src/modules/verify/verify.tools.js';
import { fetchRunnerSummary, patchForStage, verifyByDispatch, verifyByRunIds } from '../../src/modules/verify/verify.js';
import { toViewModel, MAX_CHECKS, MAX_REASONS, type VerifyVM } from '../../src/widgets/lib/view-model.js';
import { CONFIG, FakeGithub, TOKEN, resultZip } from '../helpers/fake-github.js';
import { writeNodeFixture } from '../helpers/fixtures.js';
import { tgzOf } from '../helpers/tar.js';

// These tests exercise the runner and scoring, not the feeds: no KEV/EPSS lookups (the enrichment has its own tests).
vi.mock('../../src/modules/scanners/enrich.js', async (orig) => ({ ...(await orig<typeof import('../../src/modules/scanners/enrich.js')>()), liveEnrichClients: () => ({}) }));

const fixture = (n: string) => readFileSync(new URL(`../fixtures/runner/${n}`, import.meta.url), 'utf8');
const BEFORE = fixture('php-shop-before.json');
const AFTER = fixture('php-shop-after.json');
const patchText = fixture('guzzle-bump.patch');
const noSleep = async () => undefined;
const SECRET = 'k'.repeat(40);

// A project whose install and tests really passed: the shape the php-shop fixtures lack.
function passing(): RunnerResult {
  const r = parseRunnerResult(AFTER);
  if (!r.ok) throw new Error(r.error);
  return {
    ...r.result,
    buildOk: true,
    checks: r.result.checks.map((c) => (c.tool === 'composer-install' ? { ...c, status: 'pass' as const } : c)),
    tests: { ran: 12, passed: 12, failed: 0 }
  };
}

const gh = () => new FakeGithub();
const runner = (g: FakeGithub, extra = {}) => new GithubRunner(CONFIG, { fetchFn: g.fetch, sleep: noSleep, ...extra });
const done = { states: [{ status: 'completed', conclusion: 'success' }] };
const stubPatch = async () => ({ patch: patchText, stage: { id: 'patch-dependencies', title: 'Patch vulnerable dependencies' }, notes: [] as string[] });
const req = (extra = {}) => ({ repoUrl: 'https://github.com/o/r', subfolder: 'php-shop', getPatch: stubPatch, ...extra });

/** patched run gets `patched`, baseline gets `baseline` (decided by whether the dispatch carried a patch) */
function script(g: FakeGithub, patched: string | object | Buffer | 'none', baseline: string | object | Buffer | 'none', states = done.states) {
  g.scriptFor = (inputs) => {
    const a = inputs.patch_gz_b64 ? patched : baseline;
    return { states: [...states], artifact: a === 'none' ? 'none' : Buffer.isBuffer(a) ? a : resultZip(a) };
  };
}

describe('judge and verdicts', () => {
  it('is verified only when build succeeded and tests ran and passed', () => {
    const r = passing();
    expect(judge(viewOf({ runId: '1', state: 'completed' }, r), r)).toEqual({ verified: true, unverifiedReasons: [] });
  });

  it('is NOT verified for the php-shop fixtures: composer install failed, no tests', () => {
    for (const text of [BEFORE, AFTER]) {
      const p = parseRunnerResult(text);
      if (!p.ok) throw new Error(p.error);
      const v = judge(viewOf({ runId: '1', state: 'completed' }, p.result), p.result);
      expect(v.verified).toBe(false);
      expect(v.unverifiedReasons).toContain('composer install failed');
      expect(v.unverifiedReasons).toContain('no tests found');
    }
  });

  it.each([
    ['tests failed', (r: RunnerResult) => ({ ...r, tests: { ran: 5, passed: 3, failed: 2 } }), '2 tests failed'],
    ['patch not applied', (r: RunnerResult) => ({ ...r, patchApplied: false }), 'patch did not apply'],
    ['build not ok without a build check', (r: RunnerResult) => ({ ...r, buildOk: false, checks: r.checks.filter((c) => c.tool !== 'composer-install') }), 'build not verified'],
    ['ran but none passed', (r: RunnerResult) => ({ ...r, tests: { ran: 4, passed: 0, failed: 0 } }), 'no tests passed']
  ])('is not verified when %s', (_n, mutate, reason) => {
    const r = mutate(passing());
    const v = judge(viewOf({ runId: '1', state: 'completed' }, r), r);
    expect(v.verified).toBe(false);
    expect(v.unverifiedReasons).toContain(reason);
  });

  it('is not verified while running, after a timeout, or when the result is missing', () => {
    expect(judge(viewOf({ runId: '1', state: 'running' }), undefined)).toMatchObject({ verified: false, unverifiedReasons: ['runner still running'] });
    expect(judge(viewOf({ runId: '1', state: 'timed_out' }), undefined).unverifiedReasons).toContain('runner timed out');
    expect(judge(viewOf({ runId: '1', state: 'completed' }, undefined, 'boom'), undefined).unverifiedReasons).toEqual(['result unavailable: boom']);
    expect(judge(undefined, undefined).verified).toBe(false);
  });
});

describe('verify by dispatch (fake GitHub)', () => {
  it('dispatches ONE patched and ONE baseline run and measures both', async () => {
    const g = gh();
    script(g, AFTER, BEFORE);
    const out = await verifyByDispatch(runner(g), req(), 10_000);
    const dispatches = g.calls.filter((c) => c.method === 'POST');
    expect(dispatches).toHaveLength(2);
    const inputs = dispatches.map((c) => (c.body as { inputs: Record<string, string> }).inputs);
    expect(inputs.filter((i) => i.patch_gz_b64)).toHaveLength(1);
    expect(inputs.filter((i) => !i.patch_gz_b64)).toHaveLength(1);
    expect(new Set(inputs.map((i) => i.request_id)).size).toBe(2);
    expect(out.mode).toBe('measured');
    expect(out.status).toBe('completed');
    expect(out.patched).toMatchObject({ runId: '9000', patchApplied: true });
    expect(out.baseline).toMatchObject({ runId: '9001', patchApplied: false });
    expect(out.baseline.checks).toBeUndefined(); // kept small
  });

  it('php-shop fixtures give verified=false with reasons, never a green label', async () => {
    const g = gh();
    script(g, AFTER, BEFORE);
    const out = await verifyByDispatch(runner(g), req(), 10_000);
    expect(out.verified).toBe(false);
    expect(out.unverifiedReasons).toEqual(expect.arrayContaining(['composer install failed', 'no tests found']));
    expect(out.hint).toMatch(/Not verified/);
    expect(out.hint).not.toMatch(/Build succeeded/);
    const text = JSON.stringify(out);
    expect(text.length).toBeLessThan(4000);
    expect(text).not.toContain(TOKEN);
  });

  it('is verified=true for a build that passed with passing tests', async () => {
    const g = gh();
    script(g, passing(), { ...passing(), patchApplied: false });
    const out = await verifyByDispatch(runner(g), req(), 10_000);
    expect(out).toMatchObject({ verified: true, unverifiedReasons: [], status: 'completed' });
    expect(out.patched.tests).toEqual({ ran: 12, passed: 12, failed: 0 });
    expect(out.hint).toMatch(/runner_run_ids/);
  });

  it('returns running with run ids when the budget runs out, and resumes by run_id', async () => {
    const g = gh();
    g.scriptFor = () => ({ states: [{ status: 'in_progress', conclusion: null }] });
    let t = 0;
    const slow = runner(g, { sleep: async (ms: number) => void (t += ms), now: () => t });
    const out = await verifyByDispatch(slow, req(), 6000);
    expect(out).toMatchObject({ status: 'running', verified: false, resume: { run_id: '9000', baseline_run_id: '9001' } });
    expect(out.unverifiedReasons).toEqual(['runner still running']);
    expect(out.hint).toContain('run_id "9000"');
    // later both finish
    script(g, AFTER, BEFORE);
    for (const run of g.runs.values()) {
      run.states = [{ status: 'completed', conclusion: 'success' }];
      run.artifact = resultZip(run.id === 9000 ? AFTER : BEFORE);
    }
    const resumed = await verifyByRunIds(runner(g), { runId: '9000', baselineRunId: '9001' });
    expect(resumed.status).toBe('completed');
    expect(resumed.patched.patchApplied).toBe(true);
    expect(resumed.verified).toBe(false);
    expect(g.calls.filter((c) => c.method === 'POST')).toHaveLength(2); // resuming dispatched nothing new
  });

  it('reports a timed out run and a failed run without a result', async () => {
    const g = gh();
    script(g, 'none', 'none', [{ status: 'completed', conclusion: 'timed_out' }]);
    const t = await verifyByDispatch(runner(g), req(), 10_000);
    expect(t).toMatchObject({ status: 'timed_out', verified: false });
    expect(t.unverifiedReasons).toContain('runner timed out');
    const g2 = gh();
    script(g2, 'none', 'none', [{ status: 'completed', conclusion: 'failure' }]);
    const f = await verifyByDispatch(runner(g2), req(), 10_000);
    expect(f.status).toBe('failed');
    expect(f.unverifiedReasons).toEqual(expect.arrayContaining(['runner run failed (failure)']));
    expect(f.unverifiedReasons.some((r) => r.startsWith('result unavailable'))).toBe(true);
  });

  it('a completed run whose artifact is hostile is not verified', async () => {
    const g = gh();
    script(g, resultZip('{ nope'), BEFORE);
    const out = await verifyByDispatch(runner(g), req(), 10_000);
    expect(out.verified).toBe(false);
    expect(out.unverifiedReasons.some((r) => r.startsWith('result unavailable'))).toBe(true);
  });

  it('works with the 204 dispatch (request_id correlation)', async () => {
    const g = gh();
    g.dispatchReturnsRunId = false;
    script(g, AFTER, BEFORE);
    let n = 0;
    const out = await verifyByDispatch(runner(g, { newRequestId: () => `mm-req${++n}` }), req(), 10_000);
    expect(out.patched.runId).toBe('9000');
    expect(out.baseline.runId).toBe('9001');
  });

  it('a failed dispatch carries no token and nothing else is started for the patch', async () => {
    const g = gh();
    g.dispatchStatus = 403;
    const err = await verifyByDispatch(runner(g), req(), 1000).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/HTTP 403/);
    expect((err as Error).message).not.toContain(TOKEN);
  });

  it('rejects malformed run ids on resume', async () => {
    await expect(verifyByRunIds(runner(gh()), { runId: '12/../3' })).rejects.toThrow(/digits only/);
  });
});

describe('patchForStage (same checks as apply_stage)', () => {
  const MIN: Record<string, string> = { lodash: '4.17.21', express: '4.19.2' };
  const analyze: Analyzer = async (pkgs) =>
    pkgs.map((p) => {
      const fixed = MIN[p.name];
      const affected = fixed !== undefined && cmpVersion(p.version.replace(/^v/, ''), fixed) < 0;
      return { package: p, affected, truncated: false, findings: affected ? [{ id: `GHSA-${p.name}`, aliases: [], severity: 'high' as const, summary: 's', fixedVersions: [fixed], urgent: false, urgentReasons: [] }] : [] };
    });
  const TODAY = new Date('2026-10-30T00:00:00Z');
  const NOW_S = 1_800_000_000;
  const dirs: string[] = [];
  afterEach(async () => void (await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })))));

  async function setup() {
    const dir = await mkdtemp(join(tmpdir(), 'metamorph-verify-'));
    dirs.push(dir);
    await writeNodeFixture(dir);
    const { assessment, findings, fixes, files } = await assessFull(dir, { analyze, today: TODAY });
    const plan = buildPlan({ stack: assessment.stack, findings, fixes, goal: 'modernize_all' });
    const patches = generatePatches({ stack: assessment.stack, files, fixes, stageIds: ['patch-dependencies'] });
    const token = signApprovalToken({ planHash: canonicalHash(plan), patchHash: canonicalHash(patches), stage: plan.stages.find((s) => s.id === 'patch-dependencies')!.index }, SECRET, NOW_S);
    return { dir, token };
  }
  const opts = (token: string, over = {}) => ({ stage: 'patch-dependencies', token, goal: 'modernize_all' as const, secret: SECRET, analyze, today: TODAY, now: NOW_S + 5, ...over });

  it('returns a plain diff for an approved stage', async () => {
    const { dir, token } = await setup();
    const sp = await patchForStage(dir, opts(token));
    expect(sp.stage.id).toBe('patch-dependencies');
    expect(sp.patch).toContain('--- a/package.json');
    expect(sp.patch).toContain('+++ b/package.json');
    expect(sp.patch).not.toContain('diff truncated');
  });

  it('applies the same approval checks as apply_stage', async () => {
    const { dir, token } = await setup();
    await expect(patchForStage(dir, opts('garbage'))).rejects.toThrow(/Invalid approval token/);
    await expect(patchForStage(dir, opts(token, { now: NOW_S + 5000 }))).rejects.toThrow(/expired/);
    await expect(patchForStage(dir, opts(token, { stage: 'upgrade-runtime' }))).rejects.toThrow();
    await expect(patchForStage(dir, opts(token, { secret: undefined }))).rejects.toThrow(/not configured/);
    await expect(patchForStage(dir, opts(token, { stage: 'nope' }))).rejects.toThrow(/Valid stage ids/);
  });
});

describe('verify_patch tool', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.METAMORPH_AUTH = 'off';
    delete process.env.METAMORPH_GITHUB_TOKEN;
    delete process.env.METAMORPH_RUNNER_REPO;
  });
  afterEach(() => {
    process.env = { ...saved };
  });
  const ctx = { logger: { info: () => undefined } } as unknown as ExecutionContext;

  it('gives a clear next-step error (not a crash) when the runner is not configured', async () => {
    await expect(new VerifyTools().verifyPatch({ run_id: '123' }, ctx)).rejects.toThrow(/METAMORPH_GITHUB_TOKEN and METAMORPH_RUNNER_REPO are not set.*RUNNER_SETUP/);
    await expect(new VerifyTools().verifyPatch({ repo_url: 'https://github.com/o/r', stage: 's', approval_token: 't' }, ctx)).rejects.toThrow(/not configured/);
  });

  it('asks for the right inputs', async () => {
    await expect(new VerifyTools().verifyPatch({}, ctx)).rejects.toThrow(/repo_url \+ stage \+ approval_token.*run_id/);
    await expect(new VerifyTools().verifyPatch({ repo_url: 'https://github.com/o/r' }, ctx)).rejects.toThrow(/approval_token/);
  });

  it('missing token alone is named without echoing anything secret', async () => {
    process.env.METAMORPH_RUNNER_REPO = 'acme/metamorph-runner';
    await expect(new VerifyTools().verifyPatch({ run_id: '1' }, ctx)).rejects.toThrow(/METAMORPH_GITHUB_TOKEN is not set/);
  });
});

describe('report wiring', () => {
  const p = (t: string) => {
    const r = parseRunnerResult(t);
    if (!r.ok) throw new Error(r.error);
    return r.result;
  };

  it('maps RunnerResult to RunnerSummary with measured before and after', () => {
    const s = runnerResultToSummary({ baseline: p(BEFORE), patched: p(AFTER), baselineRunId: '1', patchedRunId: '2' });
    expect(s.runner).toBe('github-actions (baseline run 1, patched run 2)');
    expect(s.checks.find((c) => c.name === 'composer-install')).toMatchObject({ status: 'failed', detail: expect.stringContaining('baseline: fail') });
    expect(s.checks.find((c) => c.name === 'phpunit')?.status).toBe('skipped');
    expect(s.checks.find((c) => c.name === 'build')).toMatchObject({ status: 'failed', detail: 'buildOk=false | baseline: buildOk=false' });
    expect(s.checks.find((c) => c.name === 'tests')).toMatchObject({ status: 'skipped', detail: expect.stringContaining('no tests found') });
    expect(s.startedAt && s.finishedAt).toBeTruthy();
    expect(() => attachRunnerResult(buildReportData({ full: emptyFull(), meta: { repoUrl: 'https://github.com/o/r', generatedAt: 'x' } }), s)).not.toThrow();
    expect(() => runnerResultToSummary({})).toThrow(TypeError);
  });

  it('maps errors to failed and works with only one run', () => {
    const r = p(AFTER);
    const s = runnerResultToSummary({ patched: { ...r, checks: [{ ...r.checks[0], status: 'error' }] }, patchedRunId: '5' });
    expect(s.checks[0].status).toBe('failed');
    expect(s.runner).toBe('github-actions (patched run 5)');
    expect(s.checks.find((c) => c.name === 'tests')?.detail).not.toContain('baseline');
  });

  it('fetchRunnerSummary reads finished runs and refuses unfinished ones', async () => {
    const g = gh();
    g.runs.set(1, { id: 1, title: 't', states: [{ status: 'completed', conclusion: 'success' }], artifact: resultZip(BEFORE) });
    g.runs.set(2, { id: 2, title: 't', states: [{ status: 'completed', conclusion: 'success' }], artifact: resultZip(AFTER) });
    g.runs.set(3, { id: 3, title: 't', states: [{ status: 'in_progress', conclusion: null }] });
    const s = await fetchRunnerSummary(runner(g), { baseline: '1', patched: '2' });
    expect(s.runner).toContain('baseline run 1');
    await expect(fetchRunnerSummary(runner(g), { patched: '3' })).rejects.toThrow(/still running.*verify_patch/);
    await expect(fetchRunnerSummary(runner(g), {})).rejects.toThrow(/baseline or a patched/);
    await expect(fetchRunnerSummary(runner(g), { patched: 'abc' })).rejects.toThrow(/digits only/);
  });

  it('generate_report fills Verification from the runner ids, and keeps "Not verified" without them', async () => {
    const files = {
      'legacy-main/package.json': JSON.stringify({ name: 'legacy', version: '1.0.0', engines: { node: '>=10' }, dependencies: { lodash: '4.17.15' } }),
      'legacy-main/package-lock.json': JSON.stringify({ name: 'legacy', lockfileVersion: 3, packages: { '': { name: 'legacy' }, 'node_modules/lodash': { version: '4.17.15' } } })
    };
    const serve = (): typeof fetch => (async () => new Response(tgzOf(files), { status: 200 })) as unknown as typeof fetch;
    const feeds = { fetchFn: (async () => new Response('x', { status: 503 })) as unknown as typeof fetch, osv: { client: { queryPackage: async () => [] } as never } };
    const rctx = { logger: { info: () => undefined } } as unknown as Parameters<typeof withRepo>[2];
    const without = await collectReportData({ repo_url: 'https://github.com/o/legacy' }, rctx, { archiveFetch: serve(), feeds });
    expect(without.verification).toBeUndefined();

    const g = gh();
    g.runs.set(1, { id: 1, title: 't', states: [{ status: 'completed', conclusion: 'success' }], artifact: resultZip(BEFORE) });
    g.runs.set(2, { id: 2, title: 't', states: [{ status: 'completed', conclusion: 'success' }], artifact: resultZip(AFTER) });
    const withIds = await collectReportData({ repo_url: 'https://github.com/o/legacy', runner_run_ids: { baseline: '1', patched: '2' } }, rctx, { archiveFetch: serve(), feeds, runner: runner(g) });
    expect(withIds.verification?.runner).toContain('github-actions');
    expect(withIds.verification?.checks.map((c) => c.name)).toContain('composer-install');
    expect(JSON.stringify(withIds)).not.toContain(TOKEN);
  });
});

function emptyFull() {
  return {
    assessment: { assessmentId: 'x', stack: 'node', runtime: { declared: undefined }, score: { overall: 50, byCategory: {}, counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 } }, dependencies: { total: 0, checked: 0, vulnerable: 0, urgent: 0, approximateVersions: false }, truncated: false },
    findings: [],
    fixes: [],
    files: {}
  } as never;
}

describe('score-dashboard view model for verify results', () => {
  const base = () => ({
    mode: 'measured',
    status: 'completed',
    verified: false,
    unverifiedReasons: ['composer install failed', 'no tests found'],
    stage: { id: 'patch-dependencies', title: 'Patch vulnerable dependencies' },
    patched: { runId: '2', status: 'completed', buildOk: false, patchApplied: true, tests: { ran: 0, passed: 0, failed: 0 }, checks: [{ tool: 'composer-install', status: 'fail' }, { tool: 'gitleaks', status: 'pass' }], checkCount: 2 },
    baseline: { runId: '1', status: 'completed', buildOk: false, tests: { ran: 0, passed: 0, failed: 0 } },
    notes: [],
    hint: 'Not verified.'
  });

  it('shapes an unverified result with reasons and checks', () => {
    const vm = toViewModel(base()) as VerifyVM;
    expect(vm.kind).toBe('verify');
    expect(vm.verified).toBe(false);
    expect(vm.reasons).toEqual(['composer install failed', 'no tests found']);
    expect(vm.stage).toBe('Patch vulnerable dependencies');
    expect(vm.patched).toMatchObject({ status: 'completed', buildOk: false });
    expect(vm.baseline.runId).toBe('1');
    expect(vm.checks).toEqual([{ tool: 'composer-install', status: 'fail' }, { tool: 'gitleaks', status: 'pass' }]);
  });

  it('shows verified only when verified, no reasons and the patched run completed', () => {
    const ok = { ...base(), verified: true, unverifiedReasons: [] };
    expect((toViewModel(ok) as VerifyVM).verified).toBe(true);
    expect((toViewModel({ ...ok, unverifiedReasons: ['x'] }) as VerifyVM).verified).toBe(false);
    expect((toViewModel({ ...ok, patched: { ...ok.patched, status: 'running' } }) as VerifyVM).verified).toBe(false);
    expect((toViewModel({ ...ok, verified: 'true' }) as VerifyVM).kind).not.toBe('verify');
  });

  it('caps checks and reasons, and survives junk', () => {
    const b = base();
    const vm = toViewModel({
      ...b,
      unverifiedReasons: Array.from({ length: 30 }, (_, i) => `reason ${i}`),
      patched: { ...b.patched, checks: Array.from({ length: 40 }, (_, i) => ({ tool: `c${i}`, status: 'fail' })), checkCount: 40 }
    }) as VerifyVM;
    expect(vm.reasons).toHaveLength(MAX_REASONS);
    expect(vm.reasonCount).toBe(30);
    expect(vm.checks).toHaveLength(MAX_CHECKS);
    expect(vm.checkCount).toBe(40);
    const junk = toViewModel({ mode: 'measured', verified: false, status: 'weird', patched: { status: 5, checks: [1, null, { tool: 3 }] }, baseline: 'x', unverifiedReasons: 'no' }) as VerifyVM;
    expect(junk.kind).toBe('verify');
    expect(junk.status).toBe('failed');
    expect(junk.checks).toEqual([]);
  });

  it('shows a running state with its run ids', () => {
    const vm = toViewModel({ ...base(), status: 'running', unverifiedReasons: ['runner still running'], patched: { runId: '2', status: 'running' }, baseline: { runId: '1', status: 'queued' } }) as VerifyVM;
    expect(vm).toMatchObject({ status: 'running', verified: false });
    expect(vm.baseline.status).toBe('queued');
  });
});
