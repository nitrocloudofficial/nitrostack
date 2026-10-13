import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDecision } from '../../src/domain/decision-state.js';

const assessment: any = {
  id: 'a1', scenarioId: 'risky', analysisStatus: 'COMPLETE', decisionStatus: 'PENDING',
  baselineSpecHash: 'b', candidateSpecHash: 'c', repositoryCommits: {}, sourceMode: 'snapshot',
  classifierMode: 'llm', changes: [], evidence: [], overallSeverity: 'HIGH', limitations: [],
  durationMs: 1, createdAt: 'x', updatedAt: 'x', version: 1
};

test('block changes state and a repeated identical request is idempotent', () => {
  const request: any = {
    assessmentId: 'a1', expectedVersion: 1, decision: 'BLOCK', reason: 'consumer impact',
    actorId: 'u', actorDisplayName: 'User', idempotencyKey: 'a1:block:v1'
  };
  const decided = applyDecision(assessment, request, '2026-01-01T00:00:00Z');
  assert.equal(decided.decisionStatus, 'BLOCKED_PENDING_MIGRATION');
  assert.equal(decided.version, 2);
  const duplicate = applyDecision(decided, request, '2026-01-01T00:00:01Z');
  assert.equal(duplicate.version, 2);
});
