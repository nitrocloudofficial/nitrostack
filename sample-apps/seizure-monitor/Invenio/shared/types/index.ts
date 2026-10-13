/**
 * Shared Types — Cross-Workspace Type Definitions
 *
 * These types are the canonical definitions used across:
 * - Frontend (TypeScript)
 * - Backend (via openapi-typescript generated types, Phase 2)
 * - Nitro agents (via Pydantic models, Phase 2)
 *
 * Naming Convention:
 * - Interfaces prefixed with 'I' for clarity in shared context
 * - Enums use SCREAMING_SNAKE_CASE values
 * - All types are immutable (readonly) where possible
 *
 * Phase 2: This file will be auto-generated from the OpenAPI schema.
 * Manual types here serve as the source of truth until then.
 */

/* ─── Domain Entity Types (Phase 2) ───────────── */

export interface IInstitution {
  readonly id: string | null
  readonly name: string
  readonly country_code: string | null
  readonly type: string | null
}

export interface IAuthor {
  readonly id: string | null
  readonly name: string
  readonly affiliations: readonly IInstitution[]
  readonly orcid: string | null
}

export interface IPaper {
  readonly id: string
  readonly title: string
  readonly abstract: string
  readonly authors: readonly IAuthor[]
  readonly journal: string | null
  readonly year: number | null
  readonly doi: string | null
  readonly url: string
  readonly pdf_url: string | null
  readonly citation_count: number
  readonly keywords: readonly string[]
  readonly source: 'openalex' | 'arxiv' | 'crossref'
  readonly license: string | null
  readonly language: string | null
  readonly published_at: string | null
  readonly updated_at: string | null
  readonly rank_score: number
  readonly provider_id: string | null
}

/* ─── Search Types ─────────────────────────────── */

export interface ISearchFilters {
  readonly query: string
  readonly source?: 'openalex' | 'arxiv' | 'crossref' | null
  readonly limit?: number
}

export interface ISearchResponse {
  readonly papers: readonly IPaper[]
  readonly total: number
  readonly page: number
  readonly has_more: boolean
}

/* ─── Phase 3: Knowledge Graph & Correlation ────── */

export interface IEvidence {
  readonly id: string
  readonly description: string
  readonly confidence: number
  readonly supporting_paper_ids: readonly string[]
}

export interface IGraphNode {
  readonly id: string
  readonly label: string
  readonly group: 'paper' | 'author' | 'institution' | 'topic' | 'domain'
  readonly properties: Record<string, any>
}

export interface IGraphEdge {
  readonly id: string
  readonly source: string
  readonly target: string
  readonly relationship: 'cites' | 'authored_by' | 'affiliated_with' | 'has_topic' | 'related_to' | 'contradicts' | 'supports'
  readonly weight: number
  readonly evidence: readonly IEvidence[]
}

export interface IResearchGap {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly reason: string
  readonly confidence: number
  readonly relevant_node_ids: readonly string[]
}

export interface IOpportunity {
  readonly id: string
  readonly title: string
  readonly summary: string
  readonly reasoning: string
  readonly connected_domains: readonly string[]
  readonly supporting_paper_ids: readonly string[]
  readonly potential_applications: readonly string[]
  readonly confidence: number
  readonly evidence: readonly IEvidence[]
}

export interface ICorrelationResponse {
  readonly nodes: readonly IGraphNode[]
  readonly edges: readonly IGraphEdge[]
  readonly gaps: readonly IResearchGap[]
  readonly opportunities: readonly IOpportunity[]
}

/* ─── Entity Types ─────────────────────────────── */

export type EntityType =
  | 'paper'
  | 'dataset'
  | 'repository'
  | 'patent'
  | 'phenomenon'
  | 'mathematical_concept'
  | 'algorithm'
  | 'engineering_technique'

export type RelationshipType =
  | 'cites'
  | 'implements'
  | 'validates'
  | 'inspires'
  | 'contradicts'
  | 'uses_dataset'
  | 'produces_dataset'
  | 'is_analogous_to'

/* ─── Pagination ───────────────────────────────── */

export interface IPaginationParams {
  readonly page: number
  readonly pageSize: number
}

export interface IPaginatedResponse<T> {
  readonly data: readonly T[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
  readonly hasMore: boolean
}

/* ─── API Error ────────────────────────────────── */

export interface IApiError {
  readonly detail: string
  readonly statusCode: number
  readonly timestamp: string
}

/* ─── Agent Status ─────────────────────────────── */

export type AgentStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'planned'

export interface IAgentTask {
  readonly id: string
  readonly agentId: string
  readonly status: AgentStatus
  readonly createdAt: string
  readonly completedAt: string | null
  readonly result: unknown | null
  readonly error: string | null
}

/* ─── Phase Metadata ───────────────────────────── */

export type Phase = 'Phase 1' | 'Phase 2' | 'Phase 3' | 'Phase 4'

export interface IModuleMetadata {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly phase: Phase
  readonly status: 'planned' | 'in_development' | 'beta' | 'stable'
}

/* ─── Phase 4: Workflow Engine ─────────────────── */

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface IExecutionLog {
  readonly id: string
  readonly timestamp: string
  readonly level: 'info' | 'warning' | 'error' | 'success'
  readonly message: string
  readonly node_id: string
}

export interface IWorkflowNodeState {
  readonly id: string
  readonly type: string // e.g., 'research_search', 'correlation', 'hypothesis'
  readonly label: string
  readonly status: WorkflowStatus
  readonly start_time: string | null
  readonly end_time: string | null
  readonly execution_ms: number | null
  readonly confidence: number | null
  readonly error: string | null
  readonly inputs: Record<string, any>
  readonly outputs: Record<string, any>
}

export interface IWorkflowRun {
  readonly id: string
  readonly query: string
  readonly status: WorkflowStatus
  readonly start_time: string
  readonly end_time: string | null
  readonly nodes: readonly IWorkflowNodeState[]
  readonly logs: readonly IExecutionLog[]
  readonly summary: Record<string, any> | null
}

/* ─── Phase 5: Workspace & Report Studio ───────── */

export type ExportFormat = 'markdown' | 'html' | 'bibtex'

export interface IInsight {
  readonly id: string
  readonly type: 'gap' | 'opportunity' | 'correlation'
  readonly title: string
  readonly description: string
  readonly confidence: number
  readonly related_paper_ids: readonly string[]
  readonly reasoning: string
}

export interface IReportSection {
  readonly id: string
  readonly title: string
  readonly content: string
  readonly type: 'summary' | 'landscape' | 'papers' | 'correlation' | 'gaps' | 'opportunities' | 'future'
  readonly insights: readonly IInsight[]
}

export interface IWorkspaceSession {
  readonly id: string
  readonly run_id: string
  readonly query: string
  readonly created_at: string
  readonly last_modified: string
  readonly sections: readonly IReportSection[]
  readonly graph_data: any // ICorrelationResponse
  readonly raw_papers: readonly IPaper[]
}


