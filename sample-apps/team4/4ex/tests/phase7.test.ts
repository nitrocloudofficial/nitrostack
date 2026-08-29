import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { AuditService } from '../src/services/audit.service.js';
import { DataLoaderService } from '../src/services/data-loader.service.js';
import { RemediationService } from '../src/services/remediation.service.js';
import { RiskService } from '../src/services/risk.service.js';
import { ValidationService } from '../src/services/validation.service.js';

const dataDir = resolve(process.cwd(), 'src/data');
const pendingPath = resolve(dataDir, 'pending_updates.json');
const auditPath = resolve(dataDir, 'audit_log.json');
const documentsPath = resolve(dataDir, 'documents.json');
const snapshots = new Map<string, string>();

test.before(() => {
  for (const file of [pendingPath, auditPath, documentsPath]) {
    snapshots.set(file, readFileSync(file, 'utf8'));
  }
});

test.after(() => {
  for (const [file, contents] of snapshots) writeFileSync(file, contents, 'utf8');
});

test('proposes, approves, applies, and audits a knowledge update', () => {
  const loader = new DataLoaderService();
  const validation = new ValidationService(loader);
  const audit = new AuditService(loader);
  const remediation = new RemediationService(
    loader,
    audit,
    new RiskService(loader, validation),
    validation,
  );

  const proposal = remediation.proposeUpdate(
    'sales-playbook',
    'sales-playbook.claim-1',
  );
  assert.equal(proposal.status, 'AWAITING_APPROVAL');
  assert.match(proposal.suggested_text, /10%/);
  assert.equal(loader.getDocumentById('sales-playbook')?.claims[0].text, proposal.current_text);

  const result = remediation.approveUpdate(proposal.id, 'Reviewed by policy owner');
  assert.equal(result.update.status, 'APPLIED');
  assert.equal(result.audit.action, 'UPDATE_APPLIED');
  assert.equal(result.audit.reason, 'Reviewed by policy owner');
  assert.equal(
    loader.getDocumentById('sales-playbook')?.claims[0].text,
    proposal.suggested_text,
  );
  assert.equal(audit.getLog({ documentId: 'sales-playbook', limit: 1 }).length, 1);
  assert.equal(audit.getLog({ limit: 0 }).length, 0);
});

test('rejects duplicate approval and stale proposals', () => {
  const loader = new DataLoaderService();
  const validation = new ValidationService(loader);
  const audit = new AuditService(loader);
  const remediation = new RemediationService(
    loader,
    audit,
    new RiskService(loader, validation),
    validation,
  );
  const proposal = remediation.proposeUpdate(
    'proposal-template',
    'proposal-template.claim-1',
    'Updated pricing copy with a 10% maximum discount.',
  );
  loader.updateDocument(
    proposal.document_id,
    proposal.claim_id,
    'Changed after proposal creation.',
  );
  assert.throws(() => remediation.approveUpdate(proposal.id), /stale/);
});
