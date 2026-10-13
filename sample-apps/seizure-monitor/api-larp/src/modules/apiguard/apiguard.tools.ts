import { ExecutionContext, Injectable, ToolDecorator as Tool, Widget, z } from '@nitrostack/core';
import { sha256 } from '../../domain/hash.js';
import { evaluateMigrationReadiness } from '../../domain/migration-readiness.js';
import { ApiGuardConfig } from './config.service.js';
import { AssessmentService } from './assessment.service.js';
import { ContractService } from './contract.service.js';
import { DiffService } from './diff.service.js';
import { EvidenceService } from './evidence.service.js';
import { RiskService } from './risk.service.js';
import { RepositoryScopeService } from './repository-scope.service.js';
import { SpecRepository } from './spec.repository.js';
import { OwnershipService } from './ownership.service.js';
import { PolicyService } from './policy.service.js';

import { LocalArtifactStore } from './artifact-store.service.js';

import { PrPublisherService } from './pr-publisher.service.js';

function CatchError() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const ctx = args.find(a => a && typeof a.logger?.error === 'function');
        if (ctx) ctx.logger.error(`[Tool:${propertyKey}] failed: ${message}`);
        return { error: true, message };
      }
    };
    return descriptor;
  };
}

const ScenarioInput = z.object({
  scenarioId: z.string().regex(/^[a-z0-9_-]+$/i).optional().default('risky').describe('Fixture or registered scenario identifier.')
});

@Injectable({
  deps: [
    ApiGuardConfig,
    SpecRepository,
    ContractService,
    DiffService,
    EvidenceService,
    RiskService,
    AssessmentService,
    RepositoryScopeService,
    OwnershipService,
    PolicyService,
    LocalArtifactStore,
    PrPublisherService
  ]
})
export class ApiGuardTools {
  constructor(
    private readonly config: ApiGuardConfig,
    private readonly specs: SpecRepository,
    private readonly contractService: ContractService,
    private readonly diffService: DiffService,
    private readonly evidenceService: EvidenceService,
    private readonly riskService: RiskService,
    private readonly assessmentService: AssessmentService,
    private readonly scopeService: RepositoryScopeService,
    private readonly ownershipService: OwnershipService,
    private readonly policyService: PolicyService,
    private readonly artifactStore: LocalArtifactStore,
    private readonly prPublisherService: PrPublisherService
  ) {}

  @Tool({
    name: 'register_api_contract_pair',
    description: 'Register a new baseline and candidate OpenAPI 3.0 contract pair dynamically from inline JSON objects/strings or HTTP URLs.',
    inputSchema: z.object({
      scenarioId: z.string().regex(/^[a-z0-9_-]+$/i).optional().describe('Custom scenario identifier. Auto-generated if omitted.'),
      baselineSpec: z.union([z.record(z.unknown()), z.string()]).optional().describe('Inline baseline OpenAPI JSON object or string.'),
      candidateSpec: z.union([z.record(z.unknown()), z.string()]).optional().describe('Inline candidate OpenAPI JSON object or string.'),
      baselineUrl: z.string().url().optional().describe('HTTP URL to fetch baseline OpenAPI spec.'),
      candidateUrl: z.string().url().optional().describe('HTTP URL to fetch candidate OpenAPI spec.')
    }),
    invocation: { invoking: 'Registering OpenAPI contract pair…', invoked: 'OpenAPI contract pair registered' },
    examples: {
      request: {
        scenarioId: 'custom_user_v2',
        baselineSpec: { openapi: '3.0.0', info: { title: 'User API', version: '1.0' }, paths: {} },
        candidateSpec: { openapi: '3.0.0', info: { title: 'User API', version: '2.0' }, paths: {} }
      },
      response: { scenarioId: 'custom_user_v2', sourceType: 'INLINE', operationCountBaseline: 0, operationCountCandidate: 0 }
    }
  })
  @CatchError()
  async registerContractPair(
    input: {
      scenarioId?: string;
      baselineSpec?: Record<string, unknown> | string;
      candidateSpec?: Record<string, unknown> | string;
      baselineUrl?: string;
      candidateUrl?: string;
    },
    ctx: ExecutionContext
  ) {
    if ((!input.baselineSpec || !input.candidateSpec) && (!input.baselineUrl || !input.candidateUrl)) {
      throw new Error('Provide either (baselineSpec and candidateSpec) or (baselineUrl and candidateUrl).');
    }
    const result = await this.contractService.register(input);
    ctx.logger.info('Contract pair registered', { scenarioId: result.scenarioId, sourceType: result.sourceType });
    return result;
  }

