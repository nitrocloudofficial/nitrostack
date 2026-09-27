import { Injectable } from '@nitrostack/core';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { EvidenceSnapshotV2 } from '../../domain/evidence-snapshot.js';
import { sha256 } from '../../domain/hash.js';
import type { ApiChange, EvidenceItem } from '../../domain/types.js';
import { ApiGuardConfig } from './config.service.js';
import type { EvidenceDiscoveryResult, EvidenceProvider } from './evidence.provider.js';
import { EvidenceSnapshotSchema, type EvidenceSnapshot } from './evidence.schemas.js';

@Injectable({ deps: [ApiGuardConfig] })
export class SnapshotEvidenceProvider implements EvidenceProvider {
  constructor(private readonly config: ApiGuardConfig) {}

  async loadSnapshot(scenarioId?: string): Promise<EvidenceSnapshot> {
    const id = scenarioId || this.config.demoScenario || 'risky';
    const file = path.resolve(process.cwd(), this.config.fixturesDir, 'scenarios', id, 'evidence.snapshot.json');
    return EvidenceSnapshotSchema.parse(JSON.parse(await readFile(file, 'utf8')));
  }

  async discover(scenarioId: string, changes: ApiChange[]): Promise<EvidenceDiscoveryResult> {
    const { result } = await this.discoverSnapshot(scenarioId, changes);
    return result;
  }

  async discoverSnapshot(
    scenarioId: string,
    changes: ApiChange[],
    baselineSpecHash = '',
    candidateSpecHash = '',
    repositories?: string[]
  ): Promise<{ result: EvidenceDiscoveryResult; snapshot: EvidenceSnapshotV2 }> {
    const rawSnapshot = await this.loadSnapshot(scenarioId);
    const queryMap = new Map(rawSnapshot.queries.map((query) => [query.queryId, query] as const));
    const validChangeIds = new Set(changes.map((change) => change.id));
    const requested = new Set((repositories ?? []).map((repository) => repository.toLowerCase()));
    const selectedRepositories = rawSnapshot.repositories.filter((repository) => {
      const slug = `${repository.owner}/${repository.name}`.toLowerCase();
      return requested.size === 0 || requested.has(slug) || requested.has(repository.name.toLowerCase());
    });
    if (requested.size > 0) {
      const matched = new Set(selectedRepositories.flatMap((repository) => [
        `${repository.owner}/${repository.name}`.toLowerCase(),
        repository.name.toLowerCase()
      ]));
      const missing = [...requested].filter((repository) => !matched.has(repository));
      if (missing.length > 0) {
        throw new Error(`Requested repositories are not present in the snapshot: ${missing.join(', ')}.`);
      }
    }
    const selectedSlugs = new Set(selectedRepositories.map((repository) => `${repository.owner}/${repository.name}`.toLowerCase()));
    const selectedResults = rawSnapshot.results.filter((result: any) => selectedSlugs.has(result.repository.toLowerCase()));

    const items: EvidenceItem[] = selectedResults.map((result: any) => {
      const query = queryMap.get(result.queryId);
      if (!query) throw new Error(`Snapshot result references unknown query ${result.queryId}`);
      if (sha256(result.snippet) !== result.contentHash) {
        throw new Error(`Snapshot content hash mismatch for ${result.evidenceId}`);
      }
      return {
        id: result.evidenceId,
        changeSemanticKey: result.changeSemanticKey,
        consumerImpactKey: result.consumerImpactKey,
        evidenceFingerprint: result.evidenceFingerprint,
        sourceMode: 'snapshot',
        capturedAt: rawSnapshot.generatedAt,
        repository: result.repository,
        branch: result.branch,
        commitSha: result.commitSha,
        searchQuery: query.query,
        relatedChangeIds: query.generatedFromChangeIds.filter((id: string) => validChangeIds.has(id)),
        filePath: result.filePath,
        lineStart: result.lineStart,
        lineEnd: result.lineEnd,
        snippet: result.snippet,
        contentHash: result.contentHash,
        htmlUrl: result.htmlUrl
      };
    });

    const snapshotV2: EvidenceSnapshotV2 = {
      schemaVersion: 2,
      snapshotId: requested.size === 0
        ? `snap_fixture_${scenarioId}`
        : `snap_fixture_${scenarioId}_${sha256([...requested].sort()).slice(0, 10)}`,
      scenarioId,
      origin: 'FIXTURE',
      baselineSpecHash,
      candidateSpecHash,
      repositoryScopeVersion: 0,
      queryPlanHash: sha256(rawSnapshot.queries),
      generatedAt: rawSnapshot.generatedAt,
      repositories: selectedRepositories.map((repository) => ({
        repository: `${repository.owner}/${repository.name}`,
        branch: repository.defaultBranch,
        commitSha: repository.commitSha,
        scanStatus: 'COMPLETE'
      })),
      coverage: {
        repositoriesExpected: selectedRepositories.length,
        repositoriesChecked: selectedRepositories.length,
        repositoriesFailed: 0,
        ratio: 1
      },
      queries: rawSnapshot.queries.map((q) => ({ queryId: q.queryId, query: q.query, generatedFromChangeIds: q.generatedFromChangeIds })),
      results: selectedResults.map((r: any) => ({
        evidenceId: r.evidenceId,
        changeSemanticKey: r.changeSemanticKey || 'legacy',
        consumerImpactKey: r.consumerImpactKey || 'legacy',
        evidenceFingerprint: r.evidenceFingerprint || 'legacy',
        repository: r.repository,
        branch: r.branch,
        commitSha: r.commitSha,
        queryId: r.queryId,
        filePath: r.filePath,
        lineStart: r.lineStart,
        lineEnd: r.lineEnd,
        snippet: r.snippet,
        contentHash: r.contentHash,
        htmlUrl: r.htmlUrl
      }))
    };

    const result: EvidenceDiscoveryResult = {
      items,
      sourceMode: 'snapshot',
      limitations: [
        rawSnapshot.origin === 'fixture'
          ? 'The bundled offline snapshot is derived from demonstration consumer fixtures. Run refresh_repository_evidence with USE_LIVE_GITHUB=true to generate live provenance.'
          : 'Evidence was captured from the configured GitHub repository scope and pinned commits.',
        'Evidence is limited to the configured repository scope and pinned snapshot commits.'
      ]
    };

    return { result, snapshot: snapshotV2 };
  }
}
