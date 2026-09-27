import { Injectable } from '@nitrostack/core';
import type { ManagedRepository, RepositoryScope } from '../../domain/repository-scope.js';
import { ApiGuardConfig } from './config.service.js';
import { RepositoryScopeRepository } from './repository-scope.repository.js';

export interface AddInput {
  owner: string;
  repository: string;
  branch?: string;
  reason: string;
  actorId: string;
}

export interface RemoveInput {
  owner: string;
  repository: string;
  reason: string;
  actorId: string;
}

export interface ScopeChangeResult {
  changed: boolean;
  action: 'ADD' | 'REMOVE';
  repository: Pick<ManagedRepository, 'owner' | 'name' | 'branch' | 'lastKnownCommitSha' | 'status'>;
  scope: { version: number; activeCount: number; totalCount: number };
  snapshotStatus?: 'STALE';
  historicalEvidencePreserved?: true;
  message: string;
}

export interface RefreshResult {
  refreshed: number;
  failed: Array<{ owner: string; name: string; error: string }>;
  scope: { version: number };
}

@Injectable({ deps: [ApiGuardConfig, RepositoryScopeRepository] })
export class RepositoryScopeService {
  constructor(
    private readonly config: ApiGuardConfig,
    private readonly registry: RepositoryScopeRepository
  ) {
    void this.bootstrapIfEmpty();
  }

  // ── Public API ───────────────────────────────────────────────────────────

  getScope(): RepositoryScope {
    return this.registry.getScope();
  }

  listActive(): ManagedRepository[] {
    return this.registry.listActive();
  }

  async applyAdd(input: AddInput): Promise<ScopeChangeResult> {
    this.validateOwner(input.owner);
    this.validateName(input.repository);

    const existing = this.registry.find(input.owner, input.repository);
    const isActive = existing?.status === 'ACTIVE';

    if (!isActive) {
      this.enforceCapacity();
    }

    const { defaultBranch, commitSha } = await this.resolveGitHubMeta(
      input.owner,
      input.repository,
      input.branch
    );

    if (isActive && existing?.branch === defaultBranch && existing?.lastKnownCommitSha === commitSha) {
      const scope = this.registry.getScope();
      const active = scope.repositories.filter((r) => r.status === 'ACTIVE').length;
      return {
        changed: false,
        action: 'ADD',
        repository: { owner: existing.owner, name: existing.name, branch: existing.branch, lastKnownCommitSha: existing.lastKnownCommitSha, status: 'ACTIVE' },
        scope: { version: scope.version, activeCount: active, totalCount: scope.repositories.length },
        snapshotStatus: 'STALE',
        message: `${input.owner}/${input.repository} is already ACTIVE and pinned to the latest commit. No changes made.`
      };
    }

    const now = new Date().toISOString();
    const managed: ManagedRepository = {
      id: '',
      owner: input.owner,
      name: input.repository,
      branch: defaultBranch,
      lastKnownCommitSha: commitSha,
      status: 'ACTIVE',
      addedAt: existing?.addedAt ?? now,
      addedBy: input.actorId,
      removedAt: undefined,
      removalReason: undefined,
    };

    const scope = this.registry.upsert(managed);
    const active = scope.repositories.filter((r) => r.status === 'ACTIVE').length;

    return {
      changed: true,
      action: 'ADD',
      repository: { owner: managed.owner, name: managed.name, branch: managed.branch, lastKnownCommitSha: managed.lastKnownCommitSha, status: 'ACTIVE' },
      scope: { version: scope.version, activeCount: active, totalCount: scope.repositories.length },
      snapshotStatus: 'STALE',
      message: `${input.owner}/${input.repository} is now ACTIVE in the assessment scope. Run refresh_repository_evidence to collect evidence.`
    };
  }

  async applyRemove(input: RemoveInput): Promise<ScopeChangeResult> {
    this.validateName(input.repository);

    const existing = this.registry.find(input.owner, input.repository);
    if (!existing) throw new Error(`Repository ${input.owner}/${input.repository} is not in the scope registry.`);

    if (existing.status === 'INACTIVE') {
      // Idempotent — already removed
      const scope = this.registry.getScope();
      const active = scope.repositories.filter((r) => r.status === 'ACTIVE').length;
      return {
        changed: false,
        action: 'REMOVE',
        repository: { owner: existing.owner, name: existing.name, branch: existing.branch, lastKnownCommitSha: existing.lastKnownCommitSha, status: 'INACTIVE' },
        scope: { version: scope.version, activeCount: active, totalCount: scope.repositories.length },
        historicalEvidencePreserved: true,
        message: `${input.owner}/${input.repository} was already INACTIVE. No change made.`
      };
    }

    const now = new Date().toISOString();
    const updated: ManagedRepository = {
      ...existing,
      status: 'INACTIVE',
      removedAt: now,
      removalReason: input.reason
    };

    const scope = this.registry.upsert(updated);
    const active = scope.repositories.filter((r) => r.status === 'ACTIVE').length;

    return {
      changed: true,
      action: 'REMOVE',
      repository: { owner: updated.owner, name: updated.name, branch: updated.branch, lastKnownCommitSha: updated.lastKnownCommitSha, status: 'INACTIVE' },
      scope: { version: scope.version, activeCount: active, totalCount: scope.repositories.length },
      historicalEvidencePreserved: true,
      message: `${input.owner}/${input.repository} is now INACTIVE. It will not be included in future assessments. Historical evidence is preserved.`
    };
  }