  @Tool({
    name: 'diff_api_spec',
    description: 'Deterministically compare baseline and candidate OpenAPI 3.0 specifications and return typed compatibility changes and summary statistics.',
    inputSchema: ScenarioInput,
    invocation: { invoking: 'Comparing API contracts…', invoked: 'API contract comparison complete' },
    examples: { request: { scenarioId: 'risky' }, response: { scenarioId: 'risky', summary: { totalChanges: 4, breakingChanges: 3 } } }
  })
  @Widget('contract-diff-summary')
  @CatchError()
  async diffApiSpec(input: { scenarioId?: string }, ctx: ExecutionContext) {
    const { scenarioId } = ScenarioInput.parse(input ?? {});
    const scenario = await this.specs.getScenario(scenarioId);
    const changes = this.diffService.diff(scenario);

    const baselineHash = sha256(scenario.baseline);
    const candidateHash = sha256(scenario.candidate);
    const diffHash = sha256(changes);

    const breakingChanges = changes.filter((c) => c.breaking).length;
    const nonBreakingChanges = changes.filter((c) => !c.breaking && c.code !== 'UNSUPPORTED_CHANGE').length;
    const unsupportedChanges = changes.filter((c) => c.code === 'UNSUPPORTED_CHANGE').length;

    ctx.logger.info('OpenAPI diff completed', { scenarioId, changeCount: changes.length });

    return {
      scenarioId,
      sourceType: 'FIXTURE',
      baselineSpecHash: baselineHash,
      candidateSpecHash: candidateHash,
      diffHash,
      validation: {
        openApiVersion: String(scenario.candidate.openapi ?? '3.0.0'),
        warnings: unsupportedChanges > 0 ? [`${unsupportedChanges} unsupported OpenAPI change constructs were detected.`] : []
      },
      summary: {
        totalChanges: changes.length,
        breakingChanges,
        nonBreakingChanges,
        unsupportedChanges
      },
      changes
    };
  }

  @Tool({
    name: 'refresh_repository_evidence',
    taskSupport: 'optional',
    description: 'Perform an evidence scan across active scope repositories, update commit SHAs, and generate an immutable versioned EvidenceSnapshotV2 package.',
    inputSchema: z.object({
      scenarioId: z.string().regex(/^[a-z0-9_-]+$/i).optional().default('risky').describe('Scenario identifier.'),
      repositories: z.array(z.string()).optional().describe('Optional subset of repositories to refresh.'),
      forceRefresh: z.boolean().default(false).describe('Clear evidence cache before scanning when true.')
    }),
    invocation: { invoking: 'Scanning repositories for consumer evidence…', invoked: 'Evidence snapshot package generated' },
    examples: {
      request: { scenarioId: 'risky', forceRefresh: false },
      response: { snapshotId: 'snap_123', status: 'COMPLETE', evidenceItems: 4 }
    }
  })
  @CatchError()
  async refreshRepositoryEvidence(
    input: { scenarioId?: string; repositories?: string[]; forceRefresh?: boolean },
    ctx: ExecutionContext
  ) {
    const scenarioId = input.scenarioId || 'risky';
    const scenario = await this.specs.getScenario(scenarioId);
    const changes = this.diffService.diff(scenario);

    const pair = await this.evidenceService.discoverSnapshot(
      scenarioId,
      changes,
      sha256(scenario.baseline),
      sha256(scenario.candidate),
      input.forceRefresh,
      input.repositories
    );

    const snapshot = pair.snapshot;
    const status = snapshot.coverage.repositoriesFailed > 0 ? 'PARTIAL' : 'COMPLETE';

    ctx.logger.info('Evidence snapshot created', { snapshotId: snapshot.snapshotId, items: snapshot.results.length });

    return {
      scenarioId,
      snapshotId: snapshot.snapshotId,
      status,
      repositoryScopeVersion: snapshot.repositoryScopeVersion,
      repositoriesExpected: snapshot.coverage.repositoriesExpected,
      repositoriesChecked: snapshot.coverage.repositoriesChecked,
      repositoriesFailed: snapshot.coverage.repositoriesFailed,
      evidenceItems: snapshot.results.length,
      generatedAt: snapshot.generatedAt,
      baselineSpecHash: snapshot.baselineSpecHash,
      candidateSpecHash: snapshot.candidateSpecHash,
      resourceUri: `apiguard://evidence-snapshots/${snapshot.snapshotId}`,
      nextAction: 'RUN_IMPACT_ASSESSMENT'
    };
  }

