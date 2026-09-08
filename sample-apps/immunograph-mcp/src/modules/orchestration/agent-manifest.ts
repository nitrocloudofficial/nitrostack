export const AGENT_MANIFEST_VERSION = 'prd-v1.1.0';
export const AGENTIC_WORKFLOW_PLAN_VERSION = 'prd-v1.1.0';

export type ToolGroupName =
  | 'Immunoinformatics Tools'
  | 'Evidence Tools'
  | 'Constraint Tools'
  | 'Structure Tools'
  | 'Chemistry Tools'
  | 'Docking Tools'
  | 'Report / Export Tools';

export type InternalAgentStatus = 'ACTIVE';

export interface InternalAgent {
  agentId: string;
  displayName: string;
  role: string;
  status: InternalAgentStatus;
  scope: string;
  responsibilities: readonly string[];
  allowedToolGroups: readonly ToolGroupName[];
  maxIterations: number;
  contextBudget: string;
  retryPolicy: string;
  abstentionConditions: readonly string[];
  forbiddenActions: readonly string[];
  decisionPolicy: {
    mayGenerateScientificValues: boolean;
    mustUseMcpToolsForEvidence: boolean;
    mustExposeProvenance: boolean;
    abstainWhenEvidenceMissing: boolean;
    llmOutputTrustedWithoutValidation: boolean;
  };
}

export interface WorkflowPlanNode {
  nodeId: string;
  label: string;
  agentId: string;
  toolNames: readonly string[];
  approvalRequired: boolean;
  output: string;
}

export interface WorkflowPlanEdge {
  from: string;
  to: string;
  condition: string;
}

export interface AgenticWorkflowDescription {
  deploymentBoundary: 'ONE_NITROSTACK_MCP_APP';
  manifestVersion: string;
  planVersion: string;
  runId: string;
  runIntent: 'MVP_EPITOPE_PRIORITIZATION';
  agents: readonly InternalAgent[];
  workflowPlan: {
    nodes: readonly WorkflowPlanNode[];
    edges: readonly WorkflowPlanEdge[];
    humanApprovalGates: readonly string[];
  };
  guardrails: {
    authRequired: false;
    langGraphRequired: true;
    llmAgentModeRequiredWhenConfigured: true;
    deterministicFallbackRequired: true;
    graphBepiMode: 'FIXTURE_ONLY';
    syntheticScientificUse: false;
  };
  finalResearchPackage: {
    requiredArtifact: 'research-package.zip';
    includesCsvExports: true;
    requiredSections: readonly string[];
  };
}

const DECISION_POLICY = {
  mayGenerateScientificValues: false,
  mustUseMcpToolsForEvidence: true,
  mustExposeProvenance: true,
  abstainWhenEvidenceMissing: true,
  llmOutputTrustedWithoutValidation: false,
} as const;

const COMMON_FORBIDDEN = [
  'Invent scientific scores or docking values.',
  'Bypass typed MCP tools.',
  'Bypass human approval gates.',
  'Hide synthetic, cached, fixture, failed, or abstained provenance.',
] as const;

const COMMON_ABSTAIN = [
  'Required tool repeatedly fails.',
  'Required evidence is missing.',
  'Schema validation fails.',
  'Conclusion would require unsupported inference.',
] as const;

