/**
 * Knowledge Graph Agent — Barrel Exports
 * 
 * Re-exports all public APIs from the knowledge graph agent modules.
 */

// Core pipeline
export { processExploration, processBatch } from './agent';

// Data ingestion
export { ingestPayload, validatePayload, getExploration, listExplorations } from './ingest';

// Entity extraction
export { extractEntities } from './entities';

// Relationship building
export { buildRelationships, reconcileNavigationEdges } from './relationships';

// Graph CRUD
export {
  upsertNode, upsertNodes, syncPageNodes,
  upsertEdge, upsertEdges, syncEdges,
  createWorkflow, upsertWorkflow,
  getNodesByProject, getNodesByType, getNodeByKey, getNodeById,
  getEdgesByProject, getOutgoingEdges, getIncomingEdges, getChildNodes,
  getWorkflowsByProject, getWorkflowSteps,
  getProject, getAllProjects,
  deleteNode, deleteEdge,
  getGraphStats,
} from './graph';

// Query engine
export {
  getFullGraph,
  getAllWorkflows,
  getForms,
  getPages,
  getUIElements,
  findFeature,
  getNavigationPath,
  keywordSearch,
} from './query';

// Publisher
export { eventBus, publishGraphUpdated, publishExplorationCompleted } from './publisher';

// Database
export { getStore, closeDatabase } from './database';

// Models & types
export * from './models';
