import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, test } from 'node:test';
import type { Assessment } from '../../src/domain/types.js';
import { ApiGuardConfig } from '../../src/modules/apiguard/config.service.js';
import { PrPublisherService } from '../../src/modules/apiguard/pr-publisher.service.js';

after(() => {
  setTimeout(() => process.exit(0), 10);
});

function assessment(): Assessment {
  return {
    id: 'asm_12345678', scenarioId: 'risky', analysisStatus: 'COMPLETE',
    decisionStatus: 'BLOCKED_PENDING_MIGRATION', baselineSpecHash: 'b', candidateSpecHash: 'c',
    repositoryCommits: { 'demo/consumer': 'abcdef1234567890' }, sourceMode: 'live',
    classifierMode: 'deterministic-fallback', repositoryScopeVersion: 1,
    coverage: { repositoriesExpected: 1, repositoriesChecked: 1, repositoriesFailed: 0, ratio: 1 },
    changes: [], evidence: [{
      id: 'ev_1', changeSemanticKey: 'change', consumerImpactKey: 'impact', evidenceFingerprint: 'fingerprint',
      sourceMode: 'live', capturedAt: '2026-07-26T00:00:00.000Z', repository: 'demo/consumer',
      branch: 'main', commitSha: 'abcdef1234567890', searchQuery: 'name', relatedChangeIds: [],
      filePath: 'src/client.ts', lineStart: 1, lineEnd: 1, snippet: 'response.name', contentHash: 'snippet',
      classification: 'CONFIRMED_IMPACT', confidence: 'HIGH', matchedChangeIds: [], reasoning: 'confirmed', migrationActions: []
    }], overallSeverity: 'HIGH', limitations: [], durationMs: 1,
    createdAt: '2026-07-26T00:00:00.000Z', updatedAt: '2026-07-26T00:00:00.000Z',
    version: 2, policyEvaluations: []
  };
}

test('GitHub publishing is disabled by default', async () => {
  const config = new ApiGuardConfig();
  const service = new PrPublisherService(config);
  await assert.rejects(
    service.publish(assessment(), 'https://github.com/demo/consumer/pull/1', 'idempotent-key'),
    /GitHub writes are disabled/
  );
});

test('publishes a real idempotent GitHub PR comment and returns GitHub URLs', async () => {
  const originalFetch = globalThis.fetch;
  const old = {
    enabled: process.env.APIGUARD_GITHUB_WRITE_ENABLED,
    repos: process.env.APIGUARD_WRITABLE_REPOSITORIES,
    token: process.env.GITHUB_TOKEN,
    base: process.env.GITHUB_API_BASE_URL
  };
  process.env.APIGUARD_GITHUB_WRITE_ENABLED = 'true';
  process.env.APIGUARD_WRITABLE_REPOSITORIES = 'demo/consumer';
  process.env.GITHUB_TOKEN = 'test-token';
  process.env.GITHUB_API_BASE_URL = 'https://github.test';
  const calls: Array<{ url: string; method: string }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ url, method });
    if (url.endsWith('/pulls/7')) return Response.json({ number: 7, html_url: 'https://github.com/demo/consumer/pull/7', draft: true, merged: false, head: { ref: 'feature', sha: 'abc' }, base: { ref: 'main' } });
    if (url.includes('/comments?')) return Response.json([]);
    if (url.endsWith('/comments') && method === 'POST') return Response.json({ id: 99, html_url: 'https://github.com/demo/consumer/pull/7#issuecomment-99' });
    return new Response('unexpected', { status: 500 });
  }) as typeof fetch;

  try {
    const result = await new PrPublisherService(new ApiGuardConfig()).publish(
      assessment(), 'https://github.com/demo/consumer/pull/7', 'idempotent-key'
    );
    assert.equal(result.publishedId, '99');
    assert.equal(result.commentUrl, 'https://github.com/demo/consumer/pull/7#issuecomment-99');
    assert.equal(result.idempotentReplay, false);
    assert.deepEqual(calls.map((call) => call.method), ['GET', 'GET', 'POST']);
  } finally {
    globalThis.fetch = originalFetch;
    if (old.enabled === undefined) delete process.env.APIGUARD_GITHUB_WRITE_ENABLED; else process.env.APIGUARD_GITHUB_WRITE_ENABLED = old.enabled;
    if (old.repos === undefined) delete process.env.APIGUARD_WRITABLE_REPOSITORIES; else process.env.APIGUARD_WRITABLE_REPOSITORIES = old.repos;
    if (old.token === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = old.token;
    if (old.base === undefined) delete process.env.GITHUB_API_BASE_URL; else process.env.GITHUB_API_BASE_URL = old.base;
  }
});