export const INTERNAL_AGENTS: readonly InternalAgent[] = [
  {
    agentId: 'supervisor-orchestrator',
    displayName: 'Supervisor Agent',
    role: 'Plans the LangGraph workflow, assigns bounded agents, handles dependencies, failures, approvals, and safe termination.',
    status: 'ACTIVE',
    scope:
      'Whole-run orchestration across immunology, structure, chemistry, docking, ranking, verification, and reporting.',
    responsibilities: [
      'Create the execution graph.',
      'Route each stage to a permitted bounded agent.',
      'Manage retries, fallbacks, approval pauses, and safe termination.',
    ],
    allowedToolGroups: [
      'Immunoinformatics Tools',
      'Evidence Tools',
      'Constraint Tools',
      'Structure Tools',
      'Chemistry Tools',
      'Docking Tools',
      'Report / Export Tools',
    ],
    maxIterations: 5,
    contextBudget: 'workflow-state-only',
    retryPolicy: 'retry transient tool failures at most twice, then fallback or abstain',
    abstentionConditions: COMMON_ABSTAIN,
    forbiddenActions: COMMON_FORBIDDEN,
    decisionPolicy: DECISION_POLICY,
  },
  {
    agentId: 'intake-policy',
    displayName: 'Intake / Policy Agent',
    role: 'Validates objective, mode, policy, and configuration completeness before execution.',
    status: 'ACTIVE',
    scope: 'Objective, run mode, selected profiles, connector policy, and approval summary.',
    responsibilities: [
      'Validate run objective and mode.',
      'Check profile and connector policy completeness.',
      'Prepare configuration approval summary.',
    ],
    allowedToolGroups: ['Evidence Tools', 'Report / Export Tools'],
    maxIterations: 3,
    contextBudget: 'configuration-summary-only',
    retryPolicy: 'no retries for invalid policy; request configuration changes',
    abstentionConditions: COMMON_ABSTAIN,
    forbiddenActions: COMMON_FORBIDDEN,
    decisionPolicy: DECISION_POLICY,
  },
  {
    agentId: 'sequence-validation',
    displayName: 'Sequence Validation Agent',
    role: 'Validates FASTA input and prepares normalized sequence identity.',
    status: 'ACTIVE',
    scope:
      'FASTA validation, amino-acid validation, sequence checksums, and peptide-window preparation.',
    responsibilities: [
      'Reject invalid FASTA before prediction.',
      'Preserve original and normalized inputs.',
      'Generate deterministic candidate peptide windows.',
    ],
    allowedToolGroups: ['Immunoinformatics Tools'],
    maxIterations: 3,
    contextBudget: 'sequence-metadata-no-large-raw-artifacts',
    retryPolicy: 'do not retry invalid sequence input',
    abstentionConditions: COMMON_ABSTAIN,
    forbiddenActions: COMMON_FORBIDDEN,
    decisionPolicy: DECISION_POLICY,
  },
  {
    agentId: 't-cell',
    displayName: 'T-Cell Agent',
    role: 'Runs MHC-I/MHC-II tools, validates schemas, manages HLA settings, and stores T-cell evidence.',
    status: 'ACTIVE',
    scope: 'MHC-I and MHC-II peptide candidate evidence.',
    responsibilities: [
      'Call live IEDB and optional MHCflurry when configured.',
      'Use synthetic and fixture fallback only with explicit provenance.',
      'Preserve HLA allele and method provenance.',
    ],
    allowedToolGroups: ['Immunoinformatics Tools', 'Evidence Tools'],
    maxIterations: 3,
    contextBudget: 'candidate-and-provenance-summaries',
    retryPolicy: 'retry transient connector failures once, then route fallback policy',
    abstentionConditions: COMMON_ABSTAIN,
    forbiddenActions: COMMON_FORBIDDEN,
    decisionPolicy: DECISION_POLICY,
  },
  {
    agentId: 'b-cell',
    displayName: 'B-Cell Agent',
    role: 'Runs B-cell tools, computes agreement, and flags conflicts.',
    status: 'ACTIVE',
    scope: 'B-cell evidence with GraphBepi fixture-only branch for current build.',
    responsibilities: [
      'Call B-cell prediction tools.',
      'Keep GraphBepi fixture-only unless a validated live connector is introduced.',
      'Flag missing or conflicting B-cell evidence.',
    ],
    allowedToolGroups: ['Immunoinformatics Tools', 'Evidence Tools'],
    maxIterations: 3,
    contextBudget: 'bcell-evidence-summary',
    retryPolicy: 'fallback to approved fixture only when policy permits',
    abstentionConditions: COMMON_ABSTAIN,
    forbiddenActions: COMMON_FORBIDDEN,
    decisionPolicy: DECISION_POLICY,
  },
  {
    agentId: 'population',
    displayName: 'Population Agent',
    role: 'Validates population settings, calculates coverage, and stores frequency provenance.',
    status: 'ACTIVE',
    scope: 'Population coverage and marginal contribution evidence.',
    responsibilities: [
      'Validate population configuration.',
      'Call live or synthetic population coverage tools.',
      'Preserve HLA frequency provenance.',
    ],
    allowedToolGroups: ['Immunoinformatics Tools', 'Evidence Tools'],
    maxIterations: 3,
    contextBudget: 'coverage-summary',
    retryPolicy: 'retry transient connector failures once, then fallback or abstain',
    abstentionConditions: COMMON_ABSTAIN,
    forbiddenActions: COMMON_FORBIDDEN,
    decisionPolicy: DECISION_POLICY,
  },
  {
    agentId: 'structure',
    displayName: 'Structure Agent',
    role: 'Retrieves and validates structures, maps epitopes, and evaluates accessibility/confidence.',
    status: 'ACTIVE',
    scope: 'Structure retrieval, validation, epitope mapping, accessibility, and confidence.',
    responsibilities: [
      'Fetch structures from configured sources or exact fixtures.',
      'Validate structure metadata and coordinate mappings.',
      'Flag low-confidence regions.',
    ],
    allowedToolGroups: ['Structure Tools', 'Evidence Tools'],
    maxIterations: 3,
    contextBudget: 'structure-metadata-and-artifact-refs',
    retryPolicy: 'retry transient live lookup once, then cache/fixture/fail closed',
    abstentionConditions: COMMON_ABSTAIN,
    forbiddenActions: COMMON_FORBIDDEN,
    decisionPolicy: DECISION_POLICY,
  },
  {
    agentId: 'compound-intelligence',
    displayName: 'Compound Intelligence Agent',
    role: 'Retrieves, deduplicates, validates, and prepares compounds.',
    status: 'ACTIVE',
    scope: 'Compound lookup, validation, descriptors, and ligand preparation.',
    responsibilities: [
      'Fetch compound records from configured sources or exact fixtures.',
      'Deduplicate and validate compounds.',
      'Prepare ligand artifacts for docking.',
    ],
    allowedToolGroups: ['Chemistry Tools', 'Evidence Tools'],
    maxIterations: 3,
    contextBudget: 'compound-metadata-and-artifact-refs',
    retryPolicy: 'retry transient live lookup once, then cache/fixture/fail closed',
    abstentionConditions: COMMON_ABSTAIN,
    forbiddenActions: COMMON_FORBIDDEN,
    decisionPolicy: DECISION_POLICY,
  },
  {
    agentId: 'docking',
    displayName: 'Docking Agent',
    role: 'Prepares docking inputs, runs docking, clusters poses, and extracts interactions.',
    status: 'ACTIVE',
    scope: 'Receptor/ligand preparation, docking execution, pose clustering, and interactions.',
    responsibilities: [
      'Validate docking boxes before execution.',
      'Run local Vina only when configured.',
      'Use cached or approved fixture docking replay when live execution is unavailable.',
    ],
    allowedToolGroups: ['Docking Tools', 'Structure Tools', 'Chemistry Tools', 'Evidence Tools'],
    maxIterations: 3,
    contextBudget: 'docking-metadata-and-artifact-refs',
    retryPolicy: 'retry local tool failure once, then fixture/fail closed',
    abstentionConditions: COMMON_ABSTAIN,
    forbiddenActions: COMMON_FORBIDDEN,
    decisionPolicy: DECISION_POLICY,
  },
  {
    agentId: 'ranking',
    displayName: 'Ranking Agent',
    role: 'Requests deterministic and calibrated ranking while preserving components and hard gates.',
    status: 'ACTIVE',
    scope:
      'Candidate prioritization, confidence calibration, redundancy minimization, and construct optimization.',
    responsibilities: [
      'Apply frozen weights and hard constraints.',
      'Use deterministic optimization for construct assembly.',
      'Never override failed hard gates.',
    ],
    allowedToolGroups: ['Evidence Tools', 'Constraint Tools'],
    maxIterations: 3,
    contextBudget: 'ranked-candidate-summaries',
    retryPolicy: 'do not retry deterministic validation failures',
    abstentionConditions: COMMON_ABSTAIN,
    forbiddenActions: COMMON_FORBIDDEN,
    decisionPolicy: DECISION_POLICY,
  },
  {
    agentId: 'verifier-critic',
    displayName: 'Verifier / Critic Agent',
    role: 'Checks schemas, provenance, unsupported claims, disagreement, and approval compliance.',
    status: 'ACTIVE',
    scope: 'Governance review before shortlist, docking, and final export.',
    responsibilities: [
      'Confirm every result has provenance.',
      'Flag unsupported claims and missing evidence.',
      'Require researcher approval before critical transitions.',
    ],
    allowedToolGroups: ['Evidence Tools', 'Constraint Tools', 'Report / Export Tools'],
    maxIterations: 3,
    contextBudget: 'governance-summary',
    retryPolicy: 'request retry only when inputs change or missing evidence is recoverable',
    abstentionConditions: COMMON_ABSTAIN,
    forbiddenActions: COMMON_FORBIDDEN,
    decisionPolicy: DECISION_POLICY,
  },
  {
    agentId: 'reporting',
    displayName: 'Reporting Agent',
    role: 'Generates explanations, reports, CSV exports, traces, and the final research package only from stored evidence.',
    status: 'ACTIVE',
    scope:
      'Report generation, candidate exports, workflow trace, agent trace, and research-package.zip.',
    responsibilities: [
      'Generate JSON, Markdown, and CSV report artifacts.',
      'Export workflow and agent traces.',
      'Assemble the PRD-mandated research package.',
    ],
    allowedToolGroups: ['Report / Export Tools'],
    maxIterations: 2,
    contextBudget: 'reportable-evidence-summary-only',
    retryPolicy: 'retry formatting failures once; do not invent missing evidence',
    abstentionConditions: COMMON_ABSTAIN,
    forbiddenActions: [...COMMON_FORBIDDEN, 'Create new scientific facts during reporting.'],
    decisionPolicy: DECISION_POLICY,
  },
] as const;

