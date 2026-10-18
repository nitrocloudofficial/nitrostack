import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AnalysisService } from '../src/modules/analysis/analysis.service.js';
import { CodeDiffSignal } from '../src/modules/analysis/signals/code-diff.signal.js';
import { InstallScriptSignal } from '../src/modules/analysis/signals/install-script.signal.js';
import { NameCheckSignal } from '../src/modules/analysis/signals/name-check.signal.js';
import { NewDepsSignal } from '../src/modules/analysis/signals/new-deps.signal.js';
import { ProvenanceDropSignal } from '../src/modules/analysis/signals/provenance-drop.signal.js';
import { PublisherChangeSignal } from '../src/modules/analysis/signals/publisher-change.signal.js';
import { ReleaseTimingSignal } from '../src/modules/analysis/signals/release-timing.signal.js';
import { decide } from '../src/modules/analysis/verdict.js';
import { IncidentsService } from '../src/modules/incidents/incidents.service.js';

const analysis = new AnalysisService(
  new ProvenanceDropSignal(),
  new PublisherChangeSignal(),
  new InstallScriptSignal(),
  new NewDepsSignal(),
  new ReleaseTimingSignal(),
  new CodeDiffSignal(),
  new NameCheckSignal(),
);
const incidents = new IncidentsService();

/** The signals each replay must raise: the evidence the demo and README promise. */
const expected: Record<string, string[]> = {
  axios: ['new-deps', 'provenance-drop', 'publisher-change'],
  keyv: ['install-script', 'code-diff'],
  chalk: ['code-diff'],
  nx: ['provenance-drop', 'install-script', 'code-diff'],
  tinycolor: ['install-script', 'code-diff'],
};

for (const [id, signals] of Object.entries(expected)) {
  test(`replay ${id}: BLOCK, raised by ${signals.join(', ')}`, async () => {
    const result = await analysis.analyze(incidents.toContext(id));
    assert.equal(result.verdict, 'BLOCK');
    const raised = new Set(result.findings.map((f) => f.signal));
    for (const s of signals) assert.ok(raised.has(s), `${id} should raise ${s}; got ${[...raised].join(', ')}`);
  });
}

test('keyv is blocked although its provenance is valid', async () => {
  const result = await analysis.analyze(incidents.toContext('keyv'));
  assert.ok(!result.findings.some((f) => f.signal === 'provenance-drop'));
  assert.equal(result.verdict, 'BLOCK');
});

test('verdict thresholds: critical blocks, weights add up', () => {
  const f = (severity: 'warn' | 'high' | 'critical', weight: number) => ({ signal: 's', severity, title: 't', evidence: [], weight });
  assert.equal(decide([]).verdict, 'ALLOW');
  assert.equal(decide([f('warn', 15)]).verdict, 'ALLOW');
  assert.equal(decide([f('warn', 15), f('warn', 15)]).verdict, 'REVIEW');
  assert.equal(decide([f('high', 35), f('high', 35)]).verdict, 'BLOCK');
  assert.equal(decide([f('critical', 70)]).verdict, 'BLOCK');
});

test('fixture dependency lookups resolve to their sole manifest for any range', async () => {
  const ctx = incidents.toContext('axios');
  const info = await ctx.lookupPackage?.('plain-crypto-js', '^4.2.1');
  assert.ok(info?.latest);
  assert.deepEqual(info.resolved, info.latest);
});

test('signal timeout warns about incomplete coverage and prevents further dependency lookups', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.now() });
  const ctx = incidents.toContext('axios');
  // Seven new dependencies, looked up five at a time: the second batch must never start.
  const names = Array.from({ length: 7 }, (_, i) => `fixture-${i}`);
  ctx.target.dependencies = Object.fromEntries(names.map(n => [n, '^1']));
  ctx.target.optionalDependencies = {};
  ctx.loadFiles = async () => new Map([['index.js', Buffer.from(names.map(n => `import '${n}';`).join(' '))]]);
  const calls: string[] = [];
  let started!: () => void;
  const releases: (() => void)[] = [];
  const lookupStarted = new Promise<void>(resolve => { started = resolve; });
  ctx.lookupPackage = async name => {
    calls.push(name);
    started();
    await new Promise<void>(resolve => { releases.push(resolve); });
    return { name, versionCount: 20, latest: { name, version: '1.0.0', dist: { tarball: '' } } };
  };
  const pending = analysis.analyze(ctx);
  await lookupStarted;
  t.mock.timers.tick(25_000);
  const result = await pending;
  assert.ok(result.findings.some(f => f.signal === 'new-deps' && f.severity === 'warn' && f.weight === 15
    && f.title === 'new-deps check incomplete: timed out' && f.incomplete));
  const startedBeforeTimeout = calls.length;
  assert.ok(startedBeforeTimeout <= 5, `at most one batch of 5 lookups, got ${startedBeforeTimeout}`);
  for (const release of releases.splice(0)) release();
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(calls.length, startedBeforeTimeout, 'no lookup starts after the timeout');
});

test('a single timed-out signal raises an otherwise clean release to REVIEW', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.now() });
  const deps = new NewDepsSignal();
  t.mock.method(deps, 'evaluate', async () => new Promise<never>(() => {}));
  const name = new NameCheckSignal();
  t.mock.method(name, 'evaluate', async () => []);
  const service = new AnalysisService(new ProvenanceDropSignal(), new PublisherChangeSignal(),
    new InstallScriptSignal(), deps, new ReleaseTimingSignal(), new CodeDiffSignal(), name);
  const target = { name: 'fixture', version: '2.0.0', dist: { tarball: '' } };
  const pending = service.analyze({ name: 'fixture', target,
    baseline: [{ ...target, version: '1.0.0' }], time: { '2.0.0': '2020-01-02T00:00:00Z' },
    loadFiles: async () => new Map() });
  // Let the remaining signals finish before expiring only the deliberately stalled signal.
  await new Promise<void>(resolve => setImmediate(resolve));
  t.mock.timers.tick(25_000);
  const result = await pending;
  assert.equal(result.verdict, 'REVIEW');
  assert.equal(result.score, 15);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].incomplete, true);
  assert.equal(result.findings[0].title, 'new-deps check incomplete: timed out');
});
