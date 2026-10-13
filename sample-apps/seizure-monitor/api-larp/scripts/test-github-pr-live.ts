import 'dotenv/config';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { Assessment } from '../src/domain/types.js';
import { ApiGuardConfig } from '../src/modules/apiguard/config.service.js';
import { PrPublisherService } from '../src/modules/apiguard/pr-publisher.service.js';

const repository = process.env.APIGUARD_LIVE_TEST_REPOSITORY ?? 'arckrisofficial/apiguard-react-consumer';
const configuredPinnedSha = process.env.APIGUARD_LIVE_TEST_BASE_SHA;

if (!configuredPinnedSha || !/^[a-f0-9]{40}$/i.test(configuredPinnedSha)) {
  throw new Error('APIGUARD_LIVE_TEST_BASE_SHA must be the full 40-character disposable repository commit SHA.');
}
const pinnedSha: string = configuredPinnedSha;

const reactMigration = { filePath: 'src/consumer.js', proposedContent: `// React consumer migrated for User API v1.1
// id is now a string, name was replaced by optional fullName, and status includes suspended.

export async function fetchUser(userId) {
  const res = await fetch(\`/api/user?id=\${userId}\`);
  const data = await res.json();

  const { id, fullName, status, email } = data;
  if (typeof id !== 'string') {
    throw new Error('Expected string user id from /api/user');
  }

  const displayName = fullName ?? 'Unknown user';
  document.getElementById('user-name').textContent = displayName;

  const statusBadge = {
    active: '🟢',
    inactive: '🔴',
    suspended: '🟡'
  }[status] ?? '⚪';
  document.getElementById('user-status').textContent = \`\${statusBadge} \${status}\`;

  return { id, name: displayName, status, email };
}

export function renderUserCard(user) {
  return \`
    <div class="user-card" data-user-id="\${user.id}">
      <h2>\${user.name}</h2>
      <span class="status-badge">\${user.status}</span>
    </div>
  \`;
}
` };

const pythonMigration = { filePath: 'src/consumer.py', proposedContent: `"""Python consumer migrated for User API v1.1."""
import requests

API_BASE = "https://api.example.com"


def fetch_user(user_id: str) -> dict:
    response = requests.get(f"{API_BASE}/api/user", params={"id": user_id})
    response.raise_for_status()
    data = response.json()
    if not isinstance(data.get("id"), str):
        raise TypeError(f"Expected string id, got {type(data['id'])}")
    return data


def get_user_display_name(user: dict) -> str:
    return user.get("fullName") or "Unknown user"


def get_user_status(user: dict) -> str:
    status = user.get("status")
    if status not in ("active", "inactive", "suspended"):
        raise ValueError(f"Unexpected status value: {status}")
    return status


def build_user_report(user_id: str) -> str:
    user = fetch_user(user_id)
    name = get_user_display_name(user)
    status = get_user_status(user).upper()
    return f"User #{user['id']} - {name} [{status}]"
` };

const migration = repository.endsWith('/apiguard-python-consumer') ? pythonMigration : reactMigration;
const { filePath, proposedContent } = migration;

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function github<T>(config: ApiGuardConfig, endpoint: string): Promise<T> {
  const response = await fetch(`${config.githubApiBaseUrl}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${config.githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'api-larp-live-pr-verification'
    }
  });
  if (!response.ok) throw new Error(`GitHub verification failed (${response.status}): ${(await response.text()).slice(0, 200)}`);
  return await response.json() as T;
}

async function main() {
  const config = new ApiGuardConfig();
  assert.equal(config.githubWriteEnabled, true, 'GitHub writes must be explicitly enabled for this live test.');
  assert.ok(config.writableRepositories.includes(repository.toLowerCase()), 'The disposable repository must be exactly allow-listed.');
  assert.ok(config.githubToken, 'GITHUB_TOKEN is required.');

  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  const sourcePayload = await github<{ encoding: string; content: string }>(
    config,
    `/repos/${repository}/contents/${encodedPath}?ref=${pinnedSha}`
  );
  assert.equal(sourcePayload.encoding, 'base64');
  const source = Buffer.from(sourcePayload.content.replace(/\s/g, ''), 'base64').toString('utf8');

  const assessment: Assessment = {
    id: `asm_live_${pinnedSha.slice(0, 12)}`,
    scenarioId: 'risky',
    analysisStatus: 'COMPLETE',
    decisionStatus: 'BLOCKED_PENDING_MIGRATION',
    baselineSpecHash: 'live-test-baseline',
    candidateSpecHash: 'live-test-candidate',
    repositoryCommits: { [repository]: pinnedSha },
    sourceMode: 'live',
    classifierMode: 'deterministic-fallback',
    repositoryScopeVersion: 1,
    coverage: { repositoriesExpected: 1, repositoriesChecked: 1, repositoriesFailed: 0, ratio: 1 },
    changes: [],
    evidence: [{
      id: 'ev_live_react_consumer', changeSemanticKey: 'user-v1.1', consumerImpactKey: 'react-consumer',
      evidenceFingerprint: hash(source), sourceMode: 'live', capturedAt: new Date().toISOString(),
      repository, branch: 'main', commitSha: pinnedSha, searchQuery: 'name', relatedChangeIds: [],
      filePath, lineStart: 1, lineEnd: source.split(/\r?\n/).length, snippet: source,
      contentHash: hash(source), classification: 'CONFIRMED_IMPACT', confidence: 'HIGH',
      matchedChangeIds: [], reasoning: 'The demo consumer directly uses fields changed by User API v1.1.', migrationActions: []
    }],
    overallSeverity: 'HIGH', limitations: [], durationMs: 0,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 2, policyEvaluations: []
  };

  const service = new PrPublisherService(config);
  const request = {
    assessment,
    repository,
    files: [{ path: filePath, proposedContent, expectedSourceHash: hash(source) }],
    title: `APIGuard: migrate ${repository.split('/').at(-1)} to User API v1.1`,
    idempotencyKey: `live-${repository.split('/').at(-1)}-${pinnedSha.slice(0, 12)}`
  };
  const first = await service.createDraftPullRequest(request);
  const replay = await service.createDraftPullRequest(request);

  const pull = await github<{ draft: boolean; merged: boolean; head: { sha: string }; base: { ref: string } }>(
    config,
    `/repos/${repository}/pulls/${first.pullRequestNumber}`
  );
  const repo = await github<{ default_branch: string }>(config, `/repos/${repository}`);
  const defaultRef = await github<{ object: { sha: string } }>(
    config,
    `/repos/${repository}/git/ref/heads/${encodeURIComponent(repo.default_branch)}`
  );

  assert.equal(first.draft, true);
  assert.equal(first.merged, false);
  assert.equal(pull.draft, true);
  assert.equal(pull.merged, false);
  assert.equal(first.pinnedSourceCommit, pinnedSha);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.pullRequestNumber, first.pullRequestNumber);
  assert.equal(defaultRef.object.sha, pinnedSha, 'Default branch changed during draft PR creation.');

  console.log(JSON.stringify({
    repository,
    pinnedSourceCommit: pinnedSha,
    pullRequestNumber: first.pullRequestNumber,
    pullRequestUrl: first.pullRequestUrl,
    draft: pull.draft,
    merged: pull.merged,
    baseBranch: pull.base.ref,
    headSha: pull.head.sha,
    defaultBranchUnchanged: defaultRef.object.sha === pinnedSha,
    idempotentReplay: replay.idempotentReplay
  }, null, 2));
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
);