const WORKFLOW_NODES: readonly WorkflowPlanNode[] = [
  {
    nodeId: 'intake-policy',
    label: 'Validate objective and policy',
    agentId: 'intake-policy',
    toolNames: ['describe_agentic_workflow'],
    approvalRequired: true,
    output: 'configuration approval request',
  },
  {
    nodeId: 'validate-sequence',
    label: 'Validate sequence',
    agentId: 'sequence-validation',
    toolNames: ['validate_sequence', 'generate_candidate_peptides'],
    approvalRequired: false,
    output: 'normalized sequence, checksums, and candidate windows',
  },
  {
    nodeId: 'collect-tcell-evidence',
    label: 'Collect T-cell evidence',
    agentId: 't-cell',
    toolNames: ['predict_mhci', 'predict_mhcii', 'predict_synthetic_binding'],
    approvalRequired: false,
    output: 'MHC-I and MHC-II evidence with provenance',
  },
  {
    nodeId: 'collect-bcell-evidence',
    label: 'Collect B-cell evidence',
    agentId: 'b-cell',
    toolNames: ['predict_bcell'],
    approvalRequired: false,
    output: 'B-cell evidence with GraphBepi fixture provenance where used',
  },
  {
    nodeId: 'calculate-population',
    label: 'Calculate population coverage',
    agentId: 'population',
    toolNames: ['calculate_population_coverage', 'calculate_synthetic_population_coverage'],
    approvalRequired: false,
    output: 'population coverage evidence',
  },
  {
    nodeId: 'evaluate-structure',
    label: 'Evaluate structure evidence',
    agentId: 'structure',
    toolNames: [
      'fetch_structure',
      'validate_structure',
      'map_epitopes_to_structure',
      'calculate_surface_accessibility',
      'calculate_structure_confidence',
      'detect_binding_pockets',
      'create_molstar_view',
    ],
    approvalRequired: false,
    output: 'structure mappings, accessibility, and confidence',
  },
  {
    nodeId: 'prepare-compounds',
    label: 'Prepare compounds',
    agentId: 'compound-intelligence',
    toolNames: [
      'fetch_compound',
      'validate_compound',
      'deduplicate_compounds',
      'calculate_molecular_descriptors',
      'prepare_ligand',
    ],
    approvalRequired: false,
    output: 'validated compound and ligand-preparation evidence',
  },
  {
    nodeId: 'run-docking',
    label: 'Run docking workflow',
    agentId: 'docking',
    toolNames: [
      'prepare_receptor',
      'validate_docking_box',
      'run_docking',
      'cluster_docking_poses',
      'extract_interactions',
      'create_molstar_view',
    ],
    approvalRequired: true,
    output: 'docking poses, clusters, interactions, and stability',
  },
  {
    nodeId: 'rank-and-optimize',
    label: 'Rank and optimize',
    agentId: 'ranking',
    toolNames: [
      'normalize_scores',
      'compute_consensus',
      'compute_consensus_batch',
      'validate_thresholds',
      'remove_duplicate_candidates',
      'detect_overlapping_epitopes',
      'apply_constraint_rules',
      'rank_candidates',
      'categorize_candidates',
      'optimize_shortlist_coverage',
      'optimize_construct_genetic',
      'calibrate_confidence',
    ],
    approvalRequired: false,
    output: 'ranked candidates, confidence calibration, and construct proposal',
  },
  {
    nodeId: 'verify-output',
    label: 'Verify output and approval readiness',
    agentId: 'verifier-critic',
    toolNames: ['visualize_results', 'explain_candidate', 'export_workflow_trace'],
    approvalRequired: true,
    output: 'shortlist/export approval request',
  },
  {
    nodeId: 'export-research-package',
    label: 'Export final research package',
    agentId: 'reporting',
    toolNames: [
      'generate_report',
      'export_candidates',
      'export_workflow_trace',
      'export_research_package',
      'chat_with_research_agent',
    ],
    approvalRequired: true,
    output: 'reports, CSV exports, agent trace, and research-package.zip',
  },
] as const;