  @Tool({
    name: 'assess_consumer_risk',
    description: 'Classify consumer evidence using deterministic rules and bounded LLM reasoning against a fixed snapshot or scenario.',
    inputSchema: z.object({
      scenarioId: z.string().regex(/^[a-z0-9_-]+$/i).optional().default('risky').describe('Scenario identifier.'),
      snapshotId: z.string().optional().describe('Optional EvidenceSnapshotV2 ID to assess.')
    }),
    invocation: { invoking: 'Assessing consumer impact…', invoked: 'Consumer impact assessed' },
    examples: { request: { scenarioId: 'risky' }, response: { overallSeverity: 'HIGH', classifierMode: 'deterministic-fallback' } }
  })
  @Widget('consumer-risk-assessment')
  @CatchError()
  async assessRisk(input: { scenarioId?: string; snapshotId?: string }, ctx: ExecutionContext) {
    const scenarioId = input.scenarioId || 'risky';
    const scenario = await this.specs.getScenario(scenarioId);
    const changes = this.diffService.diff(scenario);

    let snapshot = input.snapshotId ? this.evidenceService.getSnapshot(input.snapshotId) : undefined;
    if (!snapshot) {
      const pair = await this.evidenceService.discoverSnapshot(scenarioId, changes);
      snapshot = pair.snapshot;
    }

    const items = this.evidenceService.toEvidenceItems(snapshot);

    const risk = await this.riskService.assess(changes, items);
    ctx.logger.info('Consumer risk assessed', { severity: risk.severity, classifierMode: risk.classifierMode });

    return {
      riskRunId: `risk_${sha256(items).slice(0, 10)}`,
      scenarioId,
      snapshotId: snapshot.snapshotId,
      classifierMode: risk.classifierMode,
      overallSeverity: risk.severity,
      limitations: risk.limitations,
      evidence: risk.evidence
    };
  }

  @Tool({
    name: 'resolve_consumer_owners',
    description: 'Find CODEOWNERS for all identified evidence using the original EvidenceSnapshotV2.',
    inputSchema: z.object({
      assessmentId: z.string().regex(/^asm_[a-z0-9-]+$/).describe('The Assessment ID to resolve owners for.')
    }),
    invocation: { invoking: 'Resolving owners...', invoked: 'Owners resolved' }
  })
  @Widget('ownership-resolution')
  @CatchError()
  async resolveConsumerOwners(input: { assessmentId: string }, ctx: ExecutionContext) {
    const assessment = this.assessmentService.get(input.assessmentId);
    if (!assessment) throw new Error(`Assessment ${input.assessmentId} not found`);
    if (!assessment.evidenceSnapshotId) throw new Error(`Assessment ${input.assessmentId} has no associated evidence snapshot`);
    const snapshot = this.evidenceService.getSnapshot(assessment.evidenceSnapshotId);
    if (!snapshot) throw new Error(`Snapshot ${assessment.evidenceSnapshotId} not found`);

    const resolution = await this.ownershipService.resolve(assessment, snapshot);
    assessment.ownershipResolution = resolution;
    this.assessmentService.update(assessment);
    
    return {
      resolutionId: resolution.resolutionId,
      assessmentId: resolution.assessmentId,
      resolvedAt: resolution.resolvedAt,
      assignments: resolution.assignments.length,
      unresolvedCount: resolution.unresolvedCount,
      warnings: resolution.warnings
    };
  }

