import { createHash } from 'node:crypto';
import { Injectable } from '@nitrostack/core';
import type { Assessment } from '../../domain/types.js';
import { ApiGuardConfig } from './config.service.js';

interface GitHubPullRequest {
  number: number;
  html_url: string;
  draft: boolean;
  merged: boolean;
  head: { ref: string; sha: string };
  base: { ref: string };
}

interface MigrationFile {
  path: string;
  proposedContent: string;
  expectedSourceHash: string;
}

export interface CreateDraftPullRequestInput {
  assessment: Assessment;
  repository: string;
  files: MigrationFile[];
  title?: string;
  idempotencyKey: string;
}

export interface GetPinnedMigrationSourcesInput {
  assessment: Assessment;
  repository: string;
  paths?: string[];
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safePath(filePath: string): string {
  const normalized = filePath.replaceAll('\\', '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..') || normalized.startsWith('.git/')) {
    throw new Error(`Unsafe migration file path: ${filePath}`);
  }
  return normalized;
}

@Injectable({ deps: [ApiGuardConfig] })
export class PrPublisherService {
  constructor(private readonly config: ApiGuardConfig) {}

  async getPinnedMigrationSources(input: GetPinnedMigrationSourcesInput) {
    const repository = input.repository.toLowerCase();
    this.assertRepositoryAllowed(repository);
    if (!this.config.githubToken) throw new Error('GITHUB_TOKEN is required to read pinned migration sources.');
    if (input.assessment.decisionStatus !== 'BLOCKED_PENDING_MIGRATION') {
      throw new Error('Pinned migration sources require a BLOCKED_PENDING_MIGRATION assessment.');
    }

    const pinnedSha = input.assessment.repositoryCommits[repository]
      ?? Object.entries(input.assessment.repositoryCommits)
        .find(([name]) => name.toLowerCase() === repository)?.[1];
    if (!pinnedSha || !/^[a-f0-9]{7,64}$/i.test(pinnedSha)) {
      throw new Error(`Assessment has no valid pinned commit for ${repository}.`);
    }

    const impactedPaths = new Set(
      input.assessment.evidence
        .filter((item) => ['CONFIRMED_IMPACT', 'LIKELY_IMPACT'].includes(item.classification))
        .filter((item) => item.repository.toLowerCase() === repository)
        .map((item) => item.filePath.replaceAll('\\', '/'))
    );
    const selectedPaths = (input.paths?.length ? input.paths : [...impactedPaths]).map(safePath);
    if (!selectedPaths.length) throw new Error(`Assessment has no confirmed or likely impacted files for ${repository}.`);

    const files = [];
    for (const filePath of selectedPaths) {
      if (!impactedPaths.has(filePath)) {
        throw new Error(`File ${filePath} is not confirmed or likely impacted evidence for ${repository}.`);
      }
      const current = await this.github<{ content?: string; encoding?: string }>(
        'GET',
        `/repos/${repository}/contents/${filePath.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(pinnedSha)}`
      );
      if (current.encoding !== 'base64' || typeof current.content !== 'string') {
        throw new Error(`Unable to read pinned source file ${filePath}.`);
      }
      const sourceContent = Buffer.from(current.content.replace(/\s/g, ''), 'base64').toString('utf8');
      if (Buffer.byteLength(sourceContent, 'utf8') > 200_000) {
        throw new Error(`Pinned source file ${filePath} exceeds the 200 KB migration limit.`);
      }
      files.push({
        path: filePath,
        sourceContent,
        expectedSourceHash: sha256(sourceContent)
      });
    }

    return {
      assessmentId: input.assessment.id,
      repository,
      pinnedSourceCommit: pinnedSha,
      files,
      nextAction: 'Prepare complete proposedContent for each file, then call create_migration_pull_requests.'
    };
  }

