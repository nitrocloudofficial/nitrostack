import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { readSingleZipEntry, ZipError } from '../../src/modules/verify/zip.js';
import { GithubRunner, isAllowedHost, loadRunnerConfig, runState, RunnerError, MAX_DISPATCH_PATCH_CHARS } from '../../src/modules/verify/github-runner.js';
import { CONFIG, FakeGithub, TOKEN, resultZip } from '../helpers/fake-github.js';
import { makeZip } from '../helpers/zip.js';

const read = (name: string) => readFileSync(new URL(`../fixtures/runner/${name}`, import.meta.url), 'utf8');
const AFTER = read('php-shop-after.json');
const noSleep = async () => undefined;
const mk = (gh: FakeGithub, extra = {}) =>
  new GithubRunner(CONFIG, { fetchFn: gh.fetch, sleep: noSleep, newRequestId: () => 'mm-0123456789abcdef', ...extra });

describe('runner script patch transport (PATCH_GZ_B64)', () => {
  const dirs: string[] = [];
  afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));
  const runScript = (env: Record<string, string>) => {
    const dir = mkdtempSync(join(tmpdir(), 'mm-runner-test-'));
    dirs.push(dir);
    const out = join(dir, 'result.json');
    // PATH only: no REPO secrets. Validation failures return before any clone or network access.
    const r = spawnSync(process.execPath, ['runner/metamorph-run.mjs'], { env: { PATH: process.env.PATH ?? '', OUT_FILE: out, WORK_DIR: join(dir, 'work'), REPO_URL: 'https://github.com/o/r', ...env }, encoding: 'utf8', timeout: 20_000 });
    return { r, result: JSON.parse(readFileSync(out, 'utf8')) as { checks: Array<{ tool: string; status: string; summary: string }> } };
  };

  it('the real guzzle lock patch fits once compressed (and does not uncompressed)', () => {
    const patch = readFileSync(new URL('../fixtures/runner/guzzle-bump.patch', import.meta.url));
    const plain = patch.toString('base64').length;
    const gz = gzipSync(patch, { level: 9 }).toString('base64').length;
    console.log(`patch ${patch.length} bytes, base64 ${plain} chars, gzip+base64 ${gz} chars`);
    expect(patch.length).toBeGreaterThan(50_000);
    expect(gz).toBeLessThan(MAX_DISPATCH_PATCH_CHARS);
    expect(gz).toBeLessThan(plain / 4);
  });

  it('refuses a compressed patch over the cap with a next-step message', () => {
    // incompressible data so the compressed form really is large
    const noise = randomBytes(60_000);
    const { result } = runScript({ PATCH_GZ_B64: gzipSync(noise).toString('base64') });
    const c = result.checks.find((x) => x.tool === 'input-validation')!;
    expect(c.status).toBe('error');
    expect(c.summary).toMatch(/PATCH_GZ_B64 is \d+ characters, over the 60000 limit/);
    expect(c.summary).toMatch(/Next step/);
  });

  it('tells a PATCH_B64 sender to compress', () => {
    const { result } = runScript({ PATCH_B64: 'A'.repeat(61_000) });
    expect(result.checks.find((x) => x.tool === 'input-validation')!.summary).toMatch(/PATCH_GZ_B64 \(gzip, then base64\)/);
  });

  it('rejects both inputs together, bad gzip and a gzip bomb', () => {
    expect(runScript({ PATCH_B64: 'AAAA', PATCH_GZ_B64: 'AAAA' }).result.checks.find((x) => x.tool === 'input-validation')!.summary).toMatch(/not both/);
    expect(runScript({ PATCH_GZ_B64: Buffer.from('not gzip').toString('base64') }).result.checks.find((x) => x.tool === 'input-validation')!.summary).toMatch(/not valid gzip/);
    const bomb = gzipSync(Buffer.alloc(3 * 1024 * 1024)).toString('base64');
    expect(runScript({ PATCH_GZ_B64: bomb, MAX_PATCH_BYTES: '1000000' }).result.checks.find((x) => x.tool === 'input-validation')!.summary).toMatch(/expands beyond 1000000 bytes/);
  });
});