  @Tool({
    name: 'evaluate_release_policy',
    description: 'Evaluate a semantic assessment against a deterministic policy profile.',
    inputSchema: z.object({
      assessmentId: z.string().regex(/^asm_[a-z0-9-]+$/).describe('The Assessment ID to evaluate.'),
      profile: z.enum(['STRICT', 'BALANCED']).default('STRICT').describe('Policy profile to enforce.')
    }),
    invocation: { invoking: 'Evaluating policy...', invoked: 'Policy evaluated' }
  })
  @Widget('policy-evaluation')
  @CatchError()
  async evaluateReleasePolicy(input: { assessmentId: string; profile?: 'STRICT' | 'BALANCED' }, ctx: ExecutionContext) {
    const assessment = this.assessmentService.get(input.assessmentId);
    if (!assessment) throw new Error(`Assessment ${input.assessmentId} not found`);

    const evaluation = await this.policyService.evaluate(assessment, input.profile || 'STRICT');
    if (!assessment.policyEvaluations) assessment.policyEvaluations = [];
    assessment.policyEvaluations.push(evaluation);
    this.assessmentService.update(assessment);

    return evaluation;
  }


  @Tool({
    name: 'run_impact_assessment',
    description: 'Run the complete reliable APIGuard workflow and persist a versioned release-impact assessment.',
    inputSchema: z.object({
      scenarioId: z.string().regex(/^[a-z0-9_-]+$/i).optional().default('risky').describe('Scenario identifier.'),
      snapshotId: z.string().optional().describe('Optional EvidenceSnapshotV2 ID to analyze.'),
      forceRefresh: z.boolean().default(false).describe('Force fresh evidence discovery when true.')
    }),
    invocation: { invoking: 'Building the API release evidence package…', invoked: 'API release evidence package ready' },
    examples: { request: { scenarioId: 'risky' }, response: { analysisStatus: 'COMPLETE', overallSeverity: 'HIGH' } }
  })
  @Widget('api-impact-summary')
  @CatchError()
  async runImpactAssessment(input: { scenarioId?: string; snapshotId?: string; forceRefresh?: boolean }, ctx: ExecutionContext) {
    const scenarioId = input.scenarioId || 'risky';
    const assessment = await this.assessmentService.run({ scenarioId, snapshotId: input.snapshotId, forceRefresh: input.forceRefresh });
    ctx.logger.info('Impact assessment completed', {
      assessmentId: assessment.id,
      durationMs: assessment.durationMs,
      severity: assessment.overallSeverity,
      status: assessment.analysisStatus
    });
    return assessment;
  }

  @Tool({
    name: 'record_release_decision',
    description: 'Record an idempotent human approval or block decision against a completed versioned assessment.',
    inputSchema: z.object({
      assessmentId: z.string().min(1),
      expectedVersion: z.number().int().positive(),
      decision: z.enum(['APPROVE', 'BLOCK']),
      reason: z.string().max(500).optional(),
      idempotencyKey: z.string().min(8).max(160)
    }),
    invocation: { invoking: 'Recording release decision…', invoked: 'Release decision recorded' },
    examples: {
      request: { assessmentId: 'asm_preview', expectedVersion: 1, decision: 'BLOCK', reason: 'Consumers use old contract.', idempotencyKey: 'key_123' },
      response: { decisionStatus: 'BLOCKED_PENDING_MIGRATION', version: 2 }
    }
  })
  @Widget('api-impact-summary')
  @CatchError()
  async recordDecision(
    input: {
      assessmentId: string;
      expectedVersion: number;
      decision: 'APPROVE' | 'BLOCK';
      reason?: string;
      idempotencyKey: string;
    },
    ctx: ExecutionContext
  ) {
    // Derive actor from authenticated context, preventing caller impersonation
    const actorId = (ctx as any).auth?.subject ?? this.config.actorId;
    const actorDisplayName = (ctx as any).auth?.displayName ?? this.config.actorDisplayName;

    const assessment = this.assessmentService.decide({
      ...input,
      actorId,
      actorDisplayName
    });

    ctx.logger.info('Release decision recorded', {
      assessmentId: assessment.id,
      decisionStatus: assessment.decisionStatus,
      version: assessment.version,
      actorId
    });
    return assessment;
  }

