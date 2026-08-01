import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiKeyModule, type ExecutionContext } from '@nitrostack/core';
import {
  AgentApiKeyGuard,
  DEMO_IDENTITY,
  assignDemoIdentity,
  demoModeEnabled,
} from './agent-api-key.guard.js';
import {
  AGENT_KEY_PREFIX,
  collectAgentKeys,
  isPlaceholderKey,
} from './agent-keys.js';

const testKey = 'ag_test_only_not_a_real_secret';

function createContext(
  overrides: Partial<ExecutionContext> = {},
): ExecutionContext {
  return {
    requestId: 'test-request',
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
    metadata: {},
    ...overrides,
  };
}

test('API key guard rejects missing and invalid credentials', async () => {
  ApiKeyModule.forRoot({
    keys: [testKey],
    keysEnvPrefix: 'BOULDERSGATE_TEST_KEY_THAT_DOES_NOT_EXIST',
    metadataField: 'apiKey',
  });
  const guard = new AgentApiKeyGuard();

  assert.equal(await guard.canActivate(createContext()), false);
  assert.equal(
    await guard.canActivate(
      createContext({ metadata: { apiKey: 'definitely-invalid' } }),
    ),
    false,
  );
});

test('API key guard creates an opaque, stable agent identity', async () => {
  ApiKeyModule.forRoot({
    keys: [testKey],
    keysEnvPrefix: 'BOULDERSGATE_TEST_KEY_THAT_DOES_NOT_EXIST',
    metadataField: 'apiKey',
  });
  const guard = new AgentApiKeyGuard();
  const first = createContext({ metadata: { apiKey: testKey } });
  const second = createContext({ metadata: { apiKey: testKey } });

  assert.equal(await guard.canActivate(first), true);
  assert.equal(await guard.canActivate(second), true);
  assert.match(first.auth?.subject ?? '', /^agent_[0-9a-f]{16}$/);
  assert.equal(first.auth?.subject, second.auth?.subject);
  assert.equal(first.auth?.subject?.includes(testKey), false);
});

test('demo mode is off unless explicitly enabled', () => {
  // The failure that matters is a deployment left open by accident, so anything
  // other than an explicit "true" must keep authentication mandatory.
  assert.equal(demoModeEnabled({}), false);
  assert.equal(demoModeEnabled({ BOULDERSGATE_DEMO_NO_AUTH: '' }), false);
  assert.equal(demoModeEnabled({ BOULDERSGATE_DEMO_NO_AUTH: 'false' }), false);
  assert.equal(demoModeEnabled({ BOULDERSGATE_DEMO_NO_AUTH: '1' }), false);
  assert.equal(demoModeEnabled({ BOULDERSGATE_DEMO_NO_AUTH: 'yes' }), false);

  assert.equal(demoModeEnabled({ BOULDERSGATE_DEMO_NO_AUTH: 'true' }), true);
  assert.equal(demoModeEnabled({ BOULDERSGATE_DEMO_NO_AUTH: ' TRUE ' }), true);
});

test('the demo identity is shared and carries no key material', () => {
  const first = createContext();
  const second = createContext();
  assignDemoIdentity(first);
  assignDemoIdentity(second);

  assert.equal(first.auth?.subject, DEMO_IDENTITY);
  // Callers are indistinguishable under demo mode — that is the cost of it, and
  // asserting it here keeps the tradeoff from being forgotten.
  assert.equal(first.auth?.subject, second.auth?.subject);
});

test('named per-agent key variables are actually loaded', () => {
  // Fixtures are full-length secrets because short values are rejected as
  // placeholders; this test is about variable naming and trimming, not length.
  const demoKey = 'd'.repeat(64);
  const ciKey = 'c'.repeat(64);
  const keys = collectAgentKeys({
    [`${AGENT_KEY_PREFIX}_DEMO`]: demoKey,
    [`${AGENT_KEY_PREFIX}_CI`]: `  ${ciKey}  `,
    [`${AGENT_KEY_PREFIX}_EMPTY`]: '',
    UNRELATED_KEY: 'ignore-me',
    NITRO_LOG_LEVEL: 'info',
  });

  // Sorted by variable name: _CI before _DEMO. Whitespace is trimmed, because a
  // key pasted into a dashboard field frequently carries some.
  assert.deepEqual(keys, [ciKey, demoKey]);
});

