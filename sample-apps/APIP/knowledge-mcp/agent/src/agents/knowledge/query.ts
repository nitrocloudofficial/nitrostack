/**
 * Knowledge Graph Agent — Component 5: Query Engine
 * 
 * Exposes high-level query methods for other agents to consume the knowledge graph.
 * Each method returns structured data tailored to the consuming agent's needs.
 */

import { getStore } from './database';
import {
  getNodesByProject,
  getNodesByType,
  getEdgesByProject,
  getWorkflowsByProject,
  getWorkflowSteps,
  getChildNodes,
  getOutgoingEdges,
  getNodeById,
  getProject,
  getGraphStats,
} from './graph';
import {
  KnowledgeNode,
  KnowledgeEdge,
  Workflow,
  WorkflowStep,
  NodeType,
  EdgeType,
  GraphExport,
  NavigationPath,
  SearchResult,
} from './models';

// ============================================================================
// FULL GRAPH EXPORT
// ============================================================================

/**
 * Export the complete graph for a project.
 * Used by agents that need the full picture (e.g., Documentation Agent).
 */
export function getFullGraph(projectId: string): GraphExport | null {
  const project = getProject(projectId);
  if (!project) return null;

  const nodes = getNodesByProject(projectId);
  const edges = getEdgesByProject(projectId);
  const workflows = getWorkflowsByProject(projectId);
  const stats = getGraphStats(projectId);

  return {
    project,
    nodes,
    edges,
    workflows,
    stats,
  };
}

// ============================================================================
// DOWNSTREAM AGENT QUERIES
// ============================================================================

/**
 * Get all workflows with their steps.
 * Used by: Documentation Agent, Demo Agent
 */
export function getAllWorkflows(projectId: string): Array<Workflow & { steps: WorkflowStep[] }> {
  const workflows = getWorkflowsByProject(projectId);

  return workflows.map((wf) => ({
    ...wf,
    steps: getWorkflowSteps(wf.id),
  }));
}

/**
 * Get all forms and their fields.
 * Used by: QA Agent (for generating Playwright test scripts)
 */
export function getForms(projectId: string): Array<{
  form: KnowledgeNode;
  fields: KnowledgeNode[];
  submit_info: { button_selector?: string; action_url?: string };
}> {
  const formNodes = getNodesByType(projectId, NodeType.FORM);

  return formNodes.map((form) => {
    const fields = getChildNodes(form.id).filter(
      (n) => n.node_type === NodeType.INPUT_FIELD
    );
    const meta = safeParseJSON(form.metadata);

    return {
      form,
      fields,
      submit_info: {
        button_selector: meta?.submit_button as string | undefined,
        action_url: meta?.action_url as string | undefined,
      },
    };
  });
}

/**
 * Get all pages with their child elements.
 * Used by: Documentation Agent, Demo Agent
 */
export function getPages(projectId: string): Array<{
  page: KnowledgeNode;
  children: KnowledgeNode[];
}> {
  const pageNodes = getNodesByType(projectId, NodeType.PAGE);

  return pageNodes.map((page) => ({
    page,
    children: getChildNodes(page.id),
  }));
}

/**
 * Get all UI elements of a specific subtype.
 * Used by: QA Agent
 */
export function getUIElements(projectId: string, subtype?: string): KnowledgeNode[] {
  const store = getStore();

  if (subtype) {
    return store.findBy(
      'knowledge_nodes',
      (n) => n.project_id === projectId && n.node_type === NodeType.UI_ELEMENT && n.subtype === subtype
    ).sort((a, b) => a.label.localeCompare(b.label));
  }

  return getNodesByType(projectId, NodeType.UI_ELEMENT);
}

/**
 * Find a feature by name (partial match).
 * Used by: Chat Agent
 */
