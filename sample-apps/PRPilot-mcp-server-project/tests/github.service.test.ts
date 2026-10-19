import test from 'node:test';
import assert from 'node:assert/strict';
import { GitHubService } from '../src/modules/pull-request/github.service.js';

test('GitHubService: handles valid pull request response', async () => {
  const mockFetch: typeof fetch = async (url) => {
    return {
      ok: true,
      status: 200,
      headers: new Headers({
        'x-ratelimit-remaining': '4999',
        'x-ratelimit-reset': '1800000000',
      }),
      json: async () => ({
        title: 'feat: add awesome feature',
        body: 'Closes #10',
        user: { login: 'octocat', avatar_url: 'https://example.com/avatar.png' },
        state: 'open',
        draft: false,
        base: { ref: 'main' },
        head: { ref: 'feat/test', sha: '1234567890abcdef' },
        created_at: '2026-10-17T00:00:00Z',
        updated_at: '2026-10-17T01:00:00Z',
        changed_files: 3,
        additions: 50,
        deletions: 5,
        html_url: 'https://github.com/octocat/hello-world/pull/42',
      }),
    } as any;
  };

  const service = new GitHubService(undefined, mockFetch);
  const pr = await service.getPullRequest('octocat', 'hello-world', 42);

  assert.equal(pr.title, 'feat: add awesome feature');
  assert.equal(pr.user.login, 'octocat');
  assert.equal(pr.additions, 50);
});

test('GitHubService: handles 404 not found cleanly', async () => {
  const mockFetch: typeof fetch = async () => {
    return {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(),
      json: async () => ({ message: 'Not Found' }),
    } as any;
  };

  const service = new GitHubService(undefined, mockFetch);
  await assert.rejects(
    async () => service.getPullRequest('nonexistent', 'repo', 999),
    /GitHub resource not found at/
  );
});

test('GitHubService: handles 403 rate limit exceeded cleanly', async () => {
  const mockFetch: typeof fetch = async () => {
    return {
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers({
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '1800000000',
      }),
      json: async () => ({ message: 'API rate limit exceeded' }),
    } as any;
  };

  const service = new GitHubService(undefined, mockFetch);
  await assert.rejects(
    async () => service.getPullRequest('octocat', 'hello-world', 1),
    /GitHub API rate limit exceeded/
  );
});

test('GitHubService: handles commit check runs and fallback on error', async () => {
  const mockFetch: typeof fetch = async (url) => {
    if (String(url).includes('check-runs')) {
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          total_count: 1,
          check_runs: [
            {
              name: 'ci/test',
              status: 'completed',
              conclusion: 'success',
              html_url: 'https://example.com/check',
            },
          ],
        }),
      } as any;
    }
    return {
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => ({}),
    } as any;
  };

  const service = new GitHubService(undefined, mockFetch);
  const checkRuns = await service.getCommitCheckRuns('octocat', 'hello-world', 'sha123');
  assert.equal(checkRuns.total_count, 1);
  assert.equal(checkRuns.check_runs[0].conclusion, 'success');

  const statuses = await service.getCommitStatuses('octocat', 'hello-world', 'sha123');
  assert.deepEqual(statuses, []);
});
