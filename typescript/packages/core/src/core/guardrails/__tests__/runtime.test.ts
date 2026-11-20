import { describe, it, expect, jest } from '@jest/globals';
import { CachedPolicyProvider, InMemoryPolicySource, chainIdentity } from '../index.js';
import type { Policy, PolicySource } from '../index.js';
import type { ExecutionContext } from '../../types.js';

const policy = (version: number, value = 5, tenantId = 't1'): Policy => ({
  schemaVersion: 1, id: 'p', tenantId, version, defaultEffect: 'deny',
  rules: [{ id: 'cap', effect: 'allow', all: [{ field: 'n', op: 'lte', value }] }],
});

describe('CachedPolicyProvider', () => {
  it('caches until TTL, then reloads', async () => {
    let now = 0;
    const source = { load: jest.fn(async () => policy(1)) };
    const cache = new CachedPolicyProvider(source, { ttlMs: 100, now: () => now });
    await cache.getActive('t1', 'p');
    await cache.getActive('t1', 'p');
    expect(source.load).toHaveBeenCalledTimes(1);
    now = 101;
    await cache.getActive('t1', 'p');
    expect(source.load).toHaveBeenCalledTimes(2);
  });

  it('shares one load between concurrent misses', async () => {
    let release!: () => void;
    const gate = new Promise<void>(r => { release = r; });
    const source = { load: jest.fn(async () => { await gate; return policy(1); }) };
    const cache = new CachedPolicyProvider(source);
    const all = Promise.all([cache.getActive('t1', 'p'), cache.getActive('t1', 'p'), cache.getActive('t1', 'p')]);
    release();
    await all;
    expect(source.load).toHaveBeenCalledTimes(1);
  });

  it('picks up a pushed change on the next call and reports it', async () => {
    const source = new InMemoryPolicySource();
    source.set(policy(1));
    const onChange = jest.fn();
    const cache = new CachedPolicyProvider(source, { ttlMs: 60_000, onChange });
    expect((await cache.getActive('t1', 'p')).version).toBe(1);
    source.set(policy(2, 8));
    expect((await cache.getActive('t1', 'p')).version).toBe(2);
    expect(onChange).toHaveBeenLastCalledWith({ tenantId: 't1', policyId: 'p', from: 1, to: 2 });
  });

  it('never goes back to an older version', async () => {
    let next = policy(3);
    const cache = new CachedPolicyProvider({ load: async () => next }, { ttlMs: 0 });
    expect((await cache.getActive('t1', 'p')).version).toBe(3);
    next = policy(2);
    expect((await cache.getActive('t1', 'p')).version).toBe(3);
  });

  it('serves last-known-good during an outage, then fails closed', async () => {
    let now = 0;
    let down = false;
    const onError = jest.fn();
    const source: PolicySource = { load: async () => { if (down) throw new Error('db down'); return policy(1); } };
    const cache = new CachedPolicyProvider(source, { ttlMs: 10, maxStaleMs: 100, now: () => now, onError });
    await cache.getActive('t1', 'p');
    down = true;
    now = 50;
    expect((await cache.getActive('t1', 'p')).version).toBe(1);
    now = 101;
    await expect(cache.getActive('t1', 'p')).rejects.toThrow('Policy unavailable');
    expect(onError).toHaveBeenCalled();
  });

  it('rejects invalid or off-catalog policies and keeps the last valid one', async () => {
    let next: Policy = policy(1);
    const cache = new CachedPolicyProvider({ load: async () => next }, { ttlMs: 0, catalog: { p: ['n'] } });
    await cache.getActive('t1', 'p');
    next = { ...policy(2), rules: [{ id: 'x', effect: 'allow', all: [{ field: 'other', op: 'eq', value: 1 }] }] };
    expect((await cache.getActive('t1', 'p')).version).toBe(1);
    await expect(new CachedPolicyProvider({ load: async () => next }, { catalog: { p: ['n'] } }).getActive('t1', 'p'))
      .rejects.toThrow('Policy unavailable');
  });

  it('denies when the policy is removed', async () => {
    const source = new InMemoryPolicySource();
    source.set(policy(1));
    const cache = new CachedPolicyProvider(source);
    await cache.getActive('t1', 'p');
    source.delete('t1', 'p');
    await expect(cache.getActive('t1', 'p')).rejects.toThrow('Policy unavailable');
  });

  it('does not treat a load that raced an invalidation as fresh', async () => {
    let release!: () => void;
    let version = 1;
    const source = { load: jest.fn(async () => { const v = version; if (v === 1) await new Promise<void>(r => { release = r; }); return policy(v); }) };
    const cache = new CachedPolicyProvider(source, { ttlMs: 60_000 });
    const first = cache.getActive('t1', 'p');
    await Promise.resolve();
    version = 2;
    cache.invalidate('t1', 'p');
    release();
    expect((await first).version).toBe(1);
    expect((await cache.getActive('t1', 'p')).version).toBe(2);
  });

  it('returns frozen copies', async () => {
    const cache = new CachedPolicyProvider({ load: async () => policy(1) });
    const p = await cache.getActive('t1', 'p');
    expect(Object.isFrozen(p.rules[0].all[0])).toBe(true);
  });
});

describe('chainIdentity', () => {
  const ctx = {} as ExecutionContext;
  it('returns the first recognised identity and skips throwing resolvers', async () => {
    const resolve = chainIdentity([
      () => { throw new Error('boom'); },
      () => null,
      () => ({ principalId: 'u', tenantId: 't', scopes: [], source: 'jwt' }),
      () => ({ principalId: 'never', tenantId: 't', scopes: [], source: 'demo' }),
    ]);
    expect(await resolve(ctx)).toMatchObject({ principalId: 'u', source: 'jwt' });
    expect(await chainIdentity([() => null])(ctx)).toBeNull();
  });
});