const WORKFLOW_EDGES: readonly WorkflowPlanEdge[] = [
  { from: 'intake-policy', to: 'validate-sequence', condition: 'configuration approved' },
  { from: 'validate-sequence', to: 'collect-tcell-evidence', condition: 'valid FASTA' },
  { from: 'validate-sequence', to: 'collect-bcell-evidence', condition: 'valid FASTA' },
  {
    from: 'collect-tcell-evidence',
    to: 'calculate-population',
    condition: 'T-cell candidates available',
  },
  {
    from: 'collect-bcell-evidence',
    to: 'evaluate-structure',
    condition: 'B-cell branch completed or abstained',
  },
  {
    from: 'calculate-population',
    to: 'evaluate-structure',
    condition: 'coverage completed or abstained',
  },
  {
    from: 'evaluate-structure',
    to: 'prepare-compounds',
    condition: 'structure evidence completed or abstained',
  },
  {
    from: 'prepare-compounds',
    to: 'run-docking',
    condition: 'ligands prepared and docking approved',
  },
  {
    from: 'run-docking',
    to: 'rank-and-optimize',
    condition: 'docking completed, fixture replayed, or abstained',
  },
  { from: 'rank-and-optimize', to: 'verify-output', condition: 'ranking snapshot complete' },
  {
    from: 'verify-output',
    to: 'export-research-package',
    condition: 'researcher approval recorded',
  },
] as const;

