import { ApiGuardConfig } from '../src/modules/apiguard/config.service.js';
import { SpecRepository } from '../src/modules/apiguard/spec.repository.js';
import { ContractService } from '../src/modules/apiguard/contract.service.js';
import { DiffService } from '../src/modules/apiguard/diff.service.js';
import { SnapshotEvidenceProvider } from '../src/modules/apiguard/snapshot-evidence.provider.js';
import { GitHubEvidenceProvider } from '../src/modules/apiguard/github-evidence.provider.js';
import { EvidenceSnapshotRepository } from '../src/modules/apiguard/evidence-snapshot.repository.js';
import { EvidenceService } from '../src/modules/apiguard/evidence.service.js';
import { RiskService } from '../src/modules/apiguard/risk.service.js';
import { AssessmentRepository } from '../src/modules/apiguard/assessment.repository.js';
import { OwnershipService } from '../src/modules/apiguard/ownership.service.js';
import { PolicyService } from '../src/modules/apiguard/policy.service.js';
import { LocalArtifactStore } from '../src/modules/apiguard/artifact-store.service.js';
import { PrPublisherService } from '../src/modules/apiguard/pr-publisher.service.js';
import { AssessmentService } from '../src/modules/apiguard/assessment.service.js';
import { RepositoryScopeRepository } from '../src/modules/apiguard/repository-scope.repository.js';
import { RepositoryScopeService } from '../src/modules/apiguard/repository-scope.service.js';
import { ApiGuardTools } from '../src/modules/apiguard/apiguard.tools.js';

async function run() {
  console.log('Initializing E2E test components...');
  const config = new ApiGuardConfig();
  const specRepo = new SpecRepository(config);
  const contract = new ContractService(config);
  const diffService = new DiffService();
  const scopeRepo = new RepositoryScopeRepository(config);
  const snapshotRepo = new EvidenceSnapshotRepository(config);
  const snapProv = new SnapshotEvidenceProvider(config);
  const ghProv = new GitHubEvidenceProvider(config, scopeRepo);
  const evidenceService = new EvidenceService(config, snapProv, ghProv, snapshotRepo);
  const riskService = new RiskService(config);
  const assessmentRepo = new AssessmentRepository();
  const scopeService = new RepositoryScopeService(config, scopeRepo);
  const assessmentService = new AssessmentService(specRepo, diffService, evidenceService, riskService, assessmentRepo, scopeRepo);
  const ownershipService = new OwnershipService();
  const policyService = new PolicyService(specRepo);
  const artifactStore = new LocalArtifactStore();
  const prPublisherService = new PrPublisherService(config);
  const tools = new ApiGuardTools(
    config,
    specRepo,
    contract,
    diffService,
    evidenceService,
    riskService,
    assessmentService,
    scopeService,
    ownershipService,
    policyService,
    artifactStore,
    prPublisherService
  );

  const ctx = {
    auth: { subject: 'e2e-tester' },
    logger: { info: console.log, warn: console.warn, error: console.error },
    task: { progress: () => {} }
  } as any;

  console.log('\n--- 1. Diff API Spec ---');
  const diffResult = await tools.diffApiSpec({ scenarioId: 'risky' }, ctx);
  console.log(diffResult.summary);

  console.log('\n--- 2. Manage Repository Scope ---');
  const scopeRes = await tools.manageRepositoryScope({
    action: 'ADD',
    owner: config.githubOwner,
    repository: 'apiguard-react-consumer',
    reason: 'E2E Testing',
    confirmed: true
  }, ctx as any);
  console.log(`Action: ${scopeRes.action}, Changed: ${scopeRes.changed}, Version: ${scopeRes.scope.version}`);

  console.log('\n--- 3. Refresh Evidence ---');
  const refreshResult = await tools.refreshRepositoryEvidence({ scenarioId: 'risky', forceRefresh: true }, ctx);
  console.log(`Snapshot: ${refreshResult.snapshotId}, Status: ${refreshResult.status}, Failed: ${refreshResult.repositoriesFailed}`);

  console.log('\n--- 4. Run Impact Assessment ---');
  const assessResult = await tools.runImpactAssessment({ scenarioId: 'risky' }, ctx);
  console.log(`Assessment ID: ${assessResult.id}`);
  console.log(`Status: ${assessResult.analysisStatus}, Severity: ${assessResult.overallSeverity}`);

  console.log('\n--- 5. Resolve Consumer Owners ---');
  const ownershipResult = await tools.resolveConsumerOwners({ assessmentId: assessResult.id }, ctx);
  console.log(`Resolution ID: ${ownershipResult.resolutionId}, Assignments: ${ownershipResult.assignments}, Unresolved: ${ownershipResult.unresolvedCount}`);

  console.log('\n--- 6. Evaluate Release Policy ---');
  const policyResult = await tools.evaluateReleasePolicy({ assessmentId: assessResult.id, profile: 'STRICT' }, ctx);
  console.log(`Verdict: ${policyResult.verdict}, Rules evaluated: ${policyResult.rules.length}`);

  console.log('\n--- 7. Export Release Evidence Package ---');
  const exportResult = await tools.exportReleaseEvidencePackage({ assessmentId: assessResult.id }, ctx);
  console.log(`Bundle exported to: ${exportResult.artifactUri}`);

  console.log('\n--- 8. Verify Migration Readiness ---');
  const verifyResult = await tools.verifyMigrationReadiness({ bundleId: exportResult.bundleId }, ctx);
  console.log(`Ready for migration: ${verifyResult.readyForMigration}`);
  console.log(`Reason: ${verifyResult.reason}`);

  console.log('\n--- 9. Record Release Decision ---');
  const decisionResult = await tools.recordDecision({
    assessmentId: assessResult.id,
    expectedVersion: assessResult.version || 1,
    decision: 'BLOCK',
    idempotencyKey: 'e2e-test-key-1',
    reason: 'Failing STRICT policy and unowned code'
  }, ctx);
  console.log(`Decision State: ${decisionResult.decisionStatus}`);

  console.log('\n--- 10. GitHub write guard ---');
  const publishResult: any = await tools.publishAssessmentToPr({
    assessmentId: assessResult.id,
    prUrl: 'https://github.com/arckrisofficial/api-larp/pull/42',
    idempotencyKey: `pr42_${assessResult.id}`,
    confirmed: true
  }, ctx);
  if (!('error' in publishResult) || !String(publishResult.message).includes('GitHub writes are disabled')) {
    throw new Error('Offline E2E expected the GitHub write guard to reject publication.');
  }
  console.log('GitHub writes remained disabled during offline E2E.');

  console.log('\nE2E TEST PASSED!');
}

run().catch((err) => {
  console.error('E2E TEST FAILED:', err);
  process.exit(1);
});
