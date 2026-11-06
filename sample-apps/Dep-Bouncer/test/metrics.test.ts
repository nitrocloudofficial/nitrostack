import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { buildResources, ExecutionContext } from '@nitrostack/core';
import { MetricsInterceptor } from '../src/modules/observability/metrics.interceptor.js';
import { BOUNCER_TOOL_NAMES, MetricsService } from '../src/modules/observability/metrics.service.js';
import { BouncerResources } from '../src/modules/bouncer/bouncer.resources.js';
import { IncidentsService } from '../src/modules/incidents/incidents.service.js';

const context = (toolName: string): ExecutionContext => ({
  toolName, requestId: 'private-request',
  metadata: { apiKey: 'private-key', ip: 'private-ip', packageJson: 'private-manifest' },
  logger: { info() {}, debug() {}, warn() {}, error() {} },
});

test('metrics interceptor preserves result identity and records latency and verdicts', async t => {
  let now = 0;
  t.mock.method(performance, 'now', () => now);
  const metrics = new MetricsService();
  const interceptor = new MetricsInterceptor(metrics);
  for (const verdict of ['ALLOW', 'REVIEW', 'BLOCK']) {
    const result = Object.freeze({ verdict, findings: Object.freeze([]) });
    assert.equal(await interceptor.intercept(context('bouncer_check_package'), async () => {
      now += 25;
      return result;
    }), result);
  }
  const snapshot = metrics.snapshot();
  assert.deepEqual(snapshot.tools.bouncer_check_package, {
    calls: 3, errors: 0, latencyMs: { p50: 25, p95: 25, samples: 3 },
  });
  assert.deepEqual(snapshot.verdicts, { ALLOW: 1, REVIEW: 1, BLOCK: 1 });
});

test('metrics interceptor rethrows the original error, including non-Error throws', async t => {
  let now = 0;
  t.mock.method(performance, 'now', () => now);
  const metrics = new MetricsService();
  const interceptor = new MetricsInterceptor(metrics);
  for (const failure of [new Error('private-error-message'), 'private-error', undefined]) {
    let caught = false;
    try {
      await interceptor.intercept(context('bouncer_diff_release'), async () => {
        now += 40;
        throw failure;
      });
    } catch (error) {
      caught = true;
      assert.equal(error, failure);
    }
    assert.equal(caught, true);
  }
  const snapshot = metrics.snapshot();
  assert.deepEqual(snapshot.tools.bouncer_diff_release, {
    calls: 3, errors: 3, latencyMs: { p50: 40, p95: 40, samples: 3 },
  });
  assert.deepEqual(snapshot.verdicts, { ALLOW: 0, REVIEW: 0, BLOCK: 0 });
  assert.ok(!JSON.stringify(snapshot).includes('private-'));
});

test('manifest counts its top-level verdict once and ignores nested or unrecognized verdicts', async () => {
  const metrics = new MetricsService();
  const interceptor = new MetricsInterceptor(metrics);
  for (const result of [
    { verdict: 'REVIEW', dependencies: [{ verdict: 'BLOCK' }, { verdict: 'ALLOW' }] },
    { dependencies: [{ verdict: 'BLOCK' }] },
    { verdict: 'APPROVE' },
    null,
  ]) {
    assert.equal(await interceptor.intercept(context('bouncer_check_manifest'), async () => result), result);
  }
  assert.deepEqual(metrics.snapshot().verdicts, { ALLOW: 0, REVIEW: 1, BLOCK: 0 });
});

test('metrics collection failures cannot replace a successful result or original tool error', async t => {
  const metrics = new MetricsService();
  t.mock.method(metrics, 'record', () => { throw new Error('metrics failed'); });
  const interceptor = new MetricsInterceptor(metrics);
  const result = { verdict: 'ALLOW' };
  assert.equal(await interceptor.intercept(context('bouncer_check_package'), async () => result), result);
  const failure = new Error('tool failed');
  await assert.rejects(interceptor.intercept(context('bouncer_check_package'), async () => { throw failure; }),
    error => error === failure);
});

test('metrics bound latency history to the last 200 calls while retaining lifetime totals', () => {
  const metrics = new MetricsService();
  for (let i = 1; i <= 250; i++) metrics.record('bouncer_check_package', i, false, { verdict: 'ALLOW' });
  for (let i = 0; i < 1000; i++) metrics.record(`untrusted-${i}`, 1, false);
  const snapshot = metrics.snapshot();
  assert.equal(Object.keys(snapshot.tools).length, 7);
  assert.deepEqual(snapshot.tools.bouncer_check_package, {
    calls: 250, errors: 0, latencyMs: { p50: 150, p95: 240, samples: 200 },
  });
  assert.equal(snapshot.verdicts.ALLOW, 250);
  snapshot.verdicts.ALLOW = 0;
  snapshot.tools.bouncer_check_package.calls = 0;
  assert.equal(metrics.snapshot().verdicts.ALLOW, 250);
  assert.equal(metrics.snapshot().tools.bouncer_check_package.calls, 250);
});

test('stats resource exposes live aggregate metrics, uptime, start time and package version only', async t => {
  let now = 0;
  t.mock.method(performance, 'now', () => now);
  const metrics = new MetricsService();
  const resources = buildResources(new BouncerResources(new IncidentsService(), metrics));
  const stats = resources.find(resource => resource.uri === 'bouncer://stats')!;
  assert.ok(stats);
  const first = await stats.fetch(context(''));
  assert.equal(first.type, 'json');
  metrics.record('bouncer_check_package', 12, false, { verdict: 'BLOCK', request: 'private-request' });
  now = 2000;
  const second = await stats.fetch(context(''));
  assert.equal(second.type, 'json');
  const body = second.data as ReturnType<MetricsService['snapshot']>;
  assert.deepEqual(Object.keys(body).sort(), ['startedAt', 'uptimeSeconds', 'version', 'tools', 'verdicts'].sort());
  assert.equal(body.uptimeSeconds, 2);
  assert.ok(Number.isFinite(Date.parse(body.startedAt)));
  assert.equal(body.version, JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version);
  assert.deepEqual(Object.keys(body.tools).sort(), [...BOUNCER_TOOL_NAMES].sort());
  assert.equal(body.tools.bouncer_check_package.calls, 1);
  assert.equal(body.verdicts.BLOCK, 1);
  assert.equal((first.data as typeof body).tools.bouncer_check_package.calls, 0);
  assert.ok(!JSON.stringify(second).includes('private-'));
});
