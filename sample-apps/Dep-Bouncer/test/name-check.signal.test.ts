import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NameCheckSignal } from '../src/modules/analysis/signals/name-check.signal.js';
import type { AnalysisContext } from '../src/modules/analysis/signal.js';

function context(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
  return {
    name: 'expresss', target: { name: 'expresss', version: '1.0.0', dist: { tarball: '' } },
    baseline: [], time: { created: new Date().toISOString() }, loadFiles: async () => new Map(),
    weeklyDownloads: 12, ...overrides,
  };
}

test('flags a new low-download look-alike as high', async () => {
  const [finding] = await new NameCheckSignal().evaluate(context());
  assert.equal(finding?.severity, 'high');
  assert.equal(finding?.weight, 35);
  assert.match(finding?.evidence[0] ?? '', /looks like express/);
});

test('reports an established look-alike as info', async () => {
  const old = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
  const [finding] = await new NameCheckSignal().evaluate(context({ weeklyDownloads: 20_000, time: { created: old } }));
  assert.equal(finding?.severity, 'info');
  assert.equal(finding?.weight, 0);
});

test('returns no finding for an ordinary exact package name', async () => {
  assert.deepEqual(await new NameCheckSignal().evaluate(context({ name: 'express' })), []);
});
