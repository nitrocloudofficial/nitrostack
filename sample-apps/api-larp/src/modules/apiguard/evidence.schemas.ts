import { z } from 'zod';

export interface EvidenceSnapshotQuery {
  queryId: string;
  query: string;
  generatedFromChangeIds: string[];
}

export interface EvidenceSnapshotRepository {
  owner: string;
  name: string;
  defaultBranch: string;
  commitSha: string;
}

export interface EvidenceSnapshotResult {
  evidenceId: string;
  queryId: string;
  repository: string;
  branch: string;
  commitSha: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  snippet: string;
  contentHash: string;
  htmlUrl?: string;
}

export interface EvidenceSnapshot {
  schemaVersion: 1;
  snapshotId: string;
  generatedAt: string;
  sourceMode: 'snapshot';
  origin: 'fixture' | 'github';
  githubApiVersion: string;
  scope: { owner: string; repositories: string[] };
  queries: EvidenceSnapshotQuery[];
  repositories: EvidenceSnapshotRepository[];
  results: EvidenceSnapshotResult[];
}

export const EvidenceSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  snapshotId: z.string().min(1),
  generatedAt: z.string().datetime(),
  sourceMode: z.literal('snapshot'),
  origin: z.enum(['fixture', 'github']),
  githubApiVersion: z.string(),
  scope: z.object({ owner: z.string(), repositories: z.array(z.string()).min(1) }),
  queries: z.array(z.object({ queryId: z.string(), query: z.string(), generatedFromChangeIds: z.array(z.string()) })),
  repositories: z.array(z.object({ owner: z.string(), name: z.string(), defaultBranch: z.string(), commitSha: z.string().min(7) })),
  results: z.array(z.object({
    evidenceId: z.string(), queryId: z.string(), repository: z.string(), branch: z.string(), commitSha: z.string(),
    filePath: z.string(), lineStart: z.number().int().positive(), lineEnd: z.number().int().positive(),
    snippet: z.string(), contentHash: z.string(), htmlUrl: z.string().url().optional()
  }))
}) as { parse(input: unknown): EvidenceSnapshot };
