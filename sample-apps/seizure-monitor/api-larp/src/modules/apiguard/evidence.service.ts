import { Injectable } from '@nitrostack/core';
import type { EvidenceSnapshotV2 } from '../../domain/evidence-snapshot.js';
import type { ApiChange, EvidenceItem } from '../../domain/types.js';
import { ApiGuardConfig } from './config.service.js';
import { EvidenceSnapshotRepository } from './evidence-snapshot.repository.js';
import type { EvidenceDiscoveryResult } from './evidence.provider.js';
import { GitHubEvidenceProvider } from './github-evidence.provider.js';
import { SnapshotEvidenceProvider } from './snapshot-evidence.provider.js';

@Injectable({
  deps: [
    ApiGuardConfig,
    SnapshotEvidenceProvider,
    GitHubEvidenceProvider,
    EvidenceSnapshotRepository
  ]
})
export class EvidenceService {
  constructor(
    private readonly config: ApiGuardConfig,
    private readonly snapshotProvider: SnapshotEvidenceProvider,
    private readonly githubProvider: GitHubEvidenceProvider,
    private readonly snapshotRepo: EvidenceSnapshotRepository
  ) {}

  async discover(scenarioId: string, changes: ApiChange[]): Promise<EvidenceDiscoveryResult> {
    const { result, snapshot } = await this.discoverSnapshot(scenarioId, changes);
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
    const pair = this.config.useLiveGitHub
      ? await this.githubProvider.discoverSnapshot(scenarioId, changes, baselineSpecHash, candidateSpecHash, forceRefresh, repositories)
      : await this.snapshotProvider.discoverSnapshot(scenarioId, changes, baselineSpecHash, candidateSpecHash, repositories);

    this.snapshotRepo.save(pair.snapshot);
    return pair;
  }

  getSnapshot(snapshotId: string): EvidenceSnapshotV2 | undefined {
    return this.snapshotRepo.get(snapshotId);
  }

  getLatestSnapshot(scenarioId: string): EvidenceSnapshotV2 | undefined {
    return this.snapshotRepo.getLatestForScenario(scenarioId);
  }

  toEvidenceItems(snapshot: EvidenceSnapshotV2): EvidenceItem[] {
    const queries = new Map(snapshot.queries.map((query) => [query.queryId, query]));
    return snapshot.results.map((result) => {
      const query = queries.get(result.queryId);
      if (!query) throw new Error(`Snapshot result references unknown query ${result.queryId}.`);
      return {
        id: result.evidenceId,
        changeSemanticKey: result.changeSemanticKey,
        consumerImpactKey: result.consumerImpactKey,
        evidenceFingerprint: result.evidenceFingerprint,
        sourceMode: snapshot.origin === 'GITHUB' ? 'live' : 'snapshot',
        capturedAt: snapshot.generatedAt,
        repository: result.repository,
        branch: result.branch,
        commitSha: result.commitSha,
        searchQuery: query.query,
        relatedChangeIds: [...query.generatedFromChangeIds],
        filePath: result.filePath,
        lineStart: result.lineStart,
        lineEnd: result.lineEnd,
        snippet: result.snippet,
        contentHash: result.contentHash,
        htmlUrl: result.htmlUrl
      };
    });
  }
}
