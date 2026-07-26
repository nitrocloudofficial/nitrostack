/**
 * Knowledge Graph Agent — Type Definitions & Schemas
 * 
 * All interfaces, enums, and type contracts for the knowledge graph pipeline.
 * This is the single source of truth for data shapes across every component.
 */

import { createHash } from 'crypto';

// ============================================================================
// ENUMS
// ============================================================================

/** Types of nodes that can exist in the knowledge graph */
export enum NodeType {
  PAGE = 'PAGE',
  UI_ELEMENT = 'UI_ELEMENT',
  FORM = 'FORM',
  FEATURE = 'FEATURE',
  WORKFLOW = 'WORKFLOW',
  DATABASE_TABLE = 'DATABASE_TABLE',
  DIALOG = 'DIALOG',
  SECTION = 'SECTION',
  INPUT_FIELD = 'INPUT_FIELD',
  API_ENDPOINT = 'API_ENDPOINT',
}

/** Types of edges (relationships) between nodes */
export enum EdgeType {
  CONTAINS = 'CONTAINS',
  NAVIGATES_TO = 'NAVIGATES_TO',
  OPENS = 'OPENS',
  SUBMITS = 'SUBMITS',
  BELONGS_TO = 'BELONGS_TO',
  DEPENDS_ON = 'DEPENDS_ON',
  CHILD_OF = 'CHILD_OF',
  PARENT_OF = 'PARENT_OF',
  TRIGGERS = 'TRIGGERS',
  INPUTS_TO = 'INPUTS_TO',
}

/** Event types published by the Publisher component */
export enum EventType {
  GRAPH_UPDATED = 'graph.updated',
  NODE_CREATED = 'node.created',
  NODE_UPDATED = 'node.updated',
  NODE_DELETED = 'node.deleted',
  EDGE_CREATED = 'edge.created',
  EXPLORATION_COMPLETED = 'exploration.completed',
}

/** UI element subtypes for finer categorization */
export enum UIElementSubtype {
  BUTTON = 'BUTTON',
  LINK = 'LINK',
  TAB = 'TAB',
  MENU_ITEM = 'MENU_ITEM',
  ICON = 'ICON',
  DROPDOWN = 'DROPDOWN',
  CHECKBOX = 'CHECKBOX',
  TOGGLE = 'TOGGLE',
}

// ============================================================================
// EXPLORER INPUT CONTRACT (What Explorer Agent sends us)
// ============================================================================

/** A single UI element discovered by the Explorer Agent */
export interface ExplorerUIElement {
  type: 'button' | 'link' | 'input' | 'select' | 'checkbox' | 'toggle' | 'tab' | 'menu_item' | 'icon' | 'dropdown';
  label: string;
  selector?: string;          // CSS selector or XPath
  action?: string;            // What it does: 'opens_modal', 'navigates', 'submits', etc.
  target?: string;            // Target URL, modal ID, or form reference
  visible?: boolean;
}

/** A form discovered by the Explorer Agent */
export interface ExplorerForm {
  name: string;
  selector?: string;
  fields?: ExplorerFormField[];
  submit_button?: string;     // Selector of the submit button
  action_url?: string;        // Form action endpoint
}

/** A single field inside a form */
export interface ExplorerFormField {
  name: string;
  type: string;               // text, email, password, select, etc.
  selector?: string;
  required?: boolean;
  placeholder?: string;
}

/** A workflow step recorded during exploration */
export interface ExplorerWorkflowStep {
  step_number: number;
  action: string;             // 'click', 'type', 'navigate', 'select', etc.
  target_selector?: string;
  target_label?: string;
  value?: string;             // Value typed or selected
  page_url?: string;
  screenshot_path?: string;
}

/** A feature or capability discovered on a page */
export interface ExplorerFeature {
  name: string;
  description?: string;
  category?: string;
}

/** 
 * The complete payload sent by the Explorer Agent for a single page exploration.
 * This is the INPUT CONTRACT for our Data Ingestion component.
 */
export interface ExplorerPayload {
  project_id: string;
  exploration_id?: string;    // Optional: Explorer may assign its own
  timestamp?: string;
  page: {
    title: string;
    url: string;
    route?: string;           // Cleaned route path, e.g., '/projects'
    screenshot_path?: string;
  };
  buttons?: ExplorerUIElement[];
  links?: ExplorerUIElement[];
  forms?: ExplorerForm[];
  dialogs?: Array<{ name: string; selector?: string; trigger?: string }>;
  sections?: Array<{ name: string; selector?: string }>;
  features?: ExplorerFeature[];
  workflows?: Array<{
    name: string;
    steps: ExplorerWorkflowStep[];
  }>;
  metadata?: Record<string, unknown>;
}

