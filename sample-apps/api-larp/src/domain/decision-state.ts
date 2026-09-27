import type { Assessment, ReleaseDecision } from './types.js';

export class DecisionConflictError extends Error {}
export class DecisionValidationError extends Error {}

export interface DecisionRequest {
  assessmentId: string;
  expectedVersion: number;
  decision: 'APPROVE' | 'BLOCK';
  reason?: string;
  actorId: string;
  actorDisplayName: string;
  idempotencyKey: string;
}

export function applyDecision(current: Assessment, request: DecisionRequest, now = new Date().toISOString()): Assessment {
  if (current.id !== request.assessmentId) throw new DecisionValidationError('Assessment ID mismatch.');
  const target = request.decision === 'APPROVE' ? 'APPROVED_FOR_RELEASE' : 'BLOCKED_PENDING_MIGRATION';
  if (current.decision?.idempotencyKey === request.idempotencyKey && current.decision.decision === target) return current;
  if (current.version !== request.expectedVersion) throw new DecisionConflictError(`Stale assessment version. Expected ${current.version}.`);
  if (current.analysisStatus !== 'COMPLETE' && request.decision === 'APPROVE') {
    throw new DecisionValidationError('Only a complete analysis may be approved.');
  }
  if (request.decision === 'BLOCK' && !request.reason?.trim()) throw new DecisionValidationError('Blocking requires a reason.');
  if (current.decision) {
    throw new DecisionConflictError(`Assessment is already ${current.decisionStatus}.`);
  }
  const decision: ReleaseDecision = {
    decision: target,
    reason: request.reason?.trim() || undefined,
    actorId: request.actorId,
    actorDisplayName: request.actorDisplayName,
    decidedAt: now,
    idempotencyKey: request.idempotencyKey
  };
  return { ...current, decisionStatus: target, decision, version: current.version + 1, updatedAt: now };
}
