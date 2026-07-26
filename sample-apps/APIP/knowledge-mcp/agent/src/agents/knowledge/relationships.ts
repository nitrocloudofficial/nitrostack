/**
 * Knowledge Graph Agent — Component 3: Relationship Builder
 * 
 * Analyzes extracted nodes and the original payload to build directional edges.
 * Creates CONTAINS, NAVIGATES_TO, OPENS, SUBMITS, and other relationship types.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ExplorerPayload,
  KnowledgeNode,
  KnowledgeEdge,
  NodeType,
  EdgeType,
  UIElementSubtype,
  generateEdgeKey,
} from './models';
import { deleteEdge, getEdgesByProject, getNodesByProject, upsertEdges } from './graph';

export interface NavigationReconciliationResult {
  created: number;
  updated: number;
  unchanged: number;
  removed: number;
  unresolved: number;
}

/**
 * Build all relationship edges from the extracted nodes and original payload.
 * This is the main entry point for relationship building.
 */
export function buildRelationships(
  nodes: KnowledgeNode[],
  payload: ExplorerPayload,
  explorationId: string
): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
  const now = new Date().toISOString();
  const projectId = payload.project_id;

  // Find the page node (there should be exactly one per payload)
  const pageNode = nodes.find((n) => n.node_type === NodeType.PAGE);
  if (!pageNode) {
    console.warn('[Relationships] No PAGE node found — cannot build containment edges');
    return edges;
  }

  // 1. Page CONTAINS all its child elements
  edges.push(...buildContainmentEdges(pageNode, nodes, projectId, explorationId, now));

  // 2. Form CONTAINS its input fields
  edges.push(...buildFormFieldEdges(nodes, projectId, explorationId, now));

  // 3. Navigation links NAVIGATES_TO target pages. Nodes are persisted before
  // relationship building, so this includes pages found in earlier explorations.
  const projectNodes = getNodesByProject(projectId);
  edges.push(...buildNavigationEdges(nodes, projectNodes, projectId, explorationId, now));

  // 4. Buttons that OPEN dialogs or forms
  edges.push(...buildActionEdges(nodes, payload, projectId, explorationId, now));

  // 5. Forms SUBMIT to endpoints
  edges.push(...buildSubmissionEdges(nodes, payload, projectId, explorationId, now));

  console.log(`[Relationships] Built ${edges.length} edges for page "${payload.page.title}"`);
  return edges;
}

/**
 * Build CONTAINS edges: Page → Button, Page → Form, Page → Section, etc.
 */
function buildContainmentEdges(
  pageNode: KnowledgeNode,
  nodes: KnowledgeNode[],
  projectId: string,
  explorationId: string,
  now: string
): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];

  // API endpoints are graph resources reached through a form submission, not
  // visible page children. All remaining non-page, non-input-field nodes are
  // direct children of the page.
  const directChildren = nodes.filter(
    (n) =>
      n.id !== pageNode.id &&
      n.node_type !== NodeType.INPUT_FIELD &&
      n.node_type !== NodeType.API_ENDPOINT
  );

  for (const child of directChildren) {
    edges.push(createEdge(
      pageNode.id,
      child.id,
      EdgeType.CONTAINS,
      `${pageNode.label} contains ${child.label}`,
      projectId,
      explorationId,
      now
    ));
  }

  return edges;
}

/**
 * Build CONTAINS edges: Form → InputField (form fields belong to their parent form)
 */
function buildFormFieldEdges(
  nodes: KnowledgeNode[],
  projectId: string,
  explorationId: string,
  now: string
): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
  const formNodes = nodes.filter((n) => n.node_type === NodeType.FORM);
  const fieldNodes = nodes.filter((n) => n.node_type === NodeType.INPUT_FIELD);

  for (const field of fieldNodes) {
    // Match field to form via metadata.parent_form
    const fieldMeta = safeParseJSON(field.metadata);
    const parentFormName = fieldMeta?.parent_form;

    if (parentFormName) {
      const parentForm = formNodes.find((f) => f.label === parentFormName);
      if (parentForm) {
        edges.push(createEdge(
          parentForm.id,
          field.id,
          EdgeType.CONTAINS,
          `${parentForm.label} contains field ${field.label}`,
          projectId,
          explorationId,
          now
        ));
      }
    }
  }

  return edges;
}

/**
 * Build NAVIGATES_TO edges: Link → a real PAGE node (inferred from link target).
 * Unresolved targets intentionally produce no edge; a reconciliation pass will
 * add them when the target page is explored later.
 */