/** 
 * Batch payload — Explorer can send multiple pages in one call 
 */
export interface ExplorerBatchPayload {
  project_id: string;
  pages: ExplorerPayload[];
}

// ============================================================================
// DATABASE ENTITIES (What lives in our tables)
// ============================================================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  base_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Exploration {
  id: string;
  project_id: string;
  raw_payload: string;        // JSON stringified original payload
  status: 'pending' | 'processing' | 'completed' | 'failed';
  pages_discovered: number;
  nodes_created: number;
  edges_created: number;
  created_at: string;
  completed_at?: string;
}

export interface KnowledgeNode {
  id: string;
  node_key: string;           // Deterministic composite hash for dedup
  project_id: string;
  exploration_id: string;
  node_type: NodeType;
  subtype?: string;           // e.g., UIElementSubtype for UI_ELEMENT nodes
  label: string;              // Human-readable name
  description?: string;
  page_url?: string;          // Which page this node belongs to
  selector?: string;          // DOM selector for UI elements
  metadata?: string;          // JSON string of extra properties
  created_at: string;
  updated_at: string;
}

export interface KnowledgeEdge {
  id: string;
  edge_key: string;           // Deterministic composite hash for dedup
  project_id: string;
  exploration_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: EdgeType;
  label?: string;             // Human-readable edge description
  weight?: number;            // Edge strength/confidence
  metadata?: string;          // JSON string of extra properties
  created_at: string;
}

export interface Workflow {
  id: string;
  /** Stable identity used to update a workflow instead of creating duplicates. */
  workflow_key: string;
  project_id: string;
  exploration_id: string;
  source_page_url?: string;
  name: string;
  description?: string;
  total_steps: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_number: number;
  node_id?: string;           // Reference to the KnowledgeNode involved
  action: string;
  target_label?: string;
  target_selector?: string;
  value?: string;
  page_url?: string;
  screenshot_path?: string;
  created_at: string;
}

// ============================================================================
// QUERY ENGINE OUTPUT CONTRACTS (What we return to other agents)
// ============================================================================

/** Full graph export for a project */
export interface GraphExport {
  project: Project;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  workflows: Workflow[];
  stats: {
    total_nodes: number;
    total_edges: number;
    total_workflows: number;
    node_type_counts: Record<string, number>;
    edge_type_counts: Record<string, number>;
  };
}

/** A navigation path between two nodes */
export interface NavigationPath {
  from: KnowledgeNode;
  to: KnowledgeNode;
  path: KnowledgeNode[];
  edges: KnowledgeEdge[];
  total_steps: number;
}

/** Search result with relevance scoring */
export interface SearchResult {
  node: KnowledgeNode;
  score: number;
  matched_field: string;      // Which field matched: 'label', 'description', 'metadata'
  context?: string;           // Snippet showing match context
}

/** Publisher event payload */
export interface GraphEvent {
  event_type: EventType;
  project_id: string;
  exploration_id: string;
  timestamp: string;
  data: {
    nodes_created?: number;
    nodes_updated?: number;
    edges_created?: number;
    modified_node_ids?: string[];
    workflows_created?: number;
  };
}

// ============================================================================
// PIPELINE RESULT (Internal pipeline tracking)
// ============================================================================

export interface PipelineResult {
  exploration_id: string;
  project_id: string;
  nodes_created: number;
  nodes_updated: number;
  edges_created: number;
  workflows_created: number;
  errors: string[];
  duration_ms: number;
}

// ============================================================================
// UTILITY: Deterministic Key Generation
// ============================================================================

/**
 * Generates a deterministic node key by hashing composite identity fields.
 * This ensures the same logical entity always maps to the same key,
 * enabling safe upserts and future version comparison.
 */
export function generateNodeKey(projectId: string, nodeType: NodeType, canonicalPath: string): string {
  const raw = `${projectId}::${nodeType}::${canonicalPath}`;
  return createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

/**
 * Generates a deterministic edge key from source, target, and edge type.
 */
export function generateEdgeKey(sourceNodeId: string, targetNodeId: string, edgeType: EdgeType): string {
  const raw = `${sourceNodeId}::${targetNodeId}::${edgeType}`;
  return createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

/**
 * Generates a stable workflow key. A workflow is identified by its project,
 * source screen, and name; its steps can then be refreshed safely.
 */
export function generateWorkflowKey(projectId: string, sourcePageUrl: string, workflowName: string): string {
  const raw = `${projectId}::${sourcePageUrl}::${workflowName.trim().toLowerCase()}`;
  return createHash('sha256').update(raw).digest('hex').substring(0, 32);
}
