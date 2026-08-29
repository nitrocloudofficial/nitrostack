import type { Assessment } from './types.js';

export function evaluateMigrationReadiness(assessment: Assessment) {
  const impactedEvidence = assessment.evidence.filter((item) =>
    ['CONFIRMED_IMPACT', 'LIKELY_IMPACT'].includes(item.classification)
  );
  const assignedEvidenceIds = new Set(
    (assessment.ownershipResolution?.assignments ?? [])
      .filter((assignment) => assignment.status === 'RESOLVED' && assignment.owners.length > 0)
      .map((assignment) => assignment.evidenceId)
  );
  const missingOwnerEvidenceIds = impactedEvidence
    .filter((item) => !assignedEvidenceIds.has(item.id))
    .map((item) => item.id);
  const fullCoverage = assessment.coverage.repositoriesFailed === 0
    && assessment.coverage.repositoriesChecked === assessment.coverage.repositoriesExpected;
  const releaseBlockedByPolicy = assessment.policyEvaluations.some((evaluation) => evaluation.verdict === 'BLOCK');
  const decisionBlocksRelease = assessment.decisionStatus === 'BLOCKED_PENDING_MIGRATION';
  const hasConfirmedImpact = impactedEvidence.length > 0;
  const ownersResolved = missingOwnerEvidenceIds.length === 0;
  const readyForMigration = decisionBlocksRelease && hasConfirmedImpact && ownersResolved && fullCoverage;

  const blockers: string[] = [];
  if (!decisionBlocksRelease) blockers.push('Record a BLOCK release decision before preparing migration code.');
  if (!hasConfirmedImpact) blockers.push('No confirmed or likely impacted consumer files are available.');
  if (!ownersResolved) blockers.push(`Resolve owners for impacted evidence: ${missingOwnerEvidenceIds.join(', ')}.`);
  if (!fullCoverage) blockers.push('Complete repository coverage before preparing migration code.');

  return {
    readyForMigration,
    releaseBlockedByPolicy,
    decisionBlocksRelease,
    confirmedOrLikelyImpacts: impactedEvidence.length,
    ownersResolved,
    missingOwnerEvidenceIds,
    fullCoverage,
    reason: readyForMigration
      ? 'The unsafe release is blocked and confirmed impacted files are pinned, covered, and assigned for remediation.'
      : blockers.join(' '),
    recommendedNextSteps: readyForMigration
      ? ['Read pinned migration sources', 'Create guarded draft migration pull requests', 'Run consumer tests and request owner review']
      : blockers
  };
}