function buildNavigationEdges(
  sourceNodes: KnowledgeNode[],
  candidateNodes: KnowledgeNode[],
  projectId: string,
  explorationId: string,
  now: string
): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
  const linkNodes = sourceNodes.filter(isNavigationLink);
  const pageNodes = candidateNodes.filter(
    (n) => n.project_id === projectId && n.node_type === NodeType.PAGE
  );

  for (const linkNode of linkNodes) {
    const meta = safeParseJSON(linkNode.metadata);
    const target = getStringMetaValue(meta, 'target');
    if (!target) {
      continue;
    }

    const targetPage = findTargetPage(target, pageNodes);
    if (targetPage && targetPage.id !== linkNode.id) {
      const edgeExplorationId = explorationId || linkNode.exploration_id;
      edges.push(createEdge(
        linkNode.id,
        targetPage.id,
        EdgeType.NAVIGATES_TO,
        `${linkNode.label} navigates to ${targetPage.label}`,
        projectId,
        edgeExplorationId,
        now,
        { target_url: target, target_page_id: targetPage.id }
      ));
    }
  }

  return edges;
}

/**
 * Build OPENS edges: Button → Dialog/Form (buttons that trigger modals or forms)
 */
function buildActionEdges(
  nodes: KnowledgeNode[],
  payload: ExplorerPayload,
  projectId: string,
  explorationId: string,
  now: string
): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
  const buttonNodes = nodes.filter(
    (n) => n.node_type === NodeType.UI_ELEMENT && n.subtype === UIElementSubtype.BUTTON
  );

  for (const btn of buttonNodes) {
    const meta = safeParseJSON(btn.metadata);
    
    if (meta?.action === 'opens_modal' || meta?.action === 'opens') {
      // Find the matching dialog or form by target reference
      const targetName = meta.target;
      if (targetName) {
        const targetNode = nodes.find(
          (n) =>
            (n.node_type === NodeType.DIALOG || n.node_type === NodeType.FORM) &&
            (n.label === targetName || n.selector === targetName)
        );

        if (targetNode) {
          edges.push(createEdge(
            btn.id,
            targetNode.id,
            EdgeType.OPENS,
            `${btn.label} opens ${targetNode.label}`,
            projectId,
            explorationId,
            now
          ));
        }
      }
    }
  }

  return edges;
}

/**
 * Build SUBMITS edges: Form → API endpoint (forms with action URLs)
 */
function buildSubmissionEdges(
  nodes: KnowledgeNode[],
  payload: ExplorerPayload,
  projectId: string,
  explorationId: string,
  now: string
): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];
  const formNodes = nodes.filter((n) => n.node_type === NodeType.FORM);
  const endpointByActionUrl = new Map<string, KnowledgeNode>();

  for (const endpoint of nodes) {
    if (endpoint.node_type !== NodeType.API_ENDPOINT) {
      continue;
    }

    const endpointUrl = normalizeActionUrl(getStringMetaValue(safeParseJSON(endpoint.metadata), 'action_url'));
    if (endpointUrl) {
      endpointByActionUrl.set(endpointUrl, endpoint);
    }
  }

  for (const formNode of formNodes) {
    const meta = safeParseJSON(formNode.metadata);
    const actionUrl = normalizeActionUrl(getStringMetaValue(meta, 'action_url'));
    const endpointNode = actionUrl ? endpointByActionUrl.get(actionUrl) : undefined;

    if (actionUrl && endpointNode && endpointNode.id !== formNode.id) {
      edges.push(createEdge(
        formNode.id,
        endpointNode.id,
        EdgeType.SUBMITS,
        `${formNode.label} submits to ${endpointNode.label}`,
        projectId,
        explorationId,
        now,
        { action_url: actionUrl, endpoint_id: endpointNode.id }
      ));
    }
  }

  return edges;
}

/**
 * Rebuild all navigation edges for a project from the persisted graph.
 *
 * It is safe to call after every ingestion: stale placeholder/self-loop edges
 * are removed and links whose target pages are now available receive a real
 * NAVIGATES_TO edge. Links whose pages are not yet known remain unresolved
 * without creating invalid self-references.
 */
