/**
 * Knowledge Graph Agent — Component 4: Graph Storage (CRUD)
 * 
 * Handles all database read/write operations for knowledge nodes and edges.
 * Uses deterministic keys for upsert (insert-or-update) operations,
 * enabling safe re-ingestion without duplicates.
 */

import { getStore, runTransaction } from './database';
import {
  KnowledgeNode,
  KnowledgeEdge,
  Workflow,
  WorkflowStep,
  Project,
  NodeType,
  EdgeType,
} from './models';

// ============================================================================
// NODE OPERATIONS
// ============================================================================

/**
 * Upsert a node: insert if new, update if the node_key already exists.
 * Returns 'created' or 'updated'.
 */
export function upsertNode(node: KnowledgeNode): 'created' | 'updated' | 'unchanged' {
  const store = getStore();

  // Check for existing node with the same deterministic key
  const existing = store.findOneBy('knowledge_nodes', (n) => n.node_key === node.node_key);

  if (existing) {
    const hasChanged =
      existing.subtype !== node.subtype ||
      existing.label !== node.label ||
      existing.description !== node.description ||
      existing.page_url !== node.page_url ||
      existing.selector !== node.selector ||
      existing.metadata !== node.metadata;

    // A repeat scan with exactly the same entity must not rewrite it. Raw
    // exploration history is retained separately by the ingestion component.
    if (!hasChanged) {
      node.id = existing.id;
      return 'unchanged';
    }

    // Update the existing node with new data
    store.update('knowledge_nodes', existing.id, {
      subtype: node.subtype,
      label: node.label,
      description: node.description,
      page_url: node.page_url,
      selector: node.selector,
      metadata: node.metadata,
      exploration_id: node.exploration_id,
      updated_at: new Date().toISOString(),
    } as Partial<KnowledgeNode>);
    // Update the node's ID to match the existing record
    node.id = existing.id;
    return 'updated';
  } else {
    store.insert('knowledge_nodes', node.id, node);
    return 'created';
  }
}

/**
 * Upsert multiple nodes in a single transaction.
 * Returns counts of created vs updated nodes.
 */
export function upsertNodes(nodes: KnowledgeNode[]): { created: number; updated: number; unchanged: number } {
  return runTransaction(() => {
    let created = 0;
    let updated = 0;
    let unchanged = 0;

    for (const node of nodes) {
      const result = upsertNode(node);
      if (result === 'created') created++;
      else if (result === 'updated') updated++;
      else unchanged++;
    }

    console.log(`[Graph] Upserted ${nodes.length} nodes (${created} created, ${updated} updated, ${unchanged} unchanged)`);
    return { created, updated, unchanged };
  });
}

/**
 * Upsert every node discovered on one page and remove page-scoped nodes that
 * disappeared from the latest exploration. API endpoints are shared project
 * resources, so they are deliberately not removed by a single page scan.
 */
export function syncPageNodes(nodes: KnowledgeNode[]): {
  created: number;
  updated: number;
  unchanged: number;
  deleted: number;
} {
  if (nodes.length === 0) {
    return { created: 0, updated: 0, unchanged: 0, deleted: 0 };
  }

  return runTransaction(() => {
    const store = getStore();
    const pageNode = nodes.find((node) => node.node_type === NodeType.PAGE);
    const projectId = nodes[0].project_id;
    const incomingKeys = new Set(nodes.map((node) => node.node_key));

    // If a stable route keeps the same page identity while its URL changes,
    // clean up children from both the old and the new page URLs.
    const existingPage = pageNode
      ? store.findOneBy('knowledge_nodes', (node) => node.node_key === pageNode.node_key)
      : undefined;
    const scopedUrls = new Set(
      [pageNode?.page_url, existingPage?.page_url].filter((url): url is string => Boolean(url))
    );

    let created = 0;
    let updated = 0;
    let unchanged = 0;
    for (const node of nodes) {
      const result = upsertNode(node);
      if (result === 'created') created++;
      else if (result === 'updated') updated++;
      else unchanged++;
    }

    let deleted = 0;
    if (scopedUrls.size > 0) {
      const staleNodes = store.findBy('knowledge_nodes', (node) =>
        node.project_id === projectId &&
        node.node_type !== NodeType.API_ENDPOINT &&
        Boolean(node.page_url) &&
        scopedUrls.has(node.page_url!) &&
        !incomingKeys.has(node.node_key)
      );

      for (const staleNode of staleNodes) {
        deleteNodeAndConnectedEdges(store, staleNode.id);
        deleted++;
      }
    }

    console.log(
      `[Graph] Synced ${nodes.length} nodes (${created} created, ${updated} updated, ${unchanged} unchanged, ${deleted} removed)`
    );
    return { created, updated, unchanged, deleted };
  });
}

/**
 * Upsert an edge: insert if new, refresh relationship metadata when changed,
 * or leave an identical edge untouched.
 */