export function findFeature(projectId: string, searchTerm: string): KnowledgeNode[] {
  const store = getStore();
  const lowerTerm = searchTerm.toLowerCase();

  return store.findBy('knowledge_nodes', (n) =>
    n.project_id === projectId &&
    (n.node_type === NodeType.FEATURE || n.node_type === NodeType.PAGE) &&
    (n.label.toLowerCase().includes(lowerTerm) ||
     (n.description || '').toLowerCase().includes(lowerTerm))
  ).sort((a, b) => {
    // Exact label matches first, then partial
    const aExact = a.label.toLowerCase().includes(lowerTerm) ? 0 : 1;
    const bExact = b.label.toLowerCase().includes(lowerTerm) ? 0 : 1;
    return aExact - bExact || a.label.localeCompare(b.label);
  });
}

/**
 * Find the navigation path between two nodes using BFS traversal.
 * Used by: Demo Agent (for generating walkthrough sequences)
 */
export function getNavigationPath(
  projectId: string,
  fromNodeId: string,
  toNodeId: string
): NavigationPath | null {
  const fromNode = getNodeById(fromNodeId);
  const toNode = getNodeById(toNodeId);
  if (
    !fromNode ||
    !toNode ||
    fromNode.project_id !== projectId ||
    toNode.project_id !== projectId
  ) {
    return null;
  }

  // BFS traversal through the graph
  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; path: string[]; edgeIds: string[] }> = [
    { nodeId: fromNodeId, path: [fromNodeId], edgeIds: [] },
  ];

  visited.add(fromNodeId);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.nodeId === toNodeId) {
      // Reconstruct path with full node objects
      const pathNodes = current.path
        .map((id) => getNodeById(id))
        .filter(Boolean) as KnowledgeNode[];

      const store = getStore();
      const pathEdges = current.edgeIds
        .map((id) => store.findById('knowledge_edges', id))
        .filter((edge): edge is KnowledgeEdge => edge !== undefined && edge.project_id === projectId);

      if (pathEdges.length !== current.edgeIds.length) {
        return null;
      }

      return {
        from: fromNode,
        to: toNode,
        path: pathNodes,
        edges: pathEdges,
        total_steps: pathNodes.length - 1,
      };
    }

    // Get all outgoing edges from current node
    const outEdges = getOutgoingEdges(current.nodeId)
      .filter((edge) => edge.project_id === projectId);
    for (const edge of outEdges) {
      const targetNode = getNodeById(edge.target_node_id);
      if (targetNode?.project_id !== projectId) {
        continue;
      }

      if (!visited.has(edge.target_node_id)) {
        visited.add(edge.target_node_id);
        queue.push({
          nodeId: edge.target_node_id,
          path: [...current.path, edge.target_node_id],
          edgeIds: [...current.edgeIds, edge.id],
        });
      }
    }
  }

  return null; // No path found
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Keyword search across all nodes.
 * Searches label, description, and metadata fields.
 */
export function keywordSearch(projectId: string, query: string): SearchResult[] {
  const store = getStore();
  const lowerQuery = query.toLowerCase();

  const matching = store.findBy('knowledge_nodes', (n) => {
    if (n.project_id !== projectId) return false;
    return (
      n.label.toLowerCase().includes(lowerQuery) ||
      (n.description || '').toLowerCase().includes(lowerQuery) ||
      (n.metadata || '').toLowerCase().includes(lowerQuery)
    );
  });

  // Score and sort results
  return matching
    .map((node) => {
      let score = 20;
      let matched_field = 'metadata';

      if (node.label.toLowerCase() === lowerQuery) {
        score = 100;
        matched_field = 'label';
      } else if (node.label.toLowerCase().includes(lowerQuery)) {
        score = 80;
        matched_field = 'label';
      } else if ((node.description || '').toLowerCase().includes(lowerQuery)) {
        score = 60;
        matched_field = 'description';
      } else if ((node.metadata || '').toLowerCase().includes(lowerQuery)) {
        score = 40;
        matched_field = 'metadata';
      }

      return { node, score, matched_field };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
}

// ============================================================================
// Helpers
// ============================================================================

function safeParseJSON(str?: string): Record<string, unknown> | null {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