export function reconcileNavigationEdges(projectId: string): NavigationReconciliationResult {
  const projectNodes = getNodesByProject(projectId);
  const navigationEdges = buildNavigationEdges(
    projectNodes,
    projectNodes,
    projectId,
    '',
    new Date().toISOString()
  );
  const expectedKeys = new Set(navigationEdges.map((edge) => edge.edge_key));
  const existingNavigationEdges = getEdgesByProject(projectId).filter(
    (edge) => edge.edge_type === EdgeType.NAVIGATES_TO
  );

  // Remove only stale or legacy placeholder edges. Identical navigation edges
  // stay in place, making an unchanged scan a genuine no-op.
  const staleNavigationEdges = existingNavigationEdges.filter(
    (edge) => !expectedKeys.has(edge.edge_key)
  );
  for (const edge of staleNavigationEdges) {
    deleteEdge(edge.id);
  }

  const result = upsertEdges(navigationEdges);
  const totalNavigationLinks = projectNodes.filter(isNavigationLink).length;

  return {
    created: result.created,
    updated: result.updated,
    unchanged: result.existing,
    removed: staleNavigationEdges.length,
    unresolved: totalNavigationLinks - navigationEdges.length,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Create a single KnowledgeEdge with a deterministic key.
 */
function createEdge(
  sourceId: string,
  targetId: string,
  edgeType: EdgeType,
  label: string,
  projectId: string,
  explorationId: string,
  now: string,
  extraMeta?: Record<string, unknown>
): KnowledgeEdge {
  return {
    id: uuidv4(),
    edge_key: generateEdgeKey(sourceId, targetId, edgeType),
    project_id: projectId,
    exploration_id: explorationId,
    source_node_id: sourceId,
    target_node_id: targetId,
    edge_type: edgeType,
    label,
    weight: 1.0,
    metadata: extraMeta ? JSON.stringify(extraMeta) : undefined,
    created_at: now,
  };
}

/** A link contributes navigation only when Explorer explicitly recorded it as navigation. */
function isNavigationLink(node: KnowledgeNode): boolean {
  if (node.node_type !== NodeType.UI_ELEMENT || node.subtype !== UIElementSubtype.LINK) {
    return false;
  }

  const meta = safeParseJSON(node.metadata);
  return meta?.action === 'navigates' && Boolean(getStringMetaValue(meta, 'target'));
}

/** Find the PAGE node represented by a link target URL, route, or page label. */
function findTargetPage(target: string, pages: KnowledgeNode[]): KnowledgeNode | undefined {
  const normalizedTarget = normalizeNavigationTarget(target);
  if (!normalizedTarget) {
    return undefined;
  }

  const targetLabel = target.trim().toLocaleLowerCase();

  return pages.find((page) => {
    if (page.page_url && navigationTargetsMatch(normalizedTarget, page.page_url)) {
      return true;
    }

    const route = getStringMetaValue(safeParseJSON(page.metadata), 'route');
    if (route && navigationTargetsMatch(normalizedTarget, route)) {
      return true;
    }

    return page.label.trim().toLocaleLowerCase() === targetLabel;
  });
}

interface NormalizedNavigationTarget {
  path: string;
  origin?: string;
}

/** Normalize URL/route forms while retaining origin for absolute-link safety. */
function normalizeNavigationTarget(value: string): NormalizedNavigationTarget | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('#') || /^(javascript|mailto|tel):/i.test(trimmed)) {
    return undefined;
  }

  try {
    const isAbsolute = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) || trimmed.startsWith('//');
    const parsed = new URL(trimmed, 'https://knowledge-graph.invalid');
    const path = normalizePath(parsed.pathname);
    return {
      path,
      origin: isAbsolute ? parsed.origin : undefined,
    };
  } catch {
    return { path: normalizePath(trimmed) };
  }
}

function navigationTargetsMatch(target: NormalizedNavigationTarget, candidate: string): boolean {
  const normalizedCandidate = normalizeNavigationTarget(candidate);
  if (!normalizedCandidate || target.path !== normalizedCandidate.path) {
    return false;
  }

  return !target.origin || target.origin === normalizedCandidate.origin;
}

function normalizePath(path: string): string {
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, '');
  return withoutTrailingSlash || '/';
}

function normalizeActionUrl(actionUrl?: string): string | undefined {
  const normalized = actionUrl?.trim();
  return normalized || undefined;
}

function getStringMetaValue(metadata: Record<string, unknown> | null, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Safely parse a JSON string, returning null on failure.
 */
function safeParseJSON(str?: string): Record<string, unknown> | null {
  if (!str) return null;
  try {
    const parsed: unknown = JSON.parse(str);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}