  @Tool({
    name: 'manage_repository_scope',
    description: 'Add or deactivate a GitHub repository in the consumer-impact assessment scope. Adding validates the repository against GitHub, resolves the default branch, and pins the latest commit SHA. Removing marks the repository INACTIVE without deleting historical evidence.',
    inputSchema: z.object({
      action: z.enum(['ADD', 'REMOVE']).describe('ADD makes the repository active in the scope. REMOVE deactivates it without deleting evidence.'),
      owner: z.string().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/).describe('GitHub repository owner (user or organisation).'),
      repository: z.string().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/).describe('GitHub repository name (without owner prefix).'),
      branch: z.string().min(1).max(200).optional().describe('Branch to pin. Defaults to the repository default branch.'),
      reason: z.string().min(5).max(500).describe('Why this repository is being added or removed.'),
      confirmed: z.literal(true).describe('Must be true. Confirms the operator intends to mutate the assessment scope.')
    }),
    invocation: { invoking: 'Updating repository assessment scope…', invoked: 'Repository assessment scope updated' },
    examples: {
      request: { action: 'ADD', owner: 'arckrisofficial', repository: 'api-larp', reason: 'This application consumes the User API.', confirmed: true },
      response: { changed: true, action: 'ADD', repository: { owner: 'arckrisofficial', name: 'api-larp', status: 'ACTIVE' }, snapshotStatus: 'STALE' }
    }
  })
  @CatchError()
  async manageRepositoryScope(
    input: {
      action: 'ADD' | 'REMOVE';
      owner: string;
      repository: string;
      branch?: string;
      reason: string;
      confirmed: true;
    },
    ctx: ExecutionContext
  ) {
    const actorId = (ctx as any).auth?.subject ?? this.config.actorId;
    const result = input.action === 'ADD'
      ? await this.scopeService.applyAdd({ owner: input.owner, repository: input.repository, branch: input.branch, reason: input.reason, actorId })
      : await this.scopeService.applyRemove({ owner: input.owner, repository: input.repository, reason: input.reason, actorId });
    ctx.logger.info('Repository scope updated', { action: input.action, repo: `${input.owner}/${input.repository}`, changed: result.changed });
    return result;
  }
  @Tool({
    name: 'export_release_evidence_package',
    description: 'Export an immutable, standalone JSON evidence bundle containing the snapshot, semantic analysis, ownership and policy decisions.',
    inputSchema: z.object({
      assessmentId: z.string().regex(/^asm_[a-z0-9-]+$/).describe('The Assessment ID to export.')
    }),
    invocation: { invoking: 'Exporting evidence bundle...', invoked: 'Evidence bundle exported' }
  })
  @CatchError()
  async exportReleaseEvidencePackage(input: { assessmentId: string }, ctx: ExecutionContext) {
    const assessment = this.assessmentService.get(input.assessmentId);
    if (!assessment) throw new Error(`Assessment ${input.assessmentId} not found`);

    if (!assessment.evidenceSnapshotId) throw new Error(`Assessment has no snapshot ID.`);
    const snapshot = this.evidenceService.getSnapshot(assessment.evidenceSnapshotId);
    if (!snapshot) throw new Error(`Snapshot ${assessment.evidenceSnapshotId} not found`);

    const timestamp = assessment.updatedAt || assessment.createdAt || new Date().toISOString();
    const bundle = {
      bundleId: `pkg_${sha256([assessment.id, assessment.version, timestamp].join('|')).slice(0, 16)}`,
      exportedAt: timestamp,
      assessment,
      snapshot
    };

    await this.artifactStore.createOnce('evidence-packages', bundle.bundleId, bundle);
    
    return {
      bundleId: bundle.bundleId,
      exportedAt: bundle.exportedAt,
      artifactUri: `apiguard://evidence-packages/${bundle.bundleId}`,
      fileSize: Buffer.byteLength(JSON.stringify(bundle), 'utf8')
    };
  }

  @Tool({
    name: 'verify_migration_readiness',
    description: 'Provide an overall readiness check on the package before proceeding to code migration tooling.',
    inputSchema: z.object({
      bundleId: z.string().regex(/^pkg_[a-z0-9]+$/).describe('The Evidence Package ID to verify.')
    }),
    invocation: { invoking: 'Verifying readiness...', invoked: 'Readiness verified' }
  })
  @Widget('migration-readiness')
  @CatchError()
  async verifyMigrationReadiness(input: { bundleId: string }, ctx: ExecutionContext) {
    const bundle = await this.artifactStore.get<any>('evidence-packages', input.bundleId);
    if (!bundle) throw new Error(`Evidence package ${input.bundleId} not found.`);

    return {
      bundleId: input.bundleId,
      ...evaluateMigrationReadiness(bundle.assessment)
    };
  }

  @Tool({
    name: 'publish_assessment_to_pr',
    description: 'Publish the assessment summary as a real comment on an existing allow-listed GitHub pull request.',
    inputSchema: z.object({
      assessmentId: z.string().regex(/^asm_[a-z0-9-]+$/).describe('The Assessment ID to publish.'),
      prUrl: z.string().url().describe('The URL of the GitHub Pull Request to publish to.'),
      idempotencyKey: z.string().min(8).max(160).describe('Idempotency key that prevents duplicate comments.'),
      confirmed: z.literal(true).describe('Must be true to authorize this GitHub write.')
    }),
    invocation: { invoking: 'Publishing to PR...', invoked: 'Published to PR' }
  })
  @CatchError()
  async publishAssessmentToPr(input: { assessmentId: string; prUrl: string; idempotencyKey: string; confirmed: true }, ctx: ExecutionContext) {
    const assessment = this.assessmentService.get(input.assessmentId);
    if (!assessment) throw new Error(`Assessment ${input.assessmentId} not found`);

    return this.prPublisherService.publish(assessment, input.prUrl, input.idempotencyKey);
  }

  @Tool({
    name: 'get_pinned_migration_sources',
    description: 'Read complete confirmed-impact source files from the assessment-pinned GitHub commit and return their exact SHA-256 hashes for a guarded draft migration PR. This tool is read-only.',
    inputSchema: z.object({
      assessmentId: z.string().regex(/^asm_[a-z0-9-]+$/),
      repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
      paths: z.array(z.string().min(1).max(500)).min(1).max(10).optional()
    }),
    invocation: { invoking: 'Reading assessment-pinned migration sources…', invoked: 'Pinned migration sources ready' }
  })
  @CatchError()
  async getPinnedMigrationSources(input: {
    assessmentId: string;
    repository: string;
    paths?: string[];
  }, ctx: ExecutionContext) {
    const assessment = this.assessmentService.get(input.assessmentId);
    if (!assessment) throw new Error(`Assessment ${input.assessmentId} not found`);
    const result = await this.prPublisherService.getPinnedMigrationSources({
      assessment,
      repository: input.repository,
      paths: input.paths
    });
    ctx.logger.info('Pinned migration sources read', {
      assessmentId: input.assessmentId,
      repository: result.repository,
      files: result.files.length
    });
    return result;
  }

  @Tool({
    name: 'create_migration_pull_requests',
    description: 'Create one guarded draft GitHub migration pull request from reviewable complete-file changes against an assessment-pinned commit.',
    inputSchema: z.object({
      assessmentId: z.string().regex(/^asm_[a-z0-9-]+$/),
      repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
      files: z.array(z.object({
        path: z.string().min(1).max(500),
        proposedContent: z.string().min(1).max(200000),
        expectedSourceHash: z.string().regex(/^[a-f0-9]{64}$/i)
      })).min(1).max(10),
      title: z.string().min(3).max(200).optional(),
      idempotencyKey: z.string().min(8).max(160),
      confirmed: z.literal(true)
    }),
    invocation: { invoking: 'Creating guarded draft migration pull request…', invoked: 'Draft migration pull request created' }
  })
  @CatchError()
  async createMigrationPullRequests(input: {
    assessmentId: string;
    repository: string;
    files: Array<{ path: string; proposedContent: string; expectedSourceHash: string }>;
    title?: string;
    idempotencyKey: string;
    confirmed: true;
  }, ctx: ExecutionContext) {
    const assessment = this.assessmentService.get(input.assessmentId);
    const result = await this.prPublisherService.createDraftPullRequest({
      assessment,
      repository: input.repository,
      files: input.files,
      title: input.title,
      idempotencyKey: input.idempotencyKey
    });
    ctx.logger.info('Draft migration pull request created', {
      assessmentId: input.assessmentId,
      repository: result.repository,
      pullRequestNumber: result.pullRequestNumber,
      draft: result.draft,
      idempotentReplay: result.idempotentReplay
    });
    return result;
  }
}