export function upsertEdge(edge: KnowledgeEdge): 'created' | 'updated' | 'existing' {
  const store = getStore();

  if (!store.findById('knowledge_nodes', edge.source_node_id) ||
      !store.findById('knowledge_nodes', edge.target_node_id)) {
    throw new Error(`Cannot store ${edge.edge_type} edge with missing node endpoint`);
  }

  const existing = store.findOneBy('knowledge_edges', (e) => e.edge_key === edge.edge_key);

  if (existing) {
    const hasChanged =
      existing.label !== edge.label ||
      existing.weight !== edge.weight ||
      existing.metadata !== edge.metadata;
    if (hasChanged) {
      store.update('knowledge_edges', existing.id, {
        label: edge.label,
        weight: edge.weight,
        metadata: edge.metadata,
      } as Partial<KnowledgeEdge>);
      edge.id = existing.id;
      return 'updated';
    }
    edge.id = existing.id;
    return 'existing';
  }

  store.insert('knowledge_edges', edge.id, edge);
  return 'created';
}

/**
 * Upsert multiple edges in a single transaction.
 */
export function upsertEdges(edges: KnowledgeEdge[]): { created: number; updated: number; existing: number } {
  return runTransaction(() => {
    let created = 0;
    let updated = 0;
    let existing = 0;

    for (const edge of edges) {
      const result = upsertEdge(edge);
      if (result === 'created') created++;
      else if (result === 'updated') updated++;
      else existing++;
    }

    console.log(`[Graph] Upserted ${edges.length} edges (${created} created, ${updated} updated, ${existing} unchanged)`);
    return { created, updated, existing };
  });
}

/**
 * Synchronize the non-navigation relationships produced by one page scan.
 * Existing expected edges are retained; only obsolete source relationships are
 * deleted. This makes identical re-ingestion a no-op while still removing
 * stale containment, action, and submission edges after a page changes.
 */
export function syncEdges(
  expectedEdges: KnowledgeEdge[],
  sourceNodeIds: string[],
  managedEdgeTypes: EdgeType[]
): { created: number; updated: number; existing: number; deleted: number } {
  const sourceNodeIdSet = new Set(sourceNodeIds);
  const expectedKeys = new Set(expectedEdges.map((edge) => edge.edge_key));
  const managedTypes = new Set(managedEdgeTypes);

  return runTransaction(() => {
    const store = getStore();
    const staleEdges = store.findBy(
      'knowledge_edges',
      (edge) =>
        sourceNodeIdSet.has(edge.source_node_id) &&
        managedTypes.has(edge.edge_type) &&
        !expectedKeys.has(edge.edge_key)
    );

    for (const edge of staleEdges) {
      store.delete('knowledge_edges', edge.id);
    }

    const result = upsertEdges(expectedEdges);
    return { ...result, deleted: staleEdges.length };
  });
}

/** Delete all edges whose source is one of the supplied nodes. */
export function deleteOutgoingEdgesForNodes(nodeIds: string[]): number {
  if (nodeIds.length === 0) return 0;
  const nodeIdSet = new Set(nodeIds);
  return runTransaction(() =>
    getStore().deleteBy('knowledge_edges', (edge) => nodeIdSet.has(edge.source_node_id))
  );
}

/** Delete all edges of one relationship type for a project. */
export function deleteEdgesByProjectAndType(projectId: string, edgeType: EdgeType): number {
  return runTransaction(() =>
    getStore().deleteBy(
      'knowledge_edges',
      (edge) => edge.project_id === projectId && edge.edge_type === edgeType
    )
  );
}

// ============================================================================
// WORKFLOW OPERATIONS
// ============================================================================

/**
 * Create a workflow with its steps.
 */
export function upsertWorkflow(workflow: Workflow, steps: WorkflowStep[]): 'created' | 'updated' {
  const store = getStore();

  return runTransaction(() => {
    const existing = store.findOneBy(
      'workflows',
      (candidate) =>
        candidate.workflow_key === workflow.workflow_key ||
        // Upgrade workflows created by older versions that did not have a
        // stable key. The name/project fallback prevents a duplicate during
        // the first re-ingestion after upgrade.
        (!candidate.workflow_key &&
          candidate.project_id === workflow.project_id &&
          candidate.name === workflow.name &&
          (!candidate.source_page_url || candidate.source_page_url === workflow.source_page_url))
    );
    const now = new Date().toISOString();
    const workflowId = existing?.id || workflow.id;

    if (existing) {
      store.update('workflows', workflowId, {
        ...workflow,
        id: workflowId,
        created_at: existing.created_at,
        updated_at: now,
      });
      store.deleteBy('workflow_steps', (step) => step.workflow_id === workflowId);
    } else {
      store.insert('workflows', workflowId, {
        ...workflow,
        id: workflowId,
        updated_at: workflow.updated_at || now,
      });
    }

    for (const step of steps) {
      store.insert('workflow_steps', step.id, { ...step, workflow_id: workflowId });
    }

    console.log(
      `[Graph] ${existing ? 'Updated' : 'Created'} workflow "${workflow.name}" with ${steps.length} steps`
    );
    return existing ? 'updated' : 'created';
  });
}

