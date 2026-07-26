/**
 * Knowledge Graph Agent — Main Pipeline Orchestrator
 * 
 * Chains all 6 MVP components into a single pipeline:
 * Ingest → Extract Entities → Build Relationships → Store → Publish
 * 
 * This is the main entry point for processing Explorer Agent output.
 */

import { v4 as uuidv4 } from 'uuid';
import { ingestPayload, completeExploration } from './ingest';
import { extractEntities } from './entities';
import { buildRelationships, reconcileNavigationEdges } from './relationships';
import {
  syncPageNodes,
  syncEdges,
  upsertWorkflow,
  getNodesByProject,
} from './graph';
import { publishGraphUpdated, publishExplorationCompleted } from './publisher';
import {
  EdgeType,
  ExplorerPayload,
  ExplorerWorkflowStep,
  KnowledgeNode,
  NodeType,
  PipelineResult,
  Workflow,
  WorkflowStep,
  generateWorkflowKey,
} from './models';

/**
 * Process a single Explorer payload through the full knowledge graph pipeline.
 * 
 * Pipeline steps:
 * 1. Data Ingestion — validate and store raw payload
 * 2. Entity Extraction — create typed nodes from payload elements
 * 3. Relationship Building — infer directional edges between nodes
 * 4. Graph Storage — persist nodes and edges with dedup
 * 5. Workflow Creation — store any discovered user journeys
 * 6. Publishing — notify downstream agents
 */