test('creates a draft migration PR from the assessment-pinned commit', async () => {
  const originalFetch = globalThis.fetch;
  const old = {
    enabled: process.env.APIGUARD_GITHUB_WRITE_ENABLED,
    repos: process.env.APIGUARD_WRITABLE_REPOSITORIES,
    token: process.env.GITHUB_TOKEN,
    base: process.env.GITHUB_API_BASE_URL
  };
  process.env.APIGUARD_GITHUB_WRITE_ENABLED = 'true';
  process.env.APIGUARD_WRITABLE_REPOSITORIES = 'demo/consumer';
  process.env.GITHUB_TOKEN = 'test-token';
  process.env.GITHUB_API_BASE_URL = 'https://github.test';
  const source = 'export const name = response.name;\n';
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: typeof init?.body === 'string' ? init.body : undefined });
    if (url.endsWith('/repos/demo/consumer')) return Response.json({ default_branch: 'main' });
    if (url.includes('/pulls?state=all')) return Response.json([]);
    if (url.includes('/contents/src/client.ts')) return Response.json({ encoding: 'base64', content: Buffer.from(source).toString('base64') });
    if (url.includes('/git/commits/abcdef1234567890') && method === 'GET') return Response.json({ tree: { sha: 'tree-base' } });
    if (url.endsWith('/git/blobs')) return Response.json({ sha: 'blob-new' });
    if (url.endsWith('/git/trees')) return Response.json({ sha: 'tree-new' });
    if (url.endsWith('/git/commits') && method === 'POST') return Response.json({ sha: 'commit-new' });
    if (url.endsWith('/git/refs')) return Response.json({ ref: 'created' });
    if (url.endsWith('/pulls') && method === 'POST') return Response.json({
      number: 8,
      html_url: 'https://github.com/demo/consumer/pull/8',
      draft: true,
      merged: false,
      head: { ref: 'apiguard/asm_12345678-branch', sha: 'commit-new' },
      base: { ref: 'main' }
    });
    return new Response(`unexpected ${method} ${url}`, { status: 500 });
  }) as typeof fetch;

  try {
    const result = await new PrPublisherService(new ApiGuardConfig()).createDraftPullRequest({
      assessment: assessment(), repository: 'demo/consumer', idempotencyKey: 'migration-key',
      files: [{
        path: 'src/client.ts',
        proposedContent: 'export const name = response.fullName;\n',
        expectedSourceHash: createHash('sha256').update(source).digest('hex')
      }]
    });
    assert.equal(result.pullRequestUrl, 'https://github.com/demo/consumer/pull/8');
    assert.equal(result.draft, true);
    assert.equal(result.merged, false);
    assert.equal(result.pinnedSourceCommit, 'abcdef1234567890');
    const prRequest = calls.find((call) => call.url.endsWith('/pulls') && call.method === 'POST');
    assert.equal(JSON.parse(prRequest!.body!).draft, true);
    const commitRequest = calls.find((call) => call.url.endsWith('/git/commits') && call.method === 'POST');
    assert.deepEqual(JSON.parse(commitRequest!.body!).parents, ['abcdef1234567890']);
  } finally {
    globalThis.fetch = originalFetch;
    if (old.enabled === undefined) delete process.env.APIGUARD_GITHUB_WRITE_ENABLED; else process.env.APIGUARD_GITHUB_WRITE_ENABLED = old.enabled;
    if (old.repos === undefined) delete process.env.APIGUARD_WRITABLE_REPOSITORIES; else process.env.APIGUARD_WRITABLE_REPOSITORIES = old.repos;
    if (old.token === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = old.token;
    if (old.base === undefined) delete process.env.GITHUB_API_BASE_URL; else process.env.GITHUB_API_BASE_URL = old.base;
  }
});

