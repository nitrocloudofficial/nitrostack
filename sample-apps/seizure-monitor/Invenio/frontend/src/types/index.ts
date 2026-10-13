/**
 * Invenio — Frontend TypeScript Types
 *
 * This file defines the core domain types for the frontend.
 *
 * Organization:
 * - Base types (primitive-ish)
 * - Domain entity types (Research, Dataset, etc.)
 * - UI state types (layout, navigation)
 * - API response types (to be expanded in Phase 2)
 *
 * Note: Canonical type definitions live in shared/types/index.ts.
 * This file re-exports shared types and adds UI-specific extensions.
 *
 * Future: Generate API types from OpenAPI schema using `openapi-typescript`.
 */

/* ─── Utility Types ────────────────────────────── */
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type AsyncData<T> = { data: T; loading: boolean; error: string | null }

/* ─── Domain Entity Types (Phase 2) ───────────── */
export interface IInstitution {
  id: Nullable<string>
  name: string
  country_code: Nullable<string>
  type: Nullable<string>
}

export interface IAuthor {
  id: Nullable<string>
  name: string
  affiliations: IInstitution[]
  orcid: Nullable<string>
}

export interface IPaper {
  id: string
  title: string
  abstract: string
  authors: IAuthor[]
  journal: Nullable<string>
  year: Nullable<number>
  doi: Nullable<string>
  url: string
  pdf_url: Nullable<string>
  citation_count: number
  keywords: string[]
  source: 'openalex' | 'arxiv' | 'crossref'
  license: Nullable<string>
  language: Nullable<string>
  published_at: Nullable<string>
  updated_at: Nullable<string>
  rank_score: number
  provider_id: Nullable<string>
}

/* ─── Search Types ─────────────────────────────── */
export interface ISearchFilters {
  query: string
  source?: 'openalex' | 'arxiv' | 'crossref' | null
  limit?: number
}

export interface ISearchResponse {
  papers: IPaper[]
  total: number
  page: number
  has_more: boolean
}

/* ─── Phase 3: Knowledge Graph & Correlation ────── */
export interface IEvidence {
  id: string
  description: string
  confidence: number
  supporting_paper_ids: string[]
}

export interface IGraphNode {
  id: string
  label: string
  group: 'paper' | 'author' | 'institution' | 'topic' | 'domain'
  properties: Record<string, any>
}

export interface IGraphEdge {
  id: string
  source: string
  target: string
  relationship: 'cites' | 'authored_by' | 'affiliated_with' | 'has_topic' | 'related_to' | 'contradicts' | 'supports'
  weight: number
  evidence: IEvidence[]
}

export interface IResearchGap {
  id: string
  title: string
  description: string
  reason: string
  confidence: number
  relevant_node_ids: string[]
}

export interface IOpportunity {
  id: string
  title: string
  summary: string
  reasoning: string
  connected_domains: string[]
  supporting_paper_ids: string[]
  potential_applications: string[]
  confidence: number
  evidence: IEvidence[]
}

export interface ICorrelationResponse {
  nodes: IGraphNode[]
  edges: IGraphEdge[]
  gaps: IResearchGap[]
  opportunities: IOpportunity[]
}

/* ─── Entity: Dataset ──────────────────────────── */
/**
 * Represents a research dataset.
 * Future: Will be sourced from Kaggle, HuggingFace, and domain-specific repositories.
 */
export interface Dataset {
  id: string
  name: string
  description: string
  source: string
  url: string
  format: string
  sizeBytes: Nullable<number>
  lastUpdated: string
  tags: string[]
  relatedEntities: EntityReference[]
}

/* ─── Entity: Repository ───────────────────────── */
/**
 * Represents a code repository.
 * Future: Will be sourced from GitHub, GitLab, and similar platforms.
 */
export interface Repository {
  id: string
  name: string
  description: string
  url: string
  language: Nullable<string>
  stars: number
  forks: number
  lastCommit: string
  topics: string[]
  relatedEntities: EntityReference[]
}

/* ─── Entity: Evidence ─────────────────────────── */
/**
 * Represents a unit of evidence in the knowledge graph.
 * Future: Extracted and structured by the Evidence Nitro agent.
 */
export interface Evidence {
  id: string
  claim: string
  supportingEntities: EntityReference[]
  confidenceScore: number
  sourceType: 'paper' | 'dataset' | 'repository' | 'patent'
  createdAt: string
}

/* ─── Entity: Report ───────────────────────────── */
/**
 * Represents a generated research report.
 * Future: Produced by the Reports Nitro agent.
 */
export interface Report {
  id: string
  title: string
  summary: string
  createdAt: string
  status: 'draft' | 'generating' | 'complete'
  sections: ReportSection[]
}

export interface ReportSection {
  id: string
  title: string
  content: string
  order: number
}

/* ─── Cross-Domain Reference ───────────────────── */
export interface EntityReference {
  id: string
  type: EntityType
  label: string
}

export type EntityType =
  | 'paper'
  | 'dataset'
  | 'repository'
  | 'patent'
  | 'phenomenon'
  | 'concept'
  | 'algorithm'

/* ─── Navigation ───────────────────────────────── */
export interface NavItem {
  id: string
  label: string
  path: string
  icon: string
  description: string
}

/* ─── Layout State ─────────────────────────────── */
export interface LayoutState {
  sidebarCollapsed: boolean
  sidebarOpen: boolean
  theme: 'dark' | 'light' | 'system'
}
/* ─── Phase 4: Workflow Engine ─────────────────── */
export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface IExecutionLog {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
  node_id: string
}

export interface IWorkflowNodeState {
  id: string
  type: string
  label: string
  status: WorkflowStatus
  start_time: string | null
  end_time: string | null
  execution_ms: number | null
  confidence: number | null
  error: string | null
  inputs: Record<string, any>
  outputs: Record<string, any>
}

export interface IWorkflowRun {
  id: string
  query: string
  status: WorkflowStatus
  start_time: string
  end_time: string | null
  nodes: IWorkflowNodeState[]
  logs: IExecutionLog[]
  summary: Record<string, any> | null
}

/* ─── Phase 5: Workspace & Report Studio ───────── */

export type ExportFormat = 'markdown' | 'html' | 'bibtex'

export interface IInsight {
  id: string
  type: 'gap' | 'opportunity' | 'correlation'
  title: string
  description: string
  confidence: number
  related_paper_ids: string[]
  reasoning: string
}

export interface IReportSection {
  id: string
  title: string
  content: string
  type: 'summary' | 'landscape' | 'papers' | 'correlation' | 'gaps' | 'opportunities' | 'future'
  insights: IInsight[]
}

export interface IWorkspaceSession {
  id: string
  run_id: string
  query: string
  created_at: string
  last_modified: string
  sections: IReportSection[]
  graph_data: any
  raw_papers: IPaper[]
}

/* ─── API Types ────────────────────────────────── */
/**
 * Standard paginated API response wrapper.
 * Future: All list endpoints will return this shape.
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Standard API error shape.
 * Mirrors FastAPI's default error response format.
 */
export interface ApiError {
  detail: string
  statusCode: number
  timestamp: string
}
