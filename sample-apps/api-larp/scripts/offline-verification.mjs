import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { diffOpenApi } from '../.offline-dist/src/domain/openapi-diff.js';
import { sha256 } from '../.offline-dist/src/domain/hash.js';
import { deterministicClassify, fallbackAssess, computeSeverity } from '../.offline-dist/src/domain/deterministic-risk.js';
import { applyDecision } from '../.offline-dist/src/domain/decision-state.js';

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const baseline = await readJson('fixtures/scenarios/risky/baseline.openapi.json');
const candidate = await readJson('fixtures/scenarios/risky/candidate.openapi.json');
const snapshot = await readJson('fixtures/scenarios/risky/evidence.snapshot.json');
const changes = diffOpenApi(baseline, candidate);
const queryMap = new Map(snapshot.queries.map((query) => [query.queryId, query]));
const evidence = snapshot.results.map((result) => {
  const query = queryMap.get(result.queryId);
  if (!query) throw new Error(`Unknown query ${result.queryId}`);
  if (sha256(result.snippet) !== result.contentHash) throw new Error(`Hash mismatch: ${result.evidenceId}`);
  return {
    id: result.evidenceId,
    sourceMode: 'snapshot',
    capturedAt: snapshot.generatedAt,
    repository: result.repository,
    branch: result.branch,
    commitSha: result.commitSha,
    searchQuery: query.query,
    generatedFromChangeIds: query.generatedFromChangeIds,
    filePath: result.filePath,
    lineStart: result.lineStart,
    lineEnd: result.lineEnd,
    snippet: result.snippet,
    contentHash: result.contentHash,
    htmlUrl: result.htmlUrl
  };
});
const assessed = evidence.map((item) => deterministicClassify(item, changes) ?? fallbackAssess(item, changes));
const now = new Date().toISOString();
const assessment = {
  id: `asm_offline_${randomUUID()}`,
  scenarioId: 'risky',
  analysisStatus: assessed.some((item) => item.classification === 'REVIEW_REQUIRED') ? 'COMPLETE_WITH_WARNINGS' : 'COMPLETE',
  decisionStatus: 'PENDING',
  baselineSpecHash: sha256(baseline),
  candidateSpecHash: sha256(candidate),
  repositoryCommits: Object.fromEntries(evidence.map((item) => [item.repository, item.commitSha])),
  sourceMode: 'snapshot',
  classifierMode: 'deterministic-fallback',
  changes,
  evidence: assessed,
  overallSeverity: computeSeverity(assessed),
  limitations: [
    'Offline verification uses the bundled fixture snapshot.',
    'NitroStack runtime registration and widget rendering require installed official packages.'
  ],
  durationMs: 0,
  createdAt: now,
  updatedAt: now,
  version: 1
};
const decided = applyDecision(assessment, {
  assessmentId: assessment.id,
  expectedVersion: 1,
  decision: 'BLOCK',
  reason: 'Verified consumer evidence still relies on the old contract.',
  actorId: 'offline-verifier',
  actorDisplayName: 'Offline Verifier',
  idempotencyKey: `${assessment.id}:block:v1`
}, now);

const requiredCodes = ['REQUIRED_PROPERTY_REMOVED', 'PROPERTY_TYPE_CHANGED', 'ENUM_WIDENED'];
for (const code of requiredCodes) {
  if (!changes.some((change) => change.code === code && change.breaking)) throw new Error(`Missing breaking change ${code}`);
}
if (decided.decisionStatus !== 'BLOCKED_PENDING_MIGRATION') throw new Error('Decision state did not update.');
await mkdir('verification', { recursive: true });
await writeFile('verification/offline-assessment.json', `${JSON.stringify(decided, null, 2)}\n`, 'utf8');
process.stdout.write(`Offline integration verification passed: ${changes.length} changes, ${evidence.length} evidence items, severity ${assessment.overallSeverity}, decision ${decided.decisionStatus}.\n`);