describe('safe zip reader', () => {
  it('reads the one expected entry, stored or deflated', () => {
    expect(readSingleZipEntry(makeZip([{ name: 'result.json', data: '{"a":1}' }]), 'result.json').toString()).toBe('{"a":1}');
    expect(readSingleZipEntry(makeZip([{ name: 'result.json', data: '{"a":1}', method: 0 }]), 'result.json').toString()).toBe('{"a":1}');
  });

  it.each([
    ['zip-slip name', [{ name: '../result.json', data: 'x' }]],
    ['absolute name', [{ name: '/etc/passwd', data: 'x' }]],
    ['backslash name', [{ name: '..\\evil', data: 'x' }]],
    ['nested slip', [{ name: 'a/../../result.json', data: 'x' }]],
    ['extra entry', [{ name: 'result.json', data: 'x' }, { name: 'other.txt', data: 'y' }]],
    ['wrong name', [{ name: 'result.txt', data: 'x' }]],
    ['duplicate', [{ name: 'result.json', data: 'x' }, { name: 'result.json', data: 'y' }]]
  ])('rejects %s', (_n, entries) => {
    expect(() => readSingleZipEntry(makeZip(entries), 'result.json')).toThrow(ZipError);
  });

  it('rejects oversize entries, lying headers, zip bombs, empty and non-zip input', () => {
    expect(() => readSingleZipEntry(makeZip([{ name: 'result.json', data: Buffer.alloc(3000) }]), 'result.json', { maxEntryBytes: 1000 })).toThrow(/larger than 1000/);
    // header claims small, data is large: inflate cap and size check both catch it
    expect(() => readSingleZipEntry(makeZip([{ name: 'result.json', data: Buffer.alloc(50_000), usizeOverride: 10 }]), 'result.json', { maxEntryBytes: 1000 })).toThrow(ZipError);
    expect(() => readSingleZipEntry(makeZip([{ name: 'result.json', data: Buffer.alloc(50_000), usizeOverride: 10 }]), 'result.json')).toThrow(/size does not match/);
    expect(() => readSingleZipEntry(Buffer.alloc(5_000_000), 'result.json')).toThrow(/larger than/);
    expect(() => readSingleZipEntry(makeZip([]), 'result.json')).toThrow(ZipError);
    expect(() => readSingleZipEntry(Buffer.from('hello world, definitely not a zip file'), 'result.json')).toThrow(ZipError);
  });
});

describe('configuration', () => {
  it('gives next-step errors for missing config and never echoes a token', () => {
    expect(() => loadRunnerConfig({})).toThrow(/METAMORPH_GITHUB_TOKEN and METAMORPH_RUNNER_REPO are not set.*RUNNER_SETUP/);
    expect(() => loadRunnerConfig({ METAMORPH_RUNNER_REPO: 'a/b' })).toThrow(/METAMORPH_GITHUB_TOKEN is not set/);
    expect(() => loadRunnerConfig({ METAMORPH_GITHUB_TOKEN: TOKEN })).toThrow(/METAMORPH_RUNNER_REPO is not set/);
    let msg = '';
    try {
      loadRunnerConfig({ METAMORPH_GITHUB_TOKEN: TOKEN, METAMORPH_RUNNER_REPO: 'not a repo' });
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/owner\/name/);
    expect(msg).not.toContain(TOKEN);
  });

  it('defaults the ref to main', () => {
    expect(loadRunnerConfig({ METAMORPH_GITHUB_TOKEN: TOKEN, METAMORPH_RUNNER_REPO: 'a/b' })).toEqual({ repo: 'a/b', ref: 'main', token: TOKEN });
    expect(loadRunnerConfig({ METAMORPH_GITHUB_TOKEN: TOKEN, METAMORPH_RUNNER_REPO: 'a/b', METAMORPH_RUNNER_REF: 'v1' }).ref).toBe('v1');
  });

  it('allows only documented hosts by exact rule', () => {
    const ok = ['https://api.github.com/x', 'https://productionresultssa1.blob.core.windows.net/a', 'https://results-receiver.actions.githubusercontent.com/a', 'https://pipelines.actions.githubusercontent.com/a'];
    const bad = [
      'http://api.github.com/x',
      'https://api.github.com.evil.com/x',
      'https://evil.com/api.github.com',
      'https://x.blob.core.windows.net.evil.com/a',
      'https://a.b.blob.core.windows.net/a',
      'https://user@api.github.com/x',
      'https://api.github.com:8443/x',
      'https://blob.core.windows.net/a',
      'https://github.com/x'
    ];
    for (const u of ok) expect(isAllowedHost(new URL(u)), u).toBe(true);
    for (const u of bad) expect(isAllowedHost(new URL(u)), u).toBe(false);
  });

  it('maps GitHub statuses', () => {
    expect(runState('queued', null)).toBe('queued');
    expect(runState('in_progress', null)).toBe('running');
    expect(runState('completed', 'success')).toBe('completed');
    expect(runState('completed', 'timed_out')).toBe('timed_out');
    expect(runState('completed', 'failure')).toBe('failed');
    expect(runState('completed', 'cancelled')).toBe('failed');
  });
});