test('reads complete pinned impacted sources and returns the guarded source hash', async () => {
  const originalFetch = globalThis.fetch;
  const old = {
    repos: process.env.APIGUARD_WRITABLE_REPOSITORIES,
    token: process.env.GITHUB_TOKEN,
    base: process.env.GITHUB_API_BASE_URL
  };
  process.env.APIGUARD_WRITABLE_REPOSITORIES = 'demo/consumer';
  process.env.GITHUB_TOKEN = 'test-token';
  process.env.GITHUB_API_BASE_URL = 'https://github.test';
  const source = 'export const name = response.name;\n';
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('/contents/src/client.ts')) {
      return Response.json({ encoding: 'base64', content: Buffer.from(source).toString('base64') });
    }
    return new Response(`unexpected ${url}`, { status: 500 });
  }) as typeof fetch;

  try {
    const result = await new PrPublisherService(new ApiGuardConfig()).getPinnedMigrationSources({
      assessment: assessment(),
      repository: 'demo/consumer'
    });
    assert.equal(result.pinnedSourceCommit, 'abcdef1234567890');
    assert.equal(result.files.length, 1);
    assert.equal(result.files[0]!.path, 'src/client.ts');
    assert.equal(result.files[0]!.sourceContent, source);
    assert.equal(result.files[0]!.expectedSourceHash, createHash('sha256').update(source).digest('hex'));
  } finally {
    globalThis.fetch = originalFetch;
    if (old.repos === undefined) delete process.env.APIGUARD_WRITABLE_REPOSITORIES; else process.env.APIGUARD_WRITABLE_REPOSITORIES = old.repos;
    if (old.token === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = old.token;
    if (old.base === undefined) delete process.env.GITHUB_API_BASE_URL; else process.env.GITHUB_API_BASE_URL = old.base;
  }
});

test('idempotent replay re-fetches the full PR and verifies pinned ancestry', async () => {
  const originalFetch = globalThis.fetch;
  const old = {
    enabled: process.env.APIGUARD_GITHUB_WRITE_ENABLED,
    repos: process.env.APIGUARD_WRITABLE_REPOSITORIES,
    token: process.env.GITHUB_TOKEN,
    base: process.env.GITHUB_API_BASE_URL
  };
  process.env.APIGUARD_GITHUB_WRITE_ENABLED = 'true';
  process.env.APIGUARD_WRITABLE_REPOSITORIES = 'demo/consumer';
  process.env.GITHUB_TOKEN = 'test-token';
  process.env.GITHUB_API_BASE_URL = 'https://github.test';
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/repos/demo/consumer')) return Response.json({ default_branch: 'main' });
    if (url.includes('/pulls?state=all')) return Response.json([{ number: 8 }]);
    if (url.endsWith('/pulls/8')) return Response.json({
      number: 8, html_url: 'https://github.com/demo/consumer/pull/8', draft: true, merged: false,
      head: { ref: 'apiguard/existing', sha: 'commit-existing' }, base: { ref: 'main' }
    });
    if (url.endsWith('/git/commits/commit-existing')) return Response.json({ parents: [{ sha: 'abcdef1234567890' }] });
    return new Response('unexpected', { status: 500 });
  }) as typeof fetch;

  try {
    const result = await new PrPublisherService(new ApiGuardConfig()).createDraftPullRequest({
      assessment: assessment(), repository: 'demo/consumer', idempotencyKey: 'migration-key',
      files: [{ path: 'src/client.ts', proposedContent: 'updated', expectedSourceHash: '0'.repeat(64) }]
    });
    assert.equal(result.pullRequestNumber, 8);
    assert.equal(result.draft, true);
    assert.equal(result.merged, false);
    assert.equal(result.idempotentReplay, true);
    assert.ok(calls.some((url) => url.endsWith('/pulls/8')));
    assert.ok(calls.some((url) => url.endsWith('/git/commits/commit-existing')));
  } finally {
    globalThis.fetch = originalFetch;
    if (old.enabled === undefined) delete process.env.APIGUARD_GITHUB_WRITE_ENABLED; else process.env.APIGUARD_GITHUB_WRITE_ENABLED = old.enabled;
    if (old.repos === undefined) delete process.env.APIGUARD_WRITABLE_REPOSITORIES; else process.env.APIGUARD_WRITABLE_REPOSITORIES = old.repos;
    if (old.token === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = old.token;
    if (old.base === undefined) delete process.env.GITHUB_API_BASE_URL; else process.env.GITHUB_API_BASE_URL = old.base;
  }
});