test('documented placeholder values never become live credentials', () => {
  // `.env.example` ships these strings publicly. A deployment that copies the
  // example without editing must deny every request rather than authenticate
  // anyone who can read the repository.
  assert.equal(
    isPlaceholderKey('replace-with-a-random-64-char-hex-string'),
    true,
  );
  assert.equal(isPlaceholderKey('replace-with-a-different-random-string'), true);
  assert.equal(isPlaceholderKey('changeme'), true);
  assert.equal(isPlaceholderKey('short'), true);

  // A real 32-byte hex secret must still load.
  assert.equal(isPlaceholderKey('a'.repeat(64)), false);

  const keys = collectAgentKeys({
    [`${AGENT_KEY_PREFIX}_DEMO`]: 'replace-with-a-random-64-char-hex-string',
    [`${AGENT_KEY_PREFIX}_REAL`]: 'b'.repeat(64),
  });
  assert.deepEqual(keys, ['b'.repeat(64)]);
});

test('a server configured only with placeholders denies every request', async () => {
  // The dangerous end state is an "authenticated" server that accepts a value
  // published in the example file, so assert the guard actually refuses it.
  const placeholder = 'replace-with-a-random-64-char-hex-string';
  ApiKeyModule.forRoot({
    keys: collectAgentKeys({
      [`${AGENT_KEY_PREFIX}_DEMO`]: placeholder,
    }),
    keysEnvPrefix: 'BOULDERSGATE_TEST_KEY_THAT_DOES_NOT_EXIST',
    metadataField: 'apiKey',
  });
  const guard = new AgentApiKeyGuard();

  assert.equal(
    await guard.canActivate(createContext({ metadata: { apiKey: placeholder } })),
    false,
  );
});

test('the framework env reader cannot re-admit a filtered placeholder', async () => {
  // `ApiKeyModule.getKeys()` concatenates the configured `keys` with whatever it
  // reads from `keysEnvPrefix` (`PREFIX_1`, ... and a bare `PREFIX`). Those
  // values skip `collectAgentKeys()` entirely, so a placeholder left in the
  // environment would authenticate despite being filtered out of `keys`.
  // app.module.ts pins `keysEnvPrefix: undefined` to close that path.
  const placeholder = 'replace-with-a-random-64-char-hex-string';
  const previousBare = process.env[AGENT_KEY_PREFIX];
  const previousNumbered = process.env[`${AGENT_KEY_PREFIX}_1`];
  process.env[AGENT_KEY_PREFIX] = placeholder;
  process.env[`${AGENT_KEY_PREFIX}_1`] = placeholder;

  try {
    ApiKeyModule.forRoot({
      keys: collectAgentKeys({}),
      keysEnvPrefix: undefined,
      metadataField: 'apiKey',
    });
    const guard = new AgentApiKeyGuard();

    assert.equal(
      await guard.canActivate(
        createContext({ metadata: { apiKey: placeholder } }),
      ),
      false,
      'a placeholder in the environment must never authenticate',
    );

    // The same value is still refused when the prefix reader is left enabled
    // only because nothing valid is configured; assert the enabled-prefix case
    // really does admit it, so this test fails loudly if the config regresses.
    ApiKeyModule.forRoot({
      keys: collectAgentKeys({}),
      keysEnvPrefix: AGENT_KEY_PREFIX,
      metadataField: 'apiKey',
    });
    assert.equal(
      await new AgentApiKeyGuard().canActivate(
        createContext({ metadata: { apiKey: placeholder } }),
      ),
      true,
      'this documents the bypass that keysEnvPrefix: undefined prevents',
    );
  } finally {
    if (previousBare === undefined) {
      delete process.env[AGENT_KEY_PREFIX];
    } else {
      process.env[AGENT_KEY_PREFIX] = previousBare;
    }
    if (previousNumbered === undefined) {
      delete process.env[`${AGENT_KEY_PREFIX}_1`];
    } else {
      process.env[`${AGENT_KEY_PREFIX}_1`] = previousNumbered;
    }
  }
});

test('a named key variable authenticates end to end', async () => {
  // The regression that matters: this is the path a deployment uses, and the
  // guard denied every request while the credential looked correctly set.
  const previous = process.env[`${AGENT_KEY_PREFIX}_DEPLOYED`];
  process.env[`${AGENT_KEY_PREFIX}_DEPLOYED`] = testKey;
  try {
    ApiKeyModule.forRoot({
      keys: collectAgentKeys(),
      keysEnvPrefix: AGENT_KEY_PREFIX,
      metadataField: 'apiKey',
    });
    const guard = new AgentApiKeyGuard();
    const context = createContext({ metadata: { apiKey: testKey } });

    assert.equal(await guard.canActivate(context), true);
  } finally {
    if (previous === undefined) {
      delete process.env[`${AGENT_KEY_PREFIX}_DEPLOYED`];
    } else {
      process.env[`${AGENT_KEY_PREFIX}_DEPLOYED`] = previous;
    }
  }
});