const REQUIRED_RESEARCH_PACKAGE_SECTIONS = [
  'manifest.json',
  'project.json',
  'run.json',
  'configuration.json',
  'inputs/',
  'predictions/',
  'candidates/',
  'structure/',
  'compounds/',
  'docking/',
  'construct/',
  'evidence/',
  'reports/',
  'checksums.json',
] as const;

export function describeAgenticWorkflow(input: {
  runId: string;
  runIntent: 'MVP_EPITOPE_PRIORITIZATION';
  includeFutureInterfaces: boolean;
}): AgenticWorkflowDescription {
  return {
    deploymentBoundary: 'ONE_NITROSTACK_MCP_APP',
    manifestVersion: AGENT_MANIFEST_VERSION,
    planVersion: AGENTIC_WORKFLOW_PLAN_VERSION,
    runId: input.runId,
    runIntent: input.runIntent,
    agents: INTERNAL_AGENTS,
    workflowPlan: {
      nodes: WORKFLOW_NODES,
      edges: WORKFLOW_EDGES,
      humanApprovalGates: [
        'intake-policy',
        'run-docking',
        'verify-output',
        'export-research-package',
      ],
    },
    guardrails: {
      authRequired: false,
      langGraphRequired: true,
      llmAgentModeRequiredWhenConfigured: true,
      deterministicFallbackRequired: true,
      graphBepiMode: 'FIXTURE_ONLY',
      syntheticScientificUse: false,
    },
    finalResearchPackage: {
      requiredArtifact: 'research-package.zip',
      includesCsvExports: true,
      requiredSections: REQUIRED_RESEARCH_PACKAGE_SECTIONS,
    },
  };
}