describe('GithubRunner against a fake GitHub', () => {
  it('dispatches with ref, request_id and a gzip patch, using the returned run id', async () => {
    const gh = new FakeGithub();
    const patch = readFileSync(new URL('../fixtures/runner/guzzle-bump.patch', import.meta.url), 'utf8');
    const { runId, requestId } = await mk(gh).dispatch({ repoUrl: 'https://github.com/o/r', subfolder: 'php-shop', patch });
    expect(runId).toBe('9000');
    expect(requestId).toBe('mm-0123456789abcdef');
    const call = gh.calls[0];
    expect(call.method).toBe('POST');
    expect(call.url).toBe('https://api.github.com/repos/acme/metamorph-runner/actions/workflows/metamorph-runner.yml/dispatches');
    expect(call.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    const body = call.body as { ref: string; inputs: Record<string, string> };
    expect(body.ref).toBe('main');
    expect(body.inputs).toMatchObject({ repo_url: 'https://github.com/o/r', subfolder: 'php-shop', request_id: 'mm-0123456789abcdef', checks: 'light' });
    expect(body.inputs.patch_b64).toBeUndefined();
    expect(Object.values(body.inputs).join('').length).toBeLessThan(65_535);
    // round trip: gunzip(base64) is the patch
    const { gunzipSync } = await import('node:zlib');
    expect(gunzipSync(Buffer.from(body.inputs.patch_gz_b64, 'base64')).toString()).toBe(patch);
  });

  it('omits patch inputs for the baseline run', async () => {
    const gh = new FakeGithub();
    await mk(gh).dispatch({ repoUrl: 'https://github.com/o/r' });
    const inputs = (gh.calls[0].body as { inputs: Record<string, string> }).inputs;
    expect(inputs.patch_gz_b64).toBeUndefined();
    expect(inputs.subfolder).toBeUndefined();
  });

  it('correlates by request_id when dispatch returns no run id (204)', async () => {
    const gh = new FakeGithub();
    gh.dispatchReturnsRunId = false;
    gh.hiddenListings = 2; // the run is not listed yet on the first two tries
    const { runId } = await mk(gh).dispatch({ repoUrl: 'https://github.com/o/r' });
    expect(runId).toBe('9000');
    const lists = gh.calls.filter((c) => c.url.includes('/runs?'));
    expect(lists).toHaveLength(3);
    expect(lists[0].url).toContain('event=workflow_dispatch');
  });

  it('does not pick another dispatch\'s run and fails clearly when it never appears', async () => {
    const gh = new FakeGithub();
    gh.dispatchReturnsRunId = false;
    gh.runs.set(1, { id: 1, title: 'Metamorph runner mm-someoneelse', states: [{ status: 'queued', conclusion: null }] });
    gh.hiddenListings = 99;
    await expect(mk(gh).dispatch({ repoUrl: 'https://github.com/o/r' })).rejects.toThrow(/could not be found yet/);
    gh.hiddenListings = 0;
    expect((await mk(gh).dispatch({ repoUrl: 'https://github.com/o/r' })).runId).toBe('9000');
  });

  it('refuses a patch that is too large even compressed, before any request', async () => {
    const gh = new FakeGithub();
    const noise = randomBytes(70_000);
    await expect(mk(gh).dispatch({ repoUrl: 'https://github.com/o/r', patch: noise.toString('base64') })).rejects.toThrow(/after compression.*Next step/);
    expect(gh.calls).toHaveLength(0);
  });

  it('polls through queued, running and completed, with growing delays', async () => {
    const gh = new FakeGithub();
    gh.runs.set(7, { id: 7, title: 't', states: [{ status: 'queued', conclusion: null }, { status: 'in_progress', conclusion: null }, { status: 'completed', conclusion: 'success' }] });
    const delays: number[] = [];
    let t = 0;
    const r = mk(gh, { sleep: async (ms: number) => void (t += ms, delays.push(ms)), now: () => t });
    const info = await r.waitFor('7', 60_000);
    expect(info.state).toBe('completed');
    expect(delays).toEqual([2000, 3000]);
  });

  it('returns a running status with the run id when the budget runs out', async () => {
    const gh = new FakeGithub();
    gh.runs.set(7, { id: 7, title: 't', states: [{ status: 'in_progress', conclusion: null }] });
    let t = 0;
    const r = mk(gh, { sleep: async (ms: number) => void (t += ms), now: () => t });
    const info = await r.waitFor('7', 12_000);
    expect(info).toMatchObject({ runId: '7', state: 'running' });
    expect(t).toBeLessThanOrEqual(12_000);
  });

  it('maps failed and timed out runs, and refuses runs of another workflow or a bad id', async () => {
    const gh = new FakeGithub();
    gh.runs.set(1, { id: 1, title: 't', states: [{ status: 'completed', conclusion: 'timed_out' }] });
    gh.runs.set(2, { id: 2, title: 't', states: [{ status: 'completed', conclusion: 'failure' }] });
    gh.runs.set(3, { id: 3, title: 't', states: [{ status: 'completed', conclusion: 'success' }], path: '.github/workflows/other.yml@refs/heads/main' });
    expect((await mk(gh).getRun('1')).state).toBe('timed_out');
    expect((await mk(gh).getRun('2')).state).toBe('failed');
    await expect(mk(gh).getRun('3')).rejects.toThrow(/does not belong/);
    await expect(mk(gh).getRun('1/../../x')).rejects.toThrow(/digits only/);
    await expect(mk(gh).getRun('404')).rejects.toThrow(/HTTP 404/);
  });

  it('downloads the artifact through the redirect without sending the token there, and validates it', async () => {
    const gh = new FakeGithub();
    gh.runs.set(7, { id: 7, title: 't', states: [{ status: 'completed', conclusion: 'success' }], artifact: resultZip(AFTER) });
    const result = await mk(gh).fetchResult('7');
    expect(result.repo).toBe('dhilipa01/metamorph-demo-legacy');
    expect(result.patchApplied).toBe(true);
    const api = gh.calls.filter((c) => new URL(c.url).hostname === 'api.github.com');
    const blob = gh.calls.filter((c) => new URL(c.url).hostname.endsWith('blob.core.windows.net'));
    expect(api.length).toBeGreaterThan(0);
    expect(api.every((c) => c.headers.Authorization === `Bearer ${TOKEN}`)).toBe(true);
    expect(blob).toHaveLength(1);
    expect(JSON.stringify(blob[0])).not.toContain(TOKEN);
    expect(blob[0].headers.Authorization).toBeUndefined();
  });

  it('refuses a redirect to a host that is not allowed', async () => {
    const gh = new FakeGithub();
    gh.runs.set(7, { id: 7, title: 't', states: [{ status: 'completed', conclusion: 'success' }], artifact: resultZip(AFTER) });
    gh.redirectTo = 'https://evil.example.com/artifacts/zip';
    await expect(mk(gh).fetchResult('7')).rejects.toThrow(/host that is not allowed/);
    expect(gh.calls.some((c) => c.url.includes('evil.example.com'))).toBe(false);
  });

  it('rejects a hostile or invalid artifact', async () => {
    for (const art of [resultZip('{ not json'), resultZip({ schema: 2 }), makeZip([{ name: '../result.json', data: AFTER }]), makeZip([{ name: 'result.json', data: AFTER }, { name: 'x', data: 'y' }]), makeZip([{ name: 'result.json', data: 'x'.repeat(2_500_000), method: 8 }])]) {
      const gh = new FakeGithub();
      gh.runs.set(7, { id: 7, title: 't', states: [{ status: 'completed', conclusion: 'success' }], artifact: art });
      await expect(mk(gh).fetchResult('7')).rejects.toThrow(RunnerError);
    }
  });

  it('says so when the run has no artifact', async () => {
    const gh = new FakeGithub();
    gh.runs.set(7, { id: 7, title: 't', states: [{ status: 'completed', conclusion: 'failure' }], artifact: 'none' });
    await expect(mk(gh).fetchResult('7')).rejects.toThrow(/no metamorph-result artifact/);
  });

  it('never puts the token in a thrown error, even when GitHub echoes it', async () => {
    const gh = new FakeGithub();
    gh.dispatchStatus = 401;
    let msg = '';
    try {
      await mk(gh).dispatch({ repoUrl: 'https://github.com/o/r' });
    } catch (e) {
      msg = `${(e as Error).message} ${(e as Error).stack ?? ''}`;
    }
    expect(msg).toMatch(/HTTP 401/);
    expect(msg).toMatch(/METAMORPH_GITHUB_TOKEN/);
    expect(msg).not.toContain(TOKEN);
    expect(msg).toContain('[token]');
    // a network failure that mentions the token in its text is scrubbed too
    const boom = new GithubRunner(CONFIG, { fetchFn: (async () => { throw new Error(`socket ${TOKEN}`); }) as unknown as typeof fetch, sleep: noSleep });
    await expect(boom.getRun('1')).rejects.toThrow(/network error/);
    await boom.getRun('1').catch((e: Error) => expect(e.message + (e.stack ?? '')).not.toContain(TOKEN));
    expect(boom.scrub(`x ${TOKEN} y github_pat_${'a'.repeat(30)}`)).toBe('x [token] y [token]');
  });
});