export async function processExploration(payload: unknown): Promise<PipelineResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const pageTitle = getPayloadPageTitle(payload);

  console.log('\n' + '='.repeat(60));
  console.log(`[Agent] Processing exploration for page: "${pageTitle}"`);
  console.log('='.repeat(60));

  // ── Step 1: Data Ingestion ────────────────────────────────────────────
  console.log('\n[Pipeline] Step 1/6: Data Ingestion...');
  const ingestion = ingestPayload(payload);

  if (!ingestion.success) {
    return {
      exploration_id: ingestion.exploration_id,
      project_id: ingestion.project_id,
      nodes_created: 0,
      nodes_updated: 0,
      edges_created: 0,
      workflows_created: 0,
      errors: ingestion.errors,
      duration_ms: Date.now() - startTime,
    };
  }

  const { exploration_id, project_id } = ingestion;
  const explorerPayload = payload as ExplorerPayload;

  try {
    // ── Step 2: Entity Extraction ─────────────────────────────────────────
    console.log('[Pipeline] Step 2/6: Entity Extraction...');
    const nodes = extractEntities(explorerPayload, exploration_id);
    const nodeResult = syncPageNodes(nodes);

    // ── Step 3: Relationship Building ─────────────────────────────────────
    console.log('[Pipeline] Step 3/6: Relationship Building...');
    const edges = buildRelationships(nodes, explorerPayload, exploration_id);

    // ── Step 4: Graph Storage ─────────────────────────────────────────────
    console.log('[Pipeline] Step 4/6: Graph Storage...');
    const nonNavigationEdges = edges.filter((edge) => edge.edge_type !== EdgeType.NAVIGATES_TO);
    const edgeResult = syncEdges(
      nonNavigationEdges,
      nodes.map((node) => node.id),
      [EdgeType.CONTAINS, EdgeType.OPENS, EdgeType.SUBMITS]
    );
    const navigationResult = reconcileNavigationEdges(project_id);
    const totalEdgesCreated = edgeResult.created + navigationResult.created;

    // ── Step 5: Workflow Creation ─────────────────────────────────────────
    console.log('[Pipeline] Step 5/6: Workflow Creation...');
    let workflowsCreated = 0;

    if (explorerPayload.workflows?.length) {
      const projectNodes = getNodesByProject(project_id);

      for (const wf of explorerPayload.workflows) {
        const workflowId = uuidv4();
        const now = new Date().toISOString();

        const workflow: Workflow = {
          id: workflowId,
          workflow_key: generateWorkflowKey(project_id, explorerPayload.page.url, wf.name),
          project_id,
          exploration_id,
          source_page_url: explorerPayload.page.url,
          name: wf.name,
          description: `Workflow: ${wf.name}`,
          total_steps: wf.steps.length,
          created_at: now,
          updated_at: now,
        };

        const steps: WorkflowStep[] = wf.steps.map((step) => ({
          id: uuidv4(),
          workflow_id: workflowId,
          step_number: step.step_number,
          node_id: findWorkflowStepNodeId(step, projectNodes),
          action: step.action,
          target_label: step.target_label,
          target_selector: step.target_selector,
          value: step.value,
          page_url: step.page_url,
          screenshot_path: step.screenshot_path,
          created_at: now,
        }));

        if (upsertWorkflow(workflow, steps) === 'created') {
          workflowsCreated++;
        }
      }
    }

    // ── Step 6: Publishing ────────────────────────────────────────────────
    console.log('[Pipeline] Step 6/6: Publishing...');
    
    const modifiedNodeIds = nodes.map((n) => n.id);
    
    publishGraphUpdated(project_id, exploration_id, {
      nodes_created: nodeResult.created,
      nodes_updated: nodeResult.updated,
      edges_created: totalEdgesCreated,
      modified_node_ids: modifiedNodeIds,
      workflows_created: workflowsCreated,
    });

    // Mark exploration as completed
    completeExploration(exploration_id, {
      nodes_created: nodeResult.created,
      edges_created: totalEdgesCreated,
    });

    publishExplorationCompleted(project_id, exploration_id, {
      nodes_created: nodeResult.created,
      nodes_updated: nodeResult.updated,
      edges_created: totalEdgesCreated,
      workflows_created: workflowsCreated,
    });

    const result: PipelineResult = {
      exploration_id,
      project_id,
      nodes_created: nodeResult.created,
      nodes_updated: nodeResult.updated,
      edges_created: totalEdgesCreated,
      workflows_created: workflowsCreated,
      errors,
      duration_ms: Date.now() - startTime,
    };

    console.log('\n' + '-'.repeat(60));
    console.log(`[Agent] Pipeline complete in ${result.duration_ms}ms`);
    console.log(`  Nodes: ${result.nodes_created} created, ${result.nodes_updated} updated`);
    console.log(`  Edges: ${result.edges_created} created`);
    console.log(`  Workflows: ${result.workflows_created} created`);
    console.log('-'.repeat(60) + '\n');

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Agent] Pipeline failed: ${message}`);

    completeExploration(exploration_id, { nodes_created: 0, edges_created: 0 }, 'failed');

    return {
      exploration_id,
      project_id,
      nodes_created: 0,
      nodes_updated: 0,
      edges_created: 0,
      workflows_created: 0,
      errors: [message],
      duration_ms: Date.now() - startTime,
    };
  }
}

/** Resolve a recorded workflow step to the best matching graph node. */
function findWorkflowStepNodeId(
  step: ExplorerWorkflowStep,
  nodes: KnowledgeNode[]
): string | undefined {
  if (step.target_selector) {
    const selectorMatch = nodes.find((node) => node.selector === step.target_selector);
    if (selectorMatch) return selectorMatch.id;
  }

  if (step.target_label) {
    const labelMatches = nodes.filter(
      (node) => node.label.toLowerCase() === step.target_label!.toLowerCase()
    );
    const pageSpecificMatch = step.page_url
      ? labelMatches.find((node) => node.page_url === step.page_url)
      : undefined;
    if (pageSpecificMatch) return pageSpecificMatch.id;
    if (labelMatches[0]) return labelMatches[0].id;
  }

  if (step.page_url) {
    return nodes.find(
      (node) => node.node_type === NodeType.PAGE && node.page_url === step.page_url
    )?.id;
  }

  return undefined;
}

/** Read a display-only title without assuming that an untrusted payload is valid. */
function getPayloadPageTitle(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return 'unknown';
  const page = (payload as { page?: unknown }).page;
  if (!page || typeof page !== 'object') return 'unknown';
  const title = (page as { title?: unknown }).title;
  return typeof title === 'string' ? title : 'unknown';
}

/**
 * Process multiple Explorer payloads (batch ingestion).
 */
export async function processBatch(payloads: unknown[]): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  console.log(`[Agent] Processing batch of ${payloads.length} pages...`);

  for (const payload of payloads) {
    const result = await processExploration(payload);
    results.push(result);
  }

  const totalNodes = results.reduce((sum, r) => sum + r.nodes_created + r.nodes_updated, 0);
  const totalEdges = results.reduce((sum, r) => sum + r.edges_created, 0);
  console.log(`[Agent] Batch complete: ${totalNodes} nodes, ${totalEdges} edges across ${payloads.length} pages`);

  return results;
}
