import { ExecutionContext, Injectable, ResourceDecorator as Resource } from '@nitrostack/core';
import { AssessmentService } from './assessment.service.js';
import { EvidenceService } from './evidence.service.js';
import { RepositoryScopeRepository } from './repository-scope.repository.js';
import { SpecRepository } from './spec.repository.js';
import { LocalArtifactStore } from './artifact-store.service.js';

function jsonResource(uri: string, data: unknown) {
  return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) }] };
}

  @Injectable({
    deps: [
      SpecRepository,
      AssessmentService,
      RepositoryScopeRepository,
      EvidenceService,
      LocalArtifactStore
    ]
  })
  export class ApiGuardResources {
    constructor(
      private readonly specs: SpecRepository,
      private readonly assessments: AssessmentService,
      private readonly scopeRepository: RepositoryScopeRepository,
      private readonly evidenceService: EvidenceService,
      private readonly artifactStore: LocalArtifactStore
    ) {}

  @Resource({ uri: 'apiguard://scenarios/{scenarioId}/specs/baseline', name: 'Baseline OpenAPI specification', description: 'The currently released OpenAPI contract.', mimeType: 'application/json' })
  async baseline(uri: string, _ctx: ExecutionContext) {
    const match = /^apiguard:\/\/scenarios\/([^/]+)\/specs\/baseline$/.exec(uri);
    if (!match?.[1]) throw new Error('Invalid baseline resource URI.');
    return jsonResource(uri, await this.specs.getSpec(match[1], 'baseline'));
  }

  @Resource({ uri: 'apiguard://scenarios/{scenarioId}/specs/candidate', name: 'Candidate OpenAPI specification', description: 'The proposed OpenAPI contract under review.', mimeType: 'application/json' })
  async candidate(uri: string, _ctx: ExecutionContext) {
    const match = /^apiguard:\/\/scenarios\/([^/]+)\/specs\/candidate$/.exec(uri);
    if (!match?.[1]) throw new Error('Invalid candidate resource URI.');
    return jsonResource(uri, await this.specs.getSpec(match[1], 'candidate'));
  }

  @Resource({ uri: 'apiguard://assessments/{assessmentId}', name: 'APIGuard assessment', description: 'Read the latest analysis and human decision state for an assessment.', mimeType: 'application/json' })
  async assessment(uri: string, _ctx: ExecutionContext) {
    const match = /^apiguard:\/\/assessments\/(.+)$/.exec(uri);
    if (!match?.[1]) throw new Error('Invalid assessment resource URI.');
    return jsonResource(uri, this.assessments.get(match[1]));
  }

  @Resource({
    uri: 'apiguard://repository-scope',
    name: 'Repository assessment scope',
    description: 'Read the current versioned list of active and inactive consumer repositories in the impact assessment scope.',
    mimeType: 'application/json'
  })
  repositoryScope(uri: string, _ctx: ExecutionContext) {
    return jsonResource(uri, this.scopeRepository.getScope());
  }

  @Resource({
    uri: 'apiguard://evidence-snapshots/{snapshotId}',
    name: 'Evidence Snapshot V2',
    description: 'Read an immutable, provenance-tagged consumer code evidence snapshot.',
    mimeType: 'application/json'
  })
  evidenceSnapshot(uri: string, _ctx: ExecutionContext) {
    const match = /^apiguard:\/\/evidence-snapshots\/(.+)$/.exec(uri);
    if (!match?.[1]) throw new Error('Invalid snapshot resource URI.');
    const snapshot = this.evidenceService.getSnapshot(match[1]);
    if (!snapshot) throw new Error(`Evidence snapshot ${match[1]} was not found.`);
    return jsonResource(uri, snapshot);
  }
  @Resource({
    uri: 'apiguard://evidence-packages/{bundleId}',
    name: 'Evidence Package',
    description: 'Read an exported release evidence package bundle.',
    mimeType: 'application/json'
  })
  async evidencePackage(uri: string, _ctx: ExecutionContext) {
    const match = /^apiguard:\/\/evidence-packages\/(.+)$/.exec(uri);
    if (!match?.[1]) throw new Error('Invalid evidence package resource URI.');
    const bundle = await this.artifactStore.get('evidence-packages', match[1]);
    if (!bundle) throw new Error(`Evidence package ${match[1]} was not found.`);
    return jsonResource(uri, bundle);
  }
}
