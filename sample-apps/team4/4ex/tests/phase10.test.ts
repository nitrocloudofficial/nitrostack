import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { AuditService } from '../src/services/audit.service.js';
import { ChangeDetectionService } from '../src/services/change-detection.service.js';
import { ConflictService } from '../src/services/conflict.service.js';
import { DataLoaderService } from '../src/services/data-loader.service.js';
import { DependencyService } from '../src/services/dependency.service.js';
import { ProvenanceService } from '../src/services/provenance.service.js';
import { RemediationService } from '../src/services/remediation.service.js';
import { RiskService } from '../src/services/risk.service.js';
import { ValidationService } from '../src/services/validation.service.js';
import { DriftService } from '../src/services/drift.service.js';
import { ReportService } from '../src/services/report.service.js';
import { BatchService } from '../src/services/batch.service.js';

const pendingPath = resolve(process.cwd(), 'src/data/pending_updates.json');
const auditPath = resolve(process.cwd(), 'src/data/audit_log.json');
const documentsPath = resolve(process.cwd(), 'src/data/documents.json');
const snapshots = new Map<string, string>();

function createServices() {
  const loader = new DataLoaderService();
  const validation = new ValidationService(loader);
  const dependency = new DependencyService(loader);
  const risk = new RiskService(loader, validation);
  const audit = new AuditService(loader);
  const remediation = new RemediationService(loader, audit, risk, validation);
  
  const changeDetection = new ChangeDetectionService(loader);
  const conflict = new ConflictService(loader, dependency, validation);
  
  const drift = new DriftService(loader, changeDetection, dependency, conflict, risk);
  const report = new ReportService(loader, changeDetection, conflict, risk, audit, validation);
  const batch = new BatchService(loader, remediation);

  return { loader, drift, report, batch, remediation };
}

test.before(() => {
  for (const file of [pendingPath, auditPath, documentsPath]) {
    snapshots.set(file, readFileSync(file, 'utf8'));
  }
});

test.after(() => {
  for (const [file, contents] of snapshots) {
    writeFileSync(file, contents, 'utf8');
  }
});

test('DriftService computes knowledge drift metrics correctly', () => {
  const { drift } = createServices();
  const summary = drift.getDriftSummary();

  assert.ok(summary.total_facts > 0, 'Total facts should be greater than 0');
  assert.equal(summary.changed_facts, 9, 'Expected 9 changed facts in the system');
  assert.ok(summary.staleness_score >= 0 && summary.staleness_score <= 100);
  assert.equal(summary.most_affected_department, 'Sales', 'Sales should be most affected');
});

test('ReportService generates compliance reports and department breakdowns', () => {
  const { report } = createServices();
  const options = { department: 'Sales', minRiskLevel: 'HIGH' };
  const r = report.generateComplianceReport(options);

  assert.ok(r.report_id);
  assert.equal(r.scope.department, 'Sales');
  assert.equal(r.scope.min_risk_level, 'HIGH');
  assert.ok(Array.isArray(r.outstanding_conflicts));
  
  // Every outstanding conflict in the department-scoped report should belong to Sales
  for (const conflict of r.outstanding_conflicts) {
    assert.equal(conflict.department, 'Sales');
    assert.ok(conflict.risk_score >= 60, 'Risk score should be >= 60 (HIGH)');
  }
});

test('BatchService performs batched approval with risk ceiling safety guard', () => {
  const { loader, batch, remediation } = createServices();

  // Create two proposals: one high-risk, one medium/low risk
  // sales-playbook.claim-1 depends on discount-policy.maximum_discount (changed)
  const prop1 = remediation.proposeUpdate('sales-playbook', 'sales-playbook.claim-1'); // CRITICAL risk
  const prop2 = remediation.proposeUpdate('sales-training', 'sales-training.claim-1'); // MEDIUM risk

  // Test approving with a risk ceiling of 'MEDIUM'
  const result = batch.batchApprove(
    [prop1.id, prop2.id],
    'MEDIUM',
    'Audited via batch test'
  );

  assert.equal(result.summary.total_requested, 2);
  assert.equal(result.summary.approved_count, 1, 'Should approve 1 proposal');
  assert.equal(result.summary.skipped_count, 1, 'Should skip 1 proposal due to risk ceiling');
  assert.equal(result.summary.failed_count, 0);

  assert.equal(result.approved[0].proposal_id, prop2.id);
  assert.equal(result.skipped[0].proposal_id, prop1.id);
  assert.match(result.skipped[0].reason, /exceeds ceiling/);
});