  async publish(assessment: Assessment, prUrl: string, idempotencyKey: string) {
    this.assertWritesEnabled();
    const parsed = this.parsePullRequestUrl(prUrl);
    this.assertRepositoryAllowed(parsed.repository);
    const marker = `<!-- apiguard:${idempotencyKey} -->`;

    const pull = await this.github<GitHubPullRequest>(
      'GET',
      `/repos/${parsed.repository}/pulls/${parsed.number}`
    );
    if (pull.merged) throw new Error('Cannot publish an assessment to an already merged pull request.');

    const comments = await this.github<Array<{ id: number; html_url: string; body: string }>>(
      'GET',
      `/repos/${parsed.repository}/issues/${parsed.number}/comments?per_page=100`
    );
    const existing = comments.find((comment) => comment.body.includes(marker));
    if (existing) {
      return {
        publishedId: String(existing.id),
        prUrl: pull.html_url,
        commentUrl: existing.html_url,
        idempotencyKey,
        idempotentReplay: true
      };
    }

    const comment = await this.github<{ id: number; html_url: string }>(
      'POST',
      `/repos/${parsed.repository}/issues/${parsed.number}/comments`,
      { body: `${this.assessmentSummary(assessment)}\n\n${marker}` }
    );
    return {
      publishedId: String(comment.id),
      prUrl: pull.html_url,
      commentUrl: comment.html_url,
      idempotencyKey,
      idempotentReplay: false
    };
  }

