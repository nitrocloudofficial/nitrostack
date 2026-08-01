/**
 * ============================================================================
 * SHARED CONTRACT — build_risk_graph output
 * Owner: Backend B. Consumed by: GraphView (Frontend B), score_risk (Backend A).
 * ============================================================================
 *
 * This shape is the one the build doc singles out as "lock it early since two
 * other people depend on it unchanged" — so, same as detect_duplicate_signals,
 * the two specified shapes are merged rather than one being dropped:
 *
 *   contracts.md §2 (authoritative, non-negotiable):
 *     nodes: [{ nodeId, kind, label, metadata }]
 *     edges: [{ from, to, relationship, weight, metadata }]
 *
 *   PassportIQ_BackendB.docx §3.2 (what GraphView was drawn against):
 *     nodes: [{ id, riskLevel }]
 *     edges: [{ source, target, reason }]
 *     clusterSize: number
 *
 * Every node carries BOTH `nodeId` and `id` (same value); every edge carries
 * BOTH `from`/`to` and `source`/`target` (same values). react-force-graph binds
 * to `id`/`source`/`target` out of the box, so Frontend B can point it at this
 * payload with no adapter, while score_risk still parses the frozen shape.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// contracts.md §2 — VERBATIM. DO NOT EDIT.
// ---------------------------------------------------------------------------
export const RiskGraphNodeSchema = z.object({
  nodeId: z.string().min(1),
  kind: z.enum(['application', 'applicant', 'document', 'passport', 'contact', 'external_record']),
  label: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
});
export type RiskGraphNode = z.infer<typeof RiskGraphNodeSchema>;

export const RiskGraphEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  relationship: z.enum([
    'owns',
    'matches',
    'submitted',
    'shares_identifier',
    'linked_to',
    'flagged_by',
  ]),
  weight: z.number().min(0).max(1),
  metadata: z.record(z.unknown()).default({}),
});
export type RiskGraphEdge = z.infer<typeof RiskGraphEdgeSchema>;

export const BuildRiskGraphResultSchema = z.object({
  applicationId: z.string().min(1),
  nodes: z.array(RiskGraphNodeSchema),
  edges: z.array(RiskGraphEdgeSchema),
});
export type BuildRiskGraphResult = z.infer<typeof BuildRiskGraphResultSchema>;

// ---------------------------------------------------------------------------
// BackendB.docx §3.2 compatibility view — additive, same values
// ---------------------------------------------------------------------------

export const RiskLevelSchema = z.enum(['low', 'medium', 'high']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

/**
 * `nodeRole` lets GraphView decide what to draw. The build doc describes a graph
 * of applicants ("nodes = applicants, edges = shared signals"), but
 * contracts.md's `kind` enum also allows contact / passport / document nodes,
 * which make the graph far more explanatory when you want to show WHICH phone
 * number is shared.
 *
 * Default output contains applicant nodes only, so the demo view stays clean.
 * Pass `includeIdentifierNodes: true` to get the richer bipartite graph; the
 * extra nodes are tagged `nodeRole: 'identifier'` so they can be styled or
 * filtered without inspecting `kind`.
 */
export const NodeRoleSchema = z.enum(['applicant', 'identifier']);
export type NodeRole = z.infer<typeof NodeRoleSchema>;

export const GraphNodeToolSchema = RiskGraphNodeSchema.extend({
  /** Mirror of `nodeId` — react-force-graph binds to `id`. */
  id: z.string().min(1),
  riskLevel: RiskLevelSchema,
  nodeRole: NodeRoleSchema,
  /** True for the application the officer currently has open. */
  isSubject: z.boolean(),
});
export type GraphNodeTool = z.infer<typeof GraphNodeToolSchema>;

export const GraphEdgeToolSchema = RiskGraphEdgeSchema.extend({
  /** Mirror of `from` — react-force-graph binds to `source`. */
  source: z.string().min(1),
  /** Mirror of `to` — react-force-graph binds to `target`. */
  target: z.string().min(1),
  /** Short officer-facing edge label, e.g. "reused phone number". */
  reason: z.string().min(1),
});
export type GraphEdgeTool = z.infer<typeof GraphEdgeToolSchema>;

export const BuildRiskGraphToolOutputSchema = z.object({
  applicationId: z.string().min(1),
  nodes: z.array(GraphNodeToolSchema),
  edges: z.array(GraphEdgeToolSchema),

  /** docx §3.2: number of applications in the connected cluster, subject included. */
  clusterSize: z.number().int().min(1),

  /**
   * Everything score_risk needs to weight the graph without walking it itself.
   * Derived from the same edges/nodes — never computed separately.
   */
  clusterSummary: z.object({
    subjectApplicationId: z.string().min(1),
    linkedApplicationIds: z.array(z.string()),
    /** Distinct edge reasons across the cluster, e.g. ["reused phone number", ...]. */
    sharedSignalKinds: z.array(z.string()),
    /** Densest-cluster indicator: edges / max possible edges, 0..1. */
    density: z.number().min(0).max(1),
    /** true once the cluster looks coordinated rather than coincidental. */
    isCoordinatedPattern: z.boolean(),
    subjectRiskLevel: RiskLevelSchema,
    headline: z.string(),
  }),
});
export type BuildRiskGraphToolOutput = z.infer<typeof BuildRiskGraphToolOutputSchema>;

// ---------------------------------------------------------------------------
// Officer-facing edge labels
// ---------------------------------------------------------------------------

/**
 * Edge label per shared-identifier kind. Kept here (not inline in the service)
 * because these strings are read aloud during the demo and Frontend B may want
 * to match them in styling.
 */
export const EDGE_REASON_LABELS = {
  phone: 'reused phone number',
  address: 'reused address',
  document_image: 'reused document photo',
  passport_number: 'reused passport number',
  email: 'reused email address',
  name_dob: 'same name and date of birth',
} as const;

export type SharedIdentifierKind = keyof typeof EDGE_REASON_LABELS;
