import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TtlCache } from '../src/modules/registry/ttl-cache.js';

test('byte budget evicts completed LRU values and skips oversized values', async () => {
  const cache = new TtlCache<string>(60_000, 10, { maxBytes: 6, sizeOf: value => value.length });
  try {
    await cache.get('a', async () => 'aaa');
    await cache.get('b', async () => 'bbb');
    await cache.get('a', async () => assert.fail('cached'));
    await cache.get('c', async () => 'ccc');
    assert.equal(await cache.get('a', async () => assert.fail('LRU hit')), 'aaa');
    assert.equal(await cache.get('b', async () => 'new'), 'new');
    assert.equal(await cache.get('large', async () => '1234567'), '1234567');
    assert.equal(await cache.get('large', async () => 'fresh'), 'fresh');
  } finally { cache.clear(); }
});

test('pending loads survive eviction pressure and TTL expiration; failures are not cached', async () => {
  const cache = new TtlCache<string>(1, 1);
  let release!: (value: string) => void;
  let loads = 0;
  const pending = cache.get('pending', () => { loads++; return new Promise(resolve => { release = resolve; }); });
  await cache.get('other', async () => 'other');
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(cache.get('pending', async () => assert.fail('duplicate load')), pending);
  release('ready');
  assert.equal(await pending, 'ready');
  assert.equal(loads, 1);
  await assert.rejects(cache.get('error', async () => { throw new Error('failed'); }), /failed/);
  assert.equal(await cache.get('error', async () => 'retry'), 'retry');
  cache.clear();
});

test('completed cache values obey the entry cap independently of byte budget', async () => {
  const cache = new TtlCache<string>(60_000, 1, { maxBytes: 100, sizeOf: value => value.length });
  await cache.get('a', async () => 'a');
  await cache.get('b', async () => 'b');
  assert.equal(await cache.get('a', async () => 'reloaded'), 'reloaded');
  cache.clear();
});

test('expired entries release retained values on access and in an unref periodic sweep', async () => {
  const cache = new TtlCache<string>(10, 2);
  await cache.get('old', async () => 'old');
  const internals = cache as unknown as { entries: Map<string, unknown>; sweep?: NodeJS.Timeout };
  assert.equal(internals.sweep?.hasRef(), false);
  await new Promise(resolve => setTimeout(resolve, 35));
  assert.equal(internals.entries.size, 0);
  assert.equal(internals.sweep, undefined);
  assert.equal(await cache.get('old', async () => 'new'), 'new');
  cache.clear();
});

test('clear prevents a pending load from repopulating the cache', async () => {
  const cache = new TtlCache<string>(60_000, 1);
  let release!: (value: string) => void;
  const pending = cache.get('key', () => new Promise(resolve => { release = resolve; }));
  await Promise.resolve();
  cache.clear();
  release('old');
  assert.equal(await pending, 'old');
  assert.equal(await cache.get('key', async () => 'new'), 'new');
  cache.clear();
});
