import test from 'node:test';
import assert from 'node:assert/strict';
import { PullRequestTools } from '../src/modules/pull-request/pull-request.tools.js';

test('PullRequestTools: inspectPullRequest returns conforming typed metadata', async () => {
  const tools = new PullRequestTools();
  (tools as any).github = {
    getPullRequest: async () => ({
      title: 'feat: add tools',
      body: 'Closes #5',
      user: { login: 'ayushv7', avatar_url: 'https://example.com/avatar' },
      state: 'open',
      draft: false,
      base: { ref: 'master' },
      head: { ref: 'feat/tools', sha: 'abcdef1234567890' },
      created_at: '2026-10-17T00:00:00Z',
      updated_at: '2026-10-17T00:00:00Z',
      changed_files: 2,
      additions: 40,
      deletions: 5,
      html_url: 'https://github.com/ayushv7/PRPilot/pull/1',
    }),
  };

  const mockCtx = { logger: { info: () => {}, error: () => {}, warn: () => {} } } as any;
  const result = await tools.inspectPullRequest({ owner: 'ayushv7', repo: 'PRPilot', pull_number: 1 }, mockCtx);

  assert.equal(result.owner, 'ayushv7');
  assert.equal(result.repo, 'PRPilot');
  assert.equal(result.number, 1);
  assert.equal(result.author, 'ayushv7');
  assert.equal(result.state, 'open');
  assert.equal(result.base_branch, 'master');
});

test('PullRequestTools: assembleReviewDossier builds full review dossier', async () => {
  const tools = new PullRequestTools();
  (tools as any).github = {
    getPullRequest: async () => ({
      title: 'fix: handle token expiration',
      body: 'Fixes #42',
      user: { login: 'ayushv7' },
      state: 'open',
      draft: false,
      base: { ref: 'master' },
      head: { ref: 'fix/tokens', sha: '1122334455667788' },
      created_at: '2026-10-17T00:00:00Z',
      updated_at: '2026-10-17T00:00:00Z',
      changed_files: 2,
      additions: 15,
      deletions: 2,
      html_url: 'https://github.com/ayushv7/PRPilot/pull/2',
    }),
    getPullRequestFiles: async () => [
      {
        filename: 'src/auth/token.ts',
        status: 'modified',
        additions: 10,
        deletions: 2,
        changes: 12,
        patch: 'const jwt = sign(token);',
      },
      {
        filename: 'tests/auth/token.test.ts',
        status: 'modified',
        additions: 5,
        deletions: 0,
        changes: 5,
        patch: 'expect(verify(token)).toBe(true);',
      },
    ],
    getPullRequestCommits: async () => [
      { commit: { message: 'fix(auth): prevent expired tokens (#42)' } },
    ],
    getCommitCheckRuns: async () => ({
      total_count: 1,
      check_runs: [
        {
          name: 'CI / Test',
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://ci.example.com/run/1',
        },
      ],
    }),
    getCommitStatuses: async () => [],
    getIssue: async () => ({
      title: 'Token expires prematurely',
      state: 'open',
      html_url: 'https://github.com/ayushv7/PRPilot/issues/42',
    }),
  };

  const mockCtx = { logger: { info: () => {}, error: () => {}, warn: () => {} } } as any;
  const dossier = await tools.assembleReviewDossier({ owner: 'ayushv7', repo: 'PRPilot', pull_number: 2 }, mockCtx);

  assert.equal(dossier.pr.number, 2);
  assert.equal(dossier.verification.summary.overall_status, 'passing');
  assert.ok(dossier.reviewer_route.length >= 3);
  assert.ok(dossier.review_signals.some((s) => s.code === 'SIG_AUTH_SECURITY'));
  assert.equal(dossier.linked_context.explicit_issue_references[0].number, 42);
  assert.equal(dossier.linked_context.explicit_issue_references[0].title, 'Token expires prematurely');
});

test('PullRequestTools: getHeuristicCatalog returns reference catalog resource', async () => {
  const tools = new PullRequestTools();
  const mockCtx = { logger: { info: () => {}, error: () => {}, warn: () => {} } } as any;
  const catalog = await tools.getHeuristicCatalog(mockCtx);

  assert.ok(Array.isArray(catalog), 'Catalog should be an array');
  assert.ok(catalog.length >= 7, 'Catalog should contain all 7 core signals');
  assert.ok(catalog.some((c) => c.code === 'SIG_AUTH_SECURITY'));
  assert.ok(catalog.some((c) => c.code === 'SIG_UNTESTED_LOGIC'));
});

test('PullRequestTools: getReviewPrompt returns structured MCP prompt template', async () => {
  const tools = new PullRequestTools();
  const mockCtx = { logger: { info: () => {}, error: () => {}, warn: () => {} } } as any;
  const promptResult = await tools.getReviewPrompt(
    { owner: 'facebook', repo: 'react', pull_number: 31000 },
    mockCtx
  );

  assert.ok(promptResult.messages && promptResult.messages.length > 0);
  assert.equal(promptResult.messages[0].role, 'user');
  assert.match(promptResult.messages[0].content.text, /facebook\/react/);
  assert.match(promptResult.messages[0].content.text, /31000/);
});
