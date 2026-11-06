import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RegistryHealthCheck } from '../src/health/registry.health.js';
import { OsvHealthCheck } from '../src/health/osv.health.js';

for (const Check of [RegistryHealthCheck, OsvHealthCheck]) {
  test(`${Check.name}: successful response is up with measured latency and correct request`, async t => {
    let now = 1_000;
    t.mock.method(Date, 'now', () => now);
    const check = new Check();
    check.fetchImpl = async (url, init) => {
      assert.ok(init?.signal instanceof AbortSignal);
      assert.equal(init.signal.aborted, false);
      if (check instanceof RegistryHealthCheck) {
        assert.equal(url, 'https://registry.npmjs.org/-/ping');
        assert.equal(init.method, 'GET');
      } else {
        assert.equal(url, 'https://api.osv.dev/v1/query');
        assert.equal(init.method, 'POST');
        assert.deepEqual(init.headers, { 'content-type': 'application/json' });
        assert.deepEqual(JSON.parse(init.body as string), {
          package: { name: 'lodash', ecosystem: 'npm' }, version: '4.17.20',
        });
      }
      now += 25;
      return new Response('{}', { status: 200 });
    };
    const result = await check.check();
    assert.equal(result.status, 'up');
    assert.deepEqual(result.details, { latencyMs: 25 });
  });

  test(`${Check.name}: latency above 2000ms is degraded`, async t => {
    let now = 0;
    t.mock.method(Date, 'now', () => now);
    const check = new Check();
    check.fetchImpl = async () => {
      now += 2_001;
      return new Response('{}');
    };
    assert.equal((await check.check()).status, 'degraded');
    check.fetchImpl = async () => {
      now += 2_000;
      return new Response('{}');
    };
    assert.equal((await check.check()).status, 'up');
  });

  test(`${Check.name}: non-200 responses and fetch errors return down without throwing`, async () => {
    const check = new Check();
    for (const status of [201, 503]) {
      check.fetchImpl = async () => new Response('{}', { status });
      const result = await check.check();
      assert.equal(result.status, 'down');
      assert.match(result.message!, new RegExp(`HTTP ${status}`));
    }
    for (const reason of [new Error('offline'), new DOMException('timed out', 'TimeoutError'), 'fixture error']) {
      check.fetchImpl = async () => { throw reason; };
      const result = await check.check();
      assert.equal(result.status, 'down');
      assert.ok(result.message!.includes(reason instanceof Error ? reason.message : reason));
    }
  });
}

test('OSV rejects invalid JSON and includes body parsing in latency', async t => {
  const check = new OsvHealthCheck();
  check.fetchImpl = async () => new Response('not JSON');
  const invalid = await check.check();
  assert.equal(invalid.status, 'down');
  assert.match(invalid.message!, /health check failed/);

  let now = 0;
  t.mock.method(Date, 'now', () => now);
  check.fetchImpl = async () => {
    const response = new Response('{}');
    response.json = async () => { now += 2_001; return {}; };
    return response;
  };
  assert.equal((await check.check()).status, 'degraded');
});
