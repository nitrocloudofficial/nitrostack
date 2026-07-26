import assert from 'node:assert/strict';
import test from 'node:test';
import { DataLoaderService, KnowledgeInputError } from '../src/services/data-loader.service.js';
import { ChangeDetectionService } from '../src/services/change-detection.service.js';
import { DependencyService } from '../src/services/dependency.service.js';
import { ValidationService } from '../src/services/validation.service.js';
import { ConflictService } from '../src/services/conflict.service.js';
import { ProvenanceService } from '../src/services/provenance.service.js';
import { RiskService, calculateRiskScore } from '../src/services/risk.service.js';

test('detects the expected Phase 4 changes', () => {
  const loader = new DataLoaderService();
  const result = new ChangeDetectionService(loader).detectChanges();
  assert.equal(result.total_sources_checked, 6);
  assert.equal(result.sources_with_changes, 5);
  assert.equal(result.changes.length, 9);
  assert.deepEqual(result.changes.find((change) => change.fact_key === 'maximum_discount'), {
    source_id: 'discount-policy', source_title: 'Enterprise Discount Policy',
    fact_key: 'maximum_discount', old_value: '20%', new_value: '10%', changed: true,
  });
});

test('filters change detection to one known source', () => {
  const loader = new DataLoaderService();
  const result = new ChangeDetectionService(loader).detectChanges('discount-policy');
  assert.equal(result.total_sources_checked, 1);
  assert.equal(result.sources_with_changes, 1);
  assert.equal(result.changes.length, 3);
});

test('rejects unknown sources and facts', () => {
  const loader = new DataLoaderService();
  const changes = new ChangeDetectionService(loader);
  const dependencies = new DependencyService(loader);
  assert.throws(() => changes.detectChanges('does-not-exist'), (error: unknown) => error instanceof KnowledgeInputError);
  assert.throws(() => dependencies.findAffectedKnowledge('discount-policy', 'does-not-exist'), (error: unknown) => error instanceof KnowledgeInputError);
});

test('returns affected claims with dependency metadata', () => {
  const loader = new DataLoaderService();
  const result = new DependencyService(loader).findAffectedKnowledge('discount-policy', 'maximum_discount');
  assert.equal(result.total_affected_documents, 6);
  assert.equal(result.total_affected_claims, 6);
  assert.ok(result.affected.every((document) => document.affected_claims.every((claim) => claim.dependency_type === 'direct')));
});

test('validates matching, conflicting, and generic claims deterministically', () => {
  const loader = new DataLoaderService();
  const validation = new ValidationService(loader);

  assert.equal(
    validation.validateClaim('pricing-guide', 'pricing-guide.claim-1').status,
    'VALID',
  );
  assert.equal(
    validation.validateClaim('sales-playbook', 'sales-playbook.claim-1').status,
    'CONFLICT',
  );
  assert.equal(
    validation.validateClaim(
      'quarterly-review-deck',
      'quarterly-review-deck.claim-1',
    ).status,
    'AMBIGUOUS',
  );
  assert.equal(
    validation.validateClaim(
      'discount-approval-sop',
      'discount-approval-sop.claim-1',
    ).status,
    'CONFLICT',
  );
});

test('reports the complete conflict breakdown for a fact', () => {
  const loader = new DataLoaderService();
  const report = new ConflictService(
    loader,
    new DependencyService(loader),
    new ValidationService(loader),
  ).detectConflicts('discount-policy', 'maximum_discount');

  assert.equal(report.total_claims_checked, 6);
  assert.equal(report.conflicts, 4);
  assert.equal(report.valid, 1);
  assert.equal(report.ambiguous, 1);
  assert.equal(report.results.length, 6);
});

test('traces claim provenance through previous and current source versions', () => {
  const loader = new DataLoaderService();
  const result = new ProvenanceService(
    loader,
    new ValidationService(loader),
  ).traceClaim('sales-playbook', 'sales-playbook.claim-1');

  assert.equal(result.depends_on_fact, 'discount-policy.maximum_discount');
  assert.equal(result.source_history.length, 2);
  assert.deepEqual(result.source_history.map((item) => item.value), ['20%', '10%']);
  assert.equal(result.source_history[0].status, 'superseded');
  assert.equal(result.source_history[1].status, 'current');
  assert.equal(result.is_current, false);
  assert.match(result.conclusion, /current authoritative value of 10%/);
});

test('calculates deterministic risk for a confirmed customer-facing conflict', () => {
  const loader = new DataLoaderService();
  const result = new RiskService(loader, new ValidationService(loader)).assessRisk(
    'sales-playbook',
    'sales-playbook.claim-1',
  );

  assert.equal(result.risk_score, 95);
  assert.equal(result.risk_level, 'CRITICAL');
  assert.equal(result.factors.confirmed_conflict, true);
  assert.equal(result.factors.customer_facing, true);
  assert.equal(result.factors.financial_impact, true);
  assert.equal(result.factors.operational_impact, true);
});

test('caps risk scores and applies the specified thresholds', () => {
  assert.equal(calculateRiskScore({
    confirmed_conflict: true,
    customer_facing: true,
    financial_impact: true,
    compliance_impact: true,
    operational_impact: true,
    document_criticality: 'critical',
  }), 100);
  assert.equal(calculateRiskScore({
    confirmed_conflict: false,
    customer_facing: false,
    financial_impact: true,
    compliance_impact: false,
    operational_impact: false,
    document_criticality: 'medium',
  }), 22);
});