  async createDraftPullRequest(input: CreateDraftPullRequestInput) {
    this.assertWritesEnabled();
    const repository = input.repository.toLowerCase();
    this.assertRepositoryAllowed(repository);
    if (input.assessment.decisionStatus !== 'BLOCKED_PENDING_MIGRATION') {
      throw new Error('A migration pull request requires a BLOCKED_PENDING_MIGRATION assessment.');
    }
    if (!input.files.length) throw new Error('At least one migration file is required.');

    const pinnedSha = input.assessment.repositoryCommits[repository]
      ?? Object.entries(input.assessment.repositoryCommits)
        .find(([name]) => name.toLowerCase() === repository)?.[1];
    if (!pinnedSha || !/^[a-f0-9]{7,64}$/i.test(pinnedSha)) {
      throw new Error(`Assessment has no valid pinned commit for ${repository}.`);
    }

    const [owner] = repository.split('/');
    const repo = await this.github<{ default_branch: string }>('GET', `/repos/${repository}`);
    const branchSuffix = sha256(`${input.assessment.id}:${input.idempotencyKey}`).slice(0, 12);
    const branch = `${this.config.fixBranchPrefix}/${input.assessment.id}-${branchSuffix}`;

    const existingPulls = await this.github<GitHubPullRequest[]>(
      'GET',
      `/repos/${repository}/pulls?state=all&head=${encodeURIComponent(`${owner}:${branch}`)}`
    );
    if (existingPulls[0]) {
      const existing = await this.github<GitHubPullRequest>(
        'GET',
        `/repos/${repository}/pulls/${existingPulls[0].number}`
      );
      if (!existing.draft || existing.merged) {
        throw new Error(`Existing idempotent PR #${existing.number} is no longer an open draft.`);
      }
      const existingCommit = await this.github<{ parents: Array<{ sha: string }> }>(
        'GET',
        `/repos/${repository}/git/commits/${existing.head.sha}`
      );
      if (!existingCommit.parents.some((parent) => parent.sha === pinnedSha)) {
        throw new Error(`Existing idempotent PR #${existing.number} is not based on the assessment-pinned commit.`);
      }
      return this.pullResult(existing, repository, pinnedSha, true);
    }

    const impactedPaths = new Set(
      input.assessment.evidence
        .filter((item) => ['CONFIRMED_IMPACT', 'LIKELY_IMPACT'].includes(item.classification))
        .filter((item) => item.repository.toLowerCase() === repository)
        .map((item) => item.filePath.replaceAll('\\', '/'))
    );
    const files = input.files.map((file) => ({ ...file, path: safePath(file.path) }));
    for (const file of files) {
      if (!impactedPaths.has(file.path)) {
        throw new Error(`File ${file.path} is not confirmed or likely impacted evidence for ${repository}.`);
      }
      const current = await this.github<{ content?: string; encoding?: string }>(
        'GET',
        `/repos/${repository}/contents/${file.path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(pinnedSha)}`
      );
      if (current.encoding !== 'base64' || typeof current.content !== 'string') {
        throw new Error(`Unable to validate pinned source file ${file.path}.`);
      }
      const source = Buffer.from(current.content.replace(/\s/g, ''), 'base64').toString('utf8');
      if (sha256(source) !== file.expectedSourceHash.toLowerCase()) {
        throw new Error(`Pinned source hash mismatch for ${file.path}.`);
      }
    }

    const commit = await this.github<{ tree: { sha: string } }>('GET', `/repos/${repository}/git/commits/${pinnedSha}`);
    const treeEntries = [];
    for (const file of files) {
      const blob = await this.github<{ sha: string }>('POST', `/repos/${repository}/git/blobs`, {
        content: file.proposedContent,
        encoding: 'utf-8'
      });
      treeEntries.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const tree = await this.github<{ sha: string }>('POST', `/repos/${repository}/git/trees`, {
      base_tree: commit.tree.sha,
      tree: treeEntries
    });
    const migrationCommit = await this.github<{ sha: string }>('POST', `/repos/${repository}/git/commits`, {
      message: `fix: migrate consumers for ${input.assessment.id}`,
      tree: tree.sha,
      parents: [pinnedSha]
    });
    await this.github('POST', `/repos/${repository}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: migrationCommit.sha
    });

    let pull: GitHubPullRequest;
    try {
      pull = await this.github<GitHubPullRequest>('POST', `/repos/${repository}/pulls`, {
        title: input.title ?? `APIGuard migration for ${input.assessment.scenarioId}`,
        head: branch,
        base: repo.default_branch,
        body: `${this.assessmentSummary(input.assessment)}\n\nPinned source commit: \`${pinnedSha}\`\n\nIdempotency key: \`${input.idempotencyKey}\``,
        draft: true
      });
    } catch (error) {
      await this.github('DELETE', `/repos/${repository}/git/refs/heads/${branch}`).catch(() => undefined);
      throw error;
    }
    if (!pull.draft) throw new Error(`GitHub created PR #${pull.number} without draft=true; manual review required.`);
    return this.pullResult(pull, repository, pinnedSha, false);
  }

  private pullResult(pull: GitHubPullRequest, repository: string, pinnedSha: string, replay: boolean) {
    return {
      repository,
      pullRequestNumber: pull.number,
      pullRequestUrl: pull.html_url,
      draft: pull.draft,
      merged: pull.merged,
      branch: pull.head.ref,
      headSha: pull.head.sha,
      baseBranch: pull.base.ref,
      pinnedSourceCommit: pinnedSha,
      idempotentReplay: replay
    };
  }

  private assessmentSummary(assessment: Assessment): string {
    return [
      `## APIGuard Release Assessment: ${assessment.overallSeverity}`,
      `**Status:** ${assessment.analysisStatus}`,
      `**Decision:** ${assessment.decisionStatus}`,
      '',
      `- Semantic changes: ${assessment.changes.length}`,
      `- Confirmed impacts: ${assessment.evidence.filter((item) => item.classification === 'CONFIRMED_IMPACT').length}`,
      `- Likely impacts: ${assessment.evidence.filter((item) => item.classification === 'LIKELY_IMPACT').length}`
    ].join('\n');
  }

  private parsePullRequestUrl(value: string): { repository: string; number: number } {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'github.com') throw new Error('Only https://github.com pull request URLs are allowed.');
    const match = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/.exec(url.pathname);
    if (!match) throw new Error('Expected a canonical GitHub pull request URL.');
    return { repository: `${match[1]}/${match[2]}`.toLowerCase(), number: Number(match[3]) };
  }

  private assertWritesEnabled(): void {
    if (!this.config.githubWriteEnabled) throw new Error('GitHub writes are disabled. Set APIGUARD_GITHUB_WRITE_ENABLED=true explicitly.');
    if (!this.config.githubToken) throw new Error('GITHUB_TOKEN is required for GitHub writes.');
  }

  private assertRepositoryAllowed(repository: string): void {
    if (!this.config.writableRepositories.includes(repository.toLowerCase())) {
      throw new Error(`Repository ${repository} is not in APIGUARD_WRITABLE_REPOSITORIES.`);
    }
  }

  private async github<T = Record<string, unknown>>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.config.githubApiBaseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.config.githubToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'api-larp-apiguard'
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300).replace(this.config.githubToken, '***');
      throw new Error(`GitHub API ${method} ${endpoint} failed (${response.status}): ${detail}`);
    }
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  }
}
