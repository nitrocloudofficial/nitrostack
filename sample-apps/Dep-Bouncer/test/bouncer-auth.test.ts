import { test, TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { ApiKeyModule, ExecutionContext } from '@nitrostack/core';
import { BouncerApiKeyGuard } from '../src/modules/observability/api-key.guard.js';

function guardFor(t: TestContext, raw?: string): BouncerApiKeyGuard {
  const previous = process.env.DEP_BOUNCER_API_KEYS;
  const previousConfig = ApiKeyModule.getConfig();
  if (raw === undefined) delete process.env.DEP_BOUNCER_API_KEYS;
  else process.env.DEP_BOUNCER_API_KEYS = raw;
  t.after(() => {
    if (previous === undefined) delete process.env.DEP_BOUNCER_API_KEYS;
    else process.env.DEP_BOUNCER_API_KEYS = previous;
    ApiKeyModule.forRoot(previousConfig);
  });
  return new BouncerApiKeyGuard();
}

const context = (metadata?: ExecutionContext['metadata']): ExecutionContext => ({
  requestId: 'test', metadata,
  logger: { info() {}, debug() {}, warn() {}, error() {} },
});

test('auth is open when DEP_BOUNCER_API_KEYS is unset', async t => {
  const guard = guardFor(t);
  const ctx = context();
  assert.equal(await guard.canActivate(ctx), true);
  assert.equal(ctx.auth, undefined);
});

test('empty configuration keeps the demo open', async t => {
  assert.equal(await guardFor(t, '').canActivate(context()), true);
});

test('configured keys reject missing, invalid and non-string credentials with clear errors', async t => {
  const guard = guardFor(t, ' first-secret, second-secret , ');
  for (const metadata of [undefined, {}, { apiKey: '' }, { apiKey: ['first-secret'] }]) {
    await assert.rejects(guard.canActivate(context(metadata)), /API key required/);
  }
  await assert.rejects(guard.canActivate(context({ apiKey: 'wrong-key' })), /Invalid API key/);
  await assert.rejects(guard.canActivate(context({ apiKey: ' first-secret' })), /Invalid API key/);
  assert.deepEqual(ApiKeyModule.getKeys(), [ApiKeyModule.hashKey('first-secret'), ApiKeyModule.hashKey('second-secret')]);
});

test('each configured key works via MCP apiKey or x-api-key metadata without exposing the key in auth', async t => {
  const guard = guardFor(t, ' first-secret, second-secret ');
  for (const metadata of [{ apiKey: 'first-secret' }, { 'x-api-key': 'second-secret' }]) {
    const ctx = context(metadata);
    assert.equal(await guard.canActivate(ctx), true);
    assert.deepEqual(ctx.auth, { authenticated: true, subject: 'dep-bouncer-api-key', scopes: ['bouncer:tools'] });
    assert.ok(!JSON.stringify(ctx.auth).includes('secret'));
  }
});

test('nonempty configuration with no usable keys fails closed', async t => {
  const guard = guardFor(t, ' , , ');
  await assert.rejects(guard.canActivate(context({ apiKey: 'anything' })), /Invalid API key/);
});
