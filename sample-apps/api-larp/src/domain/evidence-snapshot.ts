import type { EvidenceCoverage } from './types.js';

export interface EvidenceSnapshotQuery {
  queryId: string;
  query: string;
  generatedFromChangeIds: string[];
}

export interface EvidenceSnapshotResult {
  evidenceId: string;
  changeSemanticKey: string;
  consumerImpactKey: string;
  evidenceFingerprint: string;
  repository: string;
  branch: string;
  commitSha: string;
  queryId: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  snippet: string;
  contentHash: string;
  htmlUrl?: string;
}

export interface EvidenceSnapshotV2 {
  schemaVersion: 2;
  snapshotId: string;
  scenarioId: string;
  origin: 'FIXTURE' | 'GITHUB';
  baselineSpecHash: string;
  candidateSpecHash: string;
  repositoryScopeVersion: number;
  queryPlanHash: string;
  generatedAt: string;
  repositories: Array<{
    repository: string;
    branch: string;
    commitSha: string;
    scanStatus: 'COMPLETE' | 'PARTIAL' | 'FAILED';
    codeowners?: {
      path: '.github/CODEOWNERS' | 'CODEOWNERS' | 'docs/CODEOWNERS';
      content: string;
      contentHash: string;
      commitSha: string;
    };
    error?: string;
  }>;
  coverage: EvidenceCoverage;
  queries: EvidenceSnapshotQuery[];
  results: EvidenceSnapshotResult[];
}
