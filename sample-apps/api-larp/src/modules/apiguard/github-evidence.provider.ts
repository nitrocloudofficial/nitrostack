import { randomUUID } from 'node:crypto';
import { Injectable } from '@nitrostack/core';
import type { EvidenceSnapshotResult, EvidenceSnapshotV2 } from '../../domain/evidence-snapshot.js';
import { sha256 } from '../../domain/hash.js';
import type { ApiChange, EvidenceItem } from '../../domain/types.js';
import { ApiGuardConfig } from './config.service.js';
import type { EvidenceDiscoveryResult, EvidenceProvider } from './evidence.provider.js';
import { queriesForChanges } from './evidence.provider.js';
import { RepositoryScopeRepository } from './repository-scope.repository.js';

interface CachedValue {
  expiresAt: number;
  value: EvidenceDiscoveryResult;
  snapshot: EvidenceSnapshotV2;
}

@Injectable({ deps: [ApiGuardConfig, RepositoryScopeRepository] })
export class GitHubEvidenceProvider implements EvidenceProvider {
  private readonly cache = new Map<string, CachedValue>();

  constructor(
    private readonly config: ApiGuardConfig,
    private readonly scopeRepository: RepositoryScopeRepository
  ) {}

  async discover(scenarioId: string, changes: ApiChange[]): Promise<EvidenceDiscoveryResult> {
    const { result } = await this.discoverSnapshot(scenarioId, changes);
    return result;
  }

  async discoverSnapshot(
    scenarioId: string,
    changes: ApiChange[],
    baselineSpecHash = '',
    candidateSpecHash = '',
    forceRefresh = false,
    repositories?: string[]
  ): Promise<{ result: EvidenceDiscoveryResult; snapshot: EvidenceSnapshotV2 }> {
    if (!this.config.githubToken) throw new Error('GITHUB_TOKEN is required when USE_LIVE_GITHUB=true.');

    const allActiveRepos = this.scopeRepository.listActive();
    const requested = new Set((repositories ?? []).map((repository) => repository.toLowerCase()));
    const activeRepos = requested.size === 0
      ? allActiveRepos
      : allActiveRepos.filter((repository) => {
          const slug = `${repository.owner}/${repository.name}`.toLowerCase();
          return requested.has(slug) || requested.has(repository.name.toLowerCase());
        });
    if (requested.size > 0) {
      const matched = new Set(activeRepos.flatMap((repository) => [
        `${repository.owner}/${repository.name}`.toLowerCase(),
        repository.name.toLowerCase()
      ]));
      const missing = [...requested].filter((repository) => !matched.has(repository));
      if (missing.length > 0) {
        throw new Error(`Requested repositories are not active in scope: ${missing.join(', ')}.`);
      }
    }
    if (!activeRepos.length) {
      throw new Error('No active repositories in scope. Use manage_repository_scope to add repositories.');
    }

    const queries = queriesForChanges(changes);
    const queryPlanHash = sha256(queries);
    const cacheKey = sha256({
      scenarioId,
      repos: activeRepos.map((r) => `${r.owner}/${r.name}@${r.lastKnownCommitSha}`),
      queries
    });

    if (forceRefresh) {
      console.log(`[GitHubEvidenceProvider] Force refresh requested. Evicting cache key ${cacheKey}`);
      this.cache.delete(cacheKey);
    } else {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        console.log(`[GitHubEvidenceProvider] Cache HIT for scenario ${scenarioId}`);
        return { result: structuredClone(cached.value), snapshot: structuredClone(cached.snapshot) };
      } else {
        console.log(`[GitHubEvidenceProvider] Cache MISS for scenario ${scenarioId}`);
      }
    }

    let requestCount = 0;
    const request = async (endpoint: string, accept = 'application/vnd.github+json'): Promise<Record<string, unknown>> => {
      requestCount += 1;
      if (requestCount > this.config.githubMaxRequests) {
        throw new Error(`GitHub request budget exceeded (${this.config.githubMaxRequests}).`);
      }
      return this.github(endpoint, accept);
    };

    const items: EvidenceItem[] = [];
    const snapshotResults: EvidenceSnapshotResult[] = [];
    const repositoriesChecked: string[] = [];
    const repositoriesFailed: Array<{ repository: string; errorCode: string }> = [];

    const expectedRepos = activeRepos.map((r) => ({
      owner: r.owner,
      name: r.name,
      branch: r.branch,
      commitSha: r.lastKnownCommitSha
    }));

