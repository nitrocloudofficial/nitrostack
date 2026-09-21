export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';
export type OperationKey = `${Uppercase<HttpMethod>} ${string}`;

export type ChangeCode =
  | 'OPERATION_REMOVED'
  | 'PARAMETER_REMOVED'
  | 'PARAMETER_BECAME_REQUIRED'
  | 'REQUIRED_PROPERTY_REMOVED'
  | 'PROPERTY_BECAME_REQUIRED'
  | 'PROPERTY_TYPE_CHANGED'
  | 'ENUM_NARROWED'
  | 'ENUM_WIDENED'
  | 'OPTIONAL_PROPERTY_ADDED'
  | 'UNSUPPORTED_CHANGE';

export interface ApiChange {
  id: string;
  code: ChangeCode;
  breaking: boolean;
  operation: string;
  location: 'path' | 'query' | 'header' | 'request' | 'response' | 'operation';
  jsonPath?: string;
  before?: unknown;
  after?: unknown;
  rationale: string;
  sourcePointers: { baseline?: string; candidate?: string };
}

export interface EvidenceItem {
  id: string;
  changeSemanticKey: string;
  consumerImpactKey: string;
  evidenceFingerprint: string;
  sourceMode: 'snapshot' | 'live';
  capturedAt: string;
  repository: string;
  branch: string;
  commitSha: string;
  searchQuery: string;
  relatedChangeIds: string[];
  filePath: string;
  lineStart: number;
  lineEnd: number;
  snippet: string;
  contentHash: string;
  htmlUrl?: string;
}

export type EvidenceClassification =
  | 'CONFIRMED_IMPACT'
  | 'LIKELY_IMPACT'
  | 'FALSE_POSITIVE'
  | 'REVIEW_REQUIRED'
  | 'TEST_ONLY'
  | 'DOCUMENTATION_ONLY'
  | 'GENERATED_CODE';

export interface MigrationAction {
  title: string;
  description: string;
  repository: string;
  filePath: string;
  lineNumber?: number;
  relatedChangeIds: string[];
}

export interface AssessedEvidence extends EvidenceItem {
  classification: EvidenceClassification;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  matchedChangeIds: string[];
  reasoning: string;
  migrationActions: MigrationAction[];
}

export type AnalysisStatus = 'RUNNING' | 'COMPLETE' | 'COMPLETE_WITH_WARNINGS' | 'INCOMPLETE' | 'FAILED';
export type DecisionStatus = 'PENDING' | 'APPROVED_FOR_RELEASE' | 'BLOCKED_PENDING_MIGRATION';

export interface ReleaseDecision {
  decision: Exclude<DecisionStatus, 'PENDING'>;
  reason?: string;
  actorId: string;
  actorDisplayName: string;
  decidedAt: string;
  idempotencyKey: string;
}

export interface PolicyEvaluation {
  evaluationId: string;
  assessmentId: string;
  assessmentVersion: number;
  policyProfile: 'STRICT' | 'BALANCED';
  policyVersion: '1.0.0';
  verdict: 'ALLOW' | 'BLOCK' | 'MANUAL_REVIEW';
  rules: Array<{
    ruleId: string;
    result: 'PASS' | 'FAIL' | 'UNKNOWN' | 'SKIPPED';
    effect: 'BLOCK' | 'MANUAL_REVIEW' | 'NONE';
    explanation: string;
    evidenceRefs: string[];
  }>;
  evaluatedAt: string;
}

export interface OwnershipResolution {
  resolutionId: string;
  assessmentId: string;
  assessmentVersion: number;
  resolvedAt: string;
  assignments: Array<{
    evidenceId: string;
    consumerImpactKey: string;
    repository: string;
    filePath: string;
    owners: string[];
    status: 'RESOLVED' | 'UNRESOLVED';
    source: 'CODEOWNERS' | 'REPOSITORY_FALLBACK' | 'NONE';
    codeownersPath?: string;
    matchedPattern?: string;
    matchedLine?: number;
    codeownersCommitSha?: string;
  }>;
  unresolvedCount: number;
  warnings: string[];
}

export interface EvidenceCoverage {
  repositoriesExpected: number;
  repositoriesChecked: number;
  repositoriesFailed: number;
  ratio: number;
}

export interface Assessment {
  id: string;
  scenarioId: string;
  analysisStatus: AnalysisStatus;
  decisionStatus: DecisionStatus;
  baselineSpecHash: string;
  candidateSpecHash: string;
  repositoryCommits: Record<string, string>;
  sourceMode: 'snapshot' | 'live';
  classifierMode: 'llm' | 'deterministic-fallback' | 'hybrid-with-fallback';
  modelProvider?: 'openai' | 'anthropic' | 'gemini';
  modelName?: string;
  modelStatus?: 'disabled' | 'not-needed' | 'success' | 'fallback';
  repositoryScopeVersion: number;
  evidenceSnapshotId?: string;
  coverage: EvidenceCoverage;
  changes: ApiChange[];
  evidence: AssessedEvidence[];
  overallSeverity: 'HIGH' | 'MEDIUM' | 'LOW';
  limitations: string[];
  durationMs: number;
  createdAt: string;
  updatedAt: string;
  version: number;
  expectedAssessmentVersion?: number;
  ownershipResolution?: OwnershipResolution;
  policyEvaluations: PolicyEvaluation[];
  decision?: ReleaseDecision;
}

export interface ScenarioSpecs {
  scenarioId: string;
  baseline: Record<string, unknown>;
  candidate: Record<string, unknown>;
}

export interface ArtifactStore {
  createOnce<T>(namespace: string, id: string, value: T): Promise<T>;
  get<T>(namespace: string, id: string): Promise<T | null>;
}