  async refreshCommitShas(subset?: string[]): Promise<RefreshResult> {
    const active = this.registry.listActive();
    const targets = subset && subset.length > 0
      ? active.filter((r) => subset.includes(`${r.owner}/${r.name}`))
      : active;

    let refreshed = 0;
    const failed: RefreshResult['failed'] = [];

    for (const repo of targets) {
      try {
        const { commitSha, defaultBranch } = await this.resolveGitHubMeta(repo.owner, repo.name, repo.branch);
        this.registry.upsert({ ...repo, lastKnownCommitSha: commitSha, branch: defaultBranch });
        refreshed++;
      } catch (err) {
        failed.push({ owner: repo.owner, name: repo.name, error: String(err instanceof Error ? err.message : err) });
      }
    }

    return { refreshed, failed, scope: { version: this.registry.getScope().version } };
  }

  async bootstrapIfEmpty(): Promise<void> {
    if (!this.registry.isEmpty()) return;
    if (!this.config.githubToken || !this.config.bootstrapGithubOwner) return;

    const repos = this.config.githubRepositories;
    for (const name of repos) {
      try {
        const { defaultBranch, commitSha } = await this.resolveGitHubMeta(this.config.bootstrapGithubOwner, name);
        const now = new Date().toISOString();
        this.registry.upsert({
          id: '',
          owner: this.config.bootstrapGithubOwner,
          name,
          branch: defaultBranch,
          lastKnownCommitSha: commitSha,
          status: 'ACTIVE',
          addedAt: now,
          addedBy: 'bootstrap'
        });
      } catch {
        // Graceful — bootstrap failure should not crash startup
      }
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private validateOwner(owner: string): void {
    if (this.config.allowedGithubOwners.length > 0 && !this.config.allowedGithubOwners.includes(owner)) {
      throw new Error(
        `Owner "${owner}" is outside the allowed scope. Allowed: ${this.config.allowedGithubOwners.join(', ')}.`
      );
    }
  }

  private validateName(name: string): void {
    if (!/^[A-Za-z0-9_.-]+$/.test(name)) {
      throw new Error(`Repository name "${name}" contains invalid characters.`);
    }
  }

  private enforceCapacity(): void {
    const activeCount = this.registry.listActive().length;
    if (activeCount >= this.config.maxActiveRepositories) {
      throw new Error(
        `Maximum active repository limit (${this.config.maxActiveRepositories}) reached. Remove a repository first.`
      );
    }
  }

  private async resolveGitHubMeta(
    owner: string,
    repository: string,
    preferredBranch?: string
  ): Promise<{ defaultBranch: string; commitSha: string }> {
    if (!this.config.githubToken) {
      throw new Error('GITHUB_TOKEN is required to validate repositories.');
    }

    const gh = async (path: string): Promise<Record<string, unknown>> => {
      const res = await fetch(`https://api.github.com${path}`, {
        headers: {
          Authorization: `Bearer ${this.config.githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'api-larp-nitrostack-hackathon'
        }
      });
      if (res.status === 404) throw new Error(`Repository ${owner}/${repository} was not found or is not accessible.`);
      if (!res.ok) throw new Error(`GitHub API ${res.status} for ${owner}/${repository}.`);
      return res.json() as Promise<Record<string, unknown>>;
    };

    const repoPayload = await gh(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`);

    if (repoPayload.private === true) {
      throw new Error(`Repository ${owner}/${repository} is private. Only public repositories are supported.`);
    }

    const defaultBranch = preferredBranch ?? String(repoPayload.default_branch ?? 'main');
    const commitPayload = await gh(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/commits/${encodeURIComponent(defaultBranch)}`
    );
    const commitSha = String(commitPayload.sha ?? '');
    if (!commitSha) throw new Error(`GitHub did not return a commit SHA for ${owner}/${repository}.`);

    return { defaultBranch, commitSha };
  }
}