    const repoRecords: EvidenceSnapshotV2['repositories'] = [];
    const MAX_CONCURRENT_REPOS = 3;

    for (let i = 0; i < activeRepos.length; i += MAX_CONCURRENT_REPOS) {
      const batch = activeRepos.slice(i, i + MAX_CONCURRENT_REPOS);
      await Promise.all(batch.map(async (managedRepo) => {
        const repoSlug = `${managedRepo.owner}/${managedRepo.name}`;
        try {
          // Find default branch and commit
          const defaultBranch = 'main'; // Simplification, ideally fetch default branch
          let commitSha = 'HEAD';
          try {
            const refData = await this.github(`/repos/${encodeURIComponent(managedRepo.owner)}/${encodeURIComponent(managedRepo.name)}/git/refs/heads/${defaultBranch}`, 'application/vnd.github.v3+json');
            commitSha = (refData.object as any).sha;
          } catch (err) {
            // fallback
          }

          // Search for evidence
          for (const query of queries) {
            const q = `repo:${repoSlug} ${query.query}`;
            const endpoint = `/search/code?q=${encodeURIComponent(q)}&per_page=10`;
            
            requestCount++;
            let searchData;
            try {
              searchData = await this.github(endpoint, 'application/vnd.github.v3.text-match+json');
            } catch (err) {
              if (err instanceof Error && err.message.includes('rate limit')) throw err;
              continue;
            }

            const searchItems = Array.isArray(searchData.items) ? searchData.items : [];
            for (const [index, item] of searchItems.entries()) {
              const filePath = typeof item.path === 'string' ? item.path : '';
              if (!filePath || filePath.includes('node_modules') || filePath.includes('dist/')) continue;
              
              requestCount++;
              const source = await this.fetchSource((ep, acc) => this.github(ep, acc ?? 'application/vnd.github.v3+json'), managedRepo.owner, managedRepo.name, filePath, commitSha);
              const excerpt = excerptFor(source, query.query, this.config.maxSnippetChars);
              const snippetHash = sha256(excerpt.snippet);
              const evidenceFingerprint = sha256(excerpt.snippet.replace(/\s+/g, ' ')).slice(0, 16);

              for (const changeId of query.changeIds) {
                const change = changes.find((c) => c.id === changeId);
                if (!change) continue;

                const changeSemanticKey = sha256([change.operation, change.location, change.jsonPath, change.code].join('|')).slice(0, 16);
                const consumerImpactKey = sha256([repoSlug, filePath, changeSemanticKey].join('|')).slice(0, 16);
                const evidenceId = `live_${sha256([repoSlug, query.id, filePath, index, commitSha, changeId]).slice(0, 12)}`;

                items.push({
                  id: evidenceId,
                  changeSemanticKey,
                  consumerImpactKey,
                  evidenceFingerprint,
                  sourceMode: 'live',
                  capturedAt: new Date().toISOString(),
                  repository: repoSlug,
                  branch: defaultBranch,
                  commitSha,
                  searchQuery: query.query,
                  relatedChangeIds: [changeId],
                  filePath,
                  lineStart: excerpt.lineStart,
                  lineEnd: excerpt.lineEnd,
                  snippet: excerpt.snippet,
                  contentHash: snippetHash,
                  htmlUrl: typeof item.html_url === 'string' ? item.html_url : undefined
                });

                snapshotResults.push({
                  evidenceId,
                  changeSemanticKey,
                  consumerImpactKey,
                  evidenceFingerprint,
                  repository: repoSlug,
                  branch: defaultBranch,
                  commitSha,
                  queryId: query.id,
                  filePath,
                  lineStart: excerpt.lineStart,
                  lineEnd: excerpt.lineEnd,
                  snippet: excerpt.snippet,
                  contentHash: snippetHash,
                  htmlUrl: typeof item.html_url === 'string' ? item.html_url : undefined
                });
              }
            }
          }

          // Fetch CODEOWNERS
          let codeowners: EvidenceSnapshotV2['repositories'][number]['codeowners'] = undefined;
          const codeownersPaths = ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS'];
          for (const path of codeownersPaths) {
            try {
              requestCount++;
              const source = await this.fetchSource((ep, acc) => this.github(ep, acc ?? 'application/vnd.github.v3+json'), managedRepo.owner, managedRepo.name, path, commitSha);
              codeowners = {
                path: path as any,
                content: source,
                contentHash: sha256(source),
                commitSha
              };
              break; // Stop at first found
            } catch (e) {
              // Ignore and try next path
            }
          }

          repoRecords.push({
            repository: repoSlug,
            branch: defaultBranch,
            commitSha,
            scanStatus: 'COMPLETE',
            codeowners
          });
          repositoriesChecked.push(repoSlug);
        } catch (err) {
          repoRecords.push({
            repository: repoSlug,
            branch: 'unknown',
            commitSha: 'unknown',
            scanStatus: 'FAILED',
            error: String(err instanceof Error ? err.message : err).slice(0, 120)
          });
          repositoriesFailed.push({
            repository: repoSlug,
            errorCode: String(err instanceof Error ? err.message : err).slice(0, 120)
          });
        }
      }));
    }