/** Backwards-compatible workflow writer. Prefer upsertWorkflow in the pipeline. */
export function createWorkflow(workflow: Workflow, steps: WorkflowStep[]): void {
  upsertWorkflow(workflow, steps);
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all nodes for a project.
 */
export function getNodesByProject(projectId: string): KnowledgeNode[] {
  return getStore()
    .findBy('knowledge_nodes', (n) => n.project_id === projectId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/**
 * Get nodes by type for a project.
 */
export function getNodesByType(projectId: string, nodeType: NodeType): KnowledgeNode[] {
  return getStore()
    .findBy('knowledge_nodes', (n) => n.project_id === projectId && n.node_type === nodeType)
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Get a single node by its deterministic key.
 */
export function getNodeByKey(nodeKey: string): KnowledgeNode | undefined {
  return getStore().findOneBy('knowledge_nodes', (n) => n.node_key === nodeKey);
}

/**
 * Get a single node by its ID.
 */
export function getNodeById(nodeId: string): KnowledgeNode | undefined {
  return getStore().findById('knowledge_nodes', nodeId);
}

/**
 * Get all edges for a project.
 */
export function getEdgesByProject(projectId: string): KnowledgeEdge[] {
  return getStore()
    .findBy('knowledge_edges', (e) => e.project_id === projectId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/**
 * Get edges originating from a specific node.
 */
export function getOutgoingEdges(nodeId: string): KnowledgeEdge[] {
  return getStore().findBy('knowledge_edges', (e) => e.source_node_id === nodeId);
}

/**
 * Get edges pointing to a specific node.
 */
export function getIncomingEdges(nodeId: string): KnowledgeEdge[] {
  return getStore().findBy('knowledge_edges', (e) => e.target_node_id === nodeId);
}

/**
 * Get child nodes of a given node (via CONTAINS edges).
 */
export function getChildNodes(nodeId: string): KnowledgeNode[] {
  const store = getStore();
  const containsEdges = store.findBy(
    'knowledge_edges',
    (e) => e.source_node_id === nodeId && e.edge_type === EdgeType.CONTAINS
  );

  const childIds = containsEdges.map((e) => e.target_node_id);
  return childIds
    .map((id) => store.findById('knowledge_nodes', id))
    .filter(Boolean) as KnowledgeNode[];
}

/**
 * Get all workflows for a project.
 */
export function getWorkflowsByProject(projectId: string): Workflow[] {
  return getStore()
    .findBy('workflows', (w) => w.project_id === projectId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/**
 * Get workflow steps for a specific workflow.
 */
export function getWorkflowSteps(workflowId: string): WorkflowStep[] {
  return getStore()
    .findBy('workflow_steps', (s) => s.workflow_id === workflowId)
    .sort((a, b) => a.step_number - b.step_number);
}

/**
 * Get a project by ID.
 */
export function getProject(projectId: string): Project | undefined {
  return getStore().findById('projects', projectId);
}

/**
 * Get all projects.
 */
export function getAllProjects(): Project[] {
  return getStore()
    .findAll('projects')
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Remove a node and every edge that refers to it. Caller controls transaction scope. */
function deleteNodeAndConnectedEdges(store: ReturnType<typeof getStore>, nodeId: string): void {
  store.deleteBy(
    'knowledge_edges',
    (edge) => edge.source_node_id === nodeId || edge.target_node_id === nodeId
  );
  store.delete('knowledge_nodes', nodeId);
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete a node and all its connected edges.
 */
export function deleteNode(nodeId: string): void {
  const store = getStore();
  runTransaction(() => {
    deleteNodeAndConnectedEdges(store, nodeId);
  });
}

/**
 * Delete an edge by ID.
 */
export function deleteEdge(edgeId: string): void {
  getStore().delete('knowledge_edges', edgeId);
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get graph statistics for a project.
 */
export function getGraphStats(projectId: string): {
  total_nodes: number;
  total_edges: number;
  total_workflows: number;
  node_type_counts: Record<string, number>;
  edge_type_counts: Record<string, number>;
} {
  const store = getStore();

  const nodes = store.findBy('knowledge_nodes', (n) => n.project_id === projectId);
  const edges = store.findBy('knowledge_edges', (e) => e.project_id === projectId);
  const workflows = store.findBy('workflows', (w) => w.project_id === projectId);

  const nodeTypeCounts: Record<string, number> = {};
  for (const node of nodes) {
    nodeTypeCounts[node.node_type] = (nodeTypeCounts[node.node_type] || 0) + 1;
  }

  const edgeTypeCounts: Record<string, number> = {};
  for (const edge of edges) {
    edgeTypeCounts[edge.edge_type] = (edgeTypeCounts[edge.edge_type] || 0) + 1;
  }

  return {
    total_nodes: nodes.length,
    total_edges: edges.length,
    total_workflows: workflows.length,
    node_type_counts: nodeTypeCounts,
    edge_type_counts: edgeTypeCounts,
  };
}