    const now = new Date().toISOString();
    const snapshotId = `snap_${randomUUID().slice(0, 12)}`;

    const snapshot: EvidenceSnapshotV2 = {
      schemaVersion: 2,
      snapshotId,
      scenarioId,
      origin: 'GITHUB',
      baselineSpecHash,
      candidateSpecHash,
      repositoryScopeVersion: this.scopeRepository.getScope().version,
      queryPlanHash,
      generatedAt: now,
      repositories: repoRecords,
      coverage: {
        repositoriesExpected: activeRepos.length,
        repositoriesChecked: repositoriesChecked.length,
        repositoriesFailed: repositoriesFailed.length,
        ratio: activeRepos.length > 0 ? repositoriesChecked.length / activeRepos.length : 1
      },
      queries: queries.map((q) => ({ queryId: q.id, query: q.query, generatedFromChangeIds: q.changeIds })),
      results: snapshotResults
    };

    const limitations = [
      'Live GitHub code search is rate-limited and restricted to active scope repositories.',
      `Repositories checked: ${repositoriesChecked.length}/${activeRepos.length}.`,
      `GitHub requests used: ${requestCount}/${this.config.githubMaxRequests}.`
    ];
    if (repositoriesFailed.length > 0) {
      limitations.push(`Failed repositories (${repositoriesFailed.length}): ${repositoriesFailed.map((f) => f.repository).join(', ')}.`);
    }

    const result: EvidenceDiscoveryResult = { items, sourceMode: 'live', limitations };

    this.cache.set(cacheKey, {
      value: structuredClone(result),
      snapshot: structuredClone(snapshot),
      expiresAt: Date.now() + this.config.githubCacheTtlSeconds * 1000
    });

    return { result, snapshot };
  }

  private async fetchSource(
    request: (endpoint: string, accept?: string) => Promise<Record<string, unknown>>,
    owner: string,
    repository: string,
    filePath: string,
    commitSha: string
  ): Promise<string> {
    const endpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/contents/${filePath.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(commitSha)}`;
    const payload = await request(endpoint);
    const content = typeof payload.content === 'string' ? payload.content.replace(/\s/g, '') : '';
    if (!content || payload.encoding !== 'base64') {
      throw new Error(`Unable to read source content for ${owner}/${repository}/${filePath}.`);
    }
    return Buffer.from(content, 'base64').toString('utf8');
  }

  private async github(endpoint: string, accept: string): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`https://api.github.com${endpoint}`, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.config.githubToken}`,
          Accept: accept,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'api-larp-nitrostack-hackathon'
        }
      });
      
      const remaining = response.headers.get('x-ratelimit-remaining');
      const reset = response.headers.get('x-ratelimit-reset');
      
      if (!response.ok) {
        if (response.status === 403 && remaining === '0') {
           const resetTime = reset ? new Date(Number(reset) * 1000).toLocaleTimeString() : 'unknown';
           throw new Error(`GitHub rate limit exhausted. Resets at ${resetTime}.`);
        }
        throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
      }
      return await response.json() as Record<string, unknown>;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function excerptFor(source: string, query: string, maxChars: number): { snippet: string; lineStart: number; lineEnd: number } {
  const lines = source.split(/\r?\n/);
  const matchedIndex = lines.findIndex((line) => line.toLowerCase().includes(query.toLowerCase()));
  const index = matchedIndex >= 0 ? matchedIndex : 0;
  const start = Math.max(0, index - 1);
  const end = Math.min(lines.length, index + 2);
  const snippet = lines.slice(start, end).join('\n').slice(0, maxChars);
  return { snippet, lineStart: start + 1, lineEnd: Math.max(start + 1, end) };
}
