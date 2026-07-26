/**
 * Knowledge Graph Agent — REST API Server
 * 
 * Exposes the Knowledge Graph Agent as an HTTP API for:
 * - Explorer Agent to POST exploration payloads
 * - Downstream agents to query the graph
 * - Dashboard to monitor graph state
 */

import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import { processExploration, processBatch } from './agents/knowledge/agent';
import {
  getFullGraph,
  getAllWorkflows,
  getForms,
  getPages,
  getUIElements,
  findFeature,
  getNavigationPath,
  keywordSearch,
} from './agents/knowledge/query';
import {
  getNodesByProject,
  getNodesByType,
  getEdgesByProject,
  getAllProjects,
  getGraphStats,
} from './agents/knowledge/graph';
import { listExplorations, validatePayload } from './agents/knowledge/ingest';
import { eventBus } from './agents/knowledge/publisher';
import { getStore, closeDatabase } from './agents/knowledge/database';
import { ExplorerPayload, NodeType } from './agents/knowledge/models';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// Middleware
app.use(express.json({ limit: '10mb' }));

// CORS for local development
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Event-Type, X-Project-Id');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  next();
});

// ============================================================================
// HEALTH & STATUS
// ============================================================================

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    agent: 'Knowledge Graph Agent',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// DATA INGESTION (Explorer Agent → Knowledge Graph)
// ============================================================================

/**
 * POST /api/ingest
 * Receive a single page exploration from the Explorer Agent.
 */
app.post('/api/ingest', async (req: Request, res: Response) => {
  try {
    const validation = validatePayload(req.body);
    if (!validation.valid) {
      res.status(400).json({ success: false, errors: validation.errors });
      return;
    }

    const result = await processExploration(req.body as ExplorerPayload);

    if (result.errors.length > 0) {
      res.status(400).json({ success: false, ...result });
    } else {
      res.json({ success: true, ...result });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Server] Ingestion error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/ingest/batch
 * Receive multiple pages at once from the Explorer Agent.
 */
app.post('/api/ingest/batch', async (req: Request, res: Response) => {
  try {
    if (!isRecord(req.body)) {
      res.status(400).json({ success: false, error: 'Expected a JSON object in request body' });
      return;
    }

    const { pages, project_id: batchProjectId } = req.body;

    if (!Array.isArray(pages)) {
      res.status(400).json({ success: false, error: 'Expected "pages" array in body' });
      return;
    }

    if (pages.length === 0) {
      res.status(400).json({ success: false, error: 'Expected at least one page in "pages" array' });
      return;
    }

    if (batchProjectId !== undefined && !isNonEmptyString(batchProjectId)) {
      res.status(400).json({ success: false, error: 'Invalid "project_id" (string required when provided)' });
      return;
    }

    // Validate every item before any graph changes are made. Items may supply
    // their own project ID, otherwise they inherit the batch-level project ID.
    const payloads: ExplorerPayload[] = [];
    const validationErrors: Array<{ index: number; errors: string[] }> = [];

    pages.forEach((page, index) => {
      if (!isRecord(page)) {
        validationErrors.push({ index, errors: ['Payload must be a non-null object'] });
        return;
      }

      const payload = {
        ...page,
        project_id: page.project_id ?? batchProjectId,
      };
      const validation = validatePayload(payload);

      if (!validation.valid) {
        validationErrors.push({ index, errors: validation.errors });
        return;
      }

      payloads.push(payload as ExplorerPayload);
    });

    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'One or more batch items are invalid',
        item_errors: validationErrors,
      });
      return;
    }

    const results = await processBatch(payloads);
    const failedResults = results
      .map((result, index) => ({ index, result }))
      .filter(({ result }) => result.errors.length > 0);

    if (failedResults.length > 0) {
      res.status(500).json({
        success: false,
        error: 'One or more batch items failed to process',
        results,
        failed_items: failedResults.map(({ index, result }) => ({
          index,
          errors: result.errors,
        })),
      });
      return;
    }

    res.json({ success: true, results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ============================================================================
// GRAPH QUERIES (Downstream Agents → Knowledge Graph)
// ============================================================================

/**
 * GET /api/projects
 * List all projects.
 */
app.get('/api/projects', (_req: Request, res: Response) => {
  const projects = getAllProjects();
  res.json({ projects });
});

/**
 * GET /api/graph/:projectId
 * Get the full graph for a project (nodes, edges, workflows, stats).
 */
app.get('/api/graph/:projectId', (req: Request, res: Response) => {
  const graph = getFullGraph(req.params.projectId);
  if (!graph) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(graph);
});

/**
 * GET /api/graph/:projectId/stats
 * Get graph statistics for a project.
 */
app.get('/api/graph/:projectId/stats', (req: Request, res: Response) => {
  const stats = getGraphStats(req.params.projectId);
  res.json(stats);
});

/**
 * GET /api/nodes/:projectId
 * Get nodes, optionally filtered by type.
 * Query params: ?type=PAGE|UI_ELEMENT|FORM|FEATURE|...
 */
app.get('/api/nodes/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const type = req.query.type as string | undefined;

  if (type) {
    const nodes = getNodesByType(projectId, type as NodeType);
    res.json({ nodes, count: nodes.length });
  } else {
    const nodes = getNodesByProject(projectId);
    res.json({ nodes, count: nodes.length });
  }
});

/**
 * GET /api/edges/:projectId
 * Get all edges for a project.
 */
app.get('/api/edges/:projectId', (req: Request, res: Response) => {
  const edges = getEdgesByProject(req.params.projectId);
  res.json({ edges, count: edges.length });
});

/**
 * GET /api/explorations/:projectId
 * List all explorations for a project.
 */
app.get('/api/explorations/:projectId', (req: Request, res: Response) => {
  const explorations = listExplorations(req.params.projectId);
  res.json({ explorations, count: explorations.length });
});

// ============================================================================
// QUERY ENGINE ENDPOINTS (For specific downstream agents)
// ============================================================================

/**
 * GET /api/query/workflows/:projectId
 * Get all workflows with their steps. (For Documentation Agent / Demo Agent)
 */
app.get('/api/query/workflows/:projectId', (req: Request, res: Response) => {
  const workflows = getAllWorkflows(req.params.projectId);
  res.json({ workflows, count: workflows.length });
});

/**
 * GET /api/query/forms/:projectId
 * Get all forms with their fields and submit info. (For QA Agent)
 */
app.get('/api/query/forms/:projectId', (req: Request, res: Response) => {
  const forms = getForms(req.params.projectId);
  res.json({ forms, count: forms.length });
});

/**
 * GET /api/query/pages/:projectId
 * Get all pages with their children. (For Documentation Agent)
 */
app.get('/api/query/pages/:projectId', (req: Request, res: Response) => {
  const pages = getPages(req.params.projectId);
  res.json({ pages, count: pages.length });
});

/**
 * GET /api/query/ui-elements/:projectId
 * Get UI elements, optionally filtered by subtype.
 * Query params: ?subtype=BUTTON|LINK|TAB|...
 */
app.get('/api/query/ui-elements/:projectId', (req: Request, res: Response) => {
  const subtype = req.query.subtype as string | undefined;
  const elements = getUIElements(req.params.projectId, subtype);
  res.json({ elements, count: elements.length });
});

/**
 * GET /api/query/search/:projectId
 * Keyword search across the graph. (For AI Chat Agent)
 * Query params: ?q=search+term
 */
app.get('/api/query/search/:projectId', (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query) {
    res.status(400).json({ error: 'Missing "q" query parameter' });
    return;
  }

  const results = keywordSearch(req.params.projectId, query);
  res.json({ results, count: results.length, query });
});

/**
 * GET /api/query/feature/:projectId
 * Find a feature by name. (For AI Chat Agent)
 * Query params: ?name=feature+name
 */
app.get('/api/query/feature/:projectId', (req: Request, res: Response) => {
  const name = req.query.name as string;
  if (!name) {
    res.status(400).json({ error: 'Missing "name" query parameter' });
    return;
  }

  const features = findFeature(req.params.projectId, name);
  res.json({ features, count: features.length, query: name });
});

/**
 * GET /api/query/path/:projectId
 * Find navigation path between two nodes. (For Demo Agent)
 * Query params: ?from=nodeId&to=nodeId
 */
app.get('/api/query/path/:projectId', (req: Request, res: Response) => {
  const from = req.query.from as string;
  const to = req.query.to as string;

  if (!from || !to) {
    res.status(400).json({ error: 'Missing "from" and "to" query parameters (node IDs)' });
    return;
  }

  const path = getNavigationPath(req.params.projectId, from, to);
  if (!path) {
    res.status(404).json({ error: 'No path found between the specified nodes' });
    return;
  }

  res.json(path);
});

// ============================================================================
// PUBLISHER (Webhook Registration)
// ============================================================================

/**
 * POST /api/webhooks/register
 * Register a webhook URL for event notifications.
 */
app.post('/api/webhooks/register', (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: 'Missing "url" in body' });
    return;
  }

  eventBus.registerWebhook(url);
  res.json({ success: true, message: `Webhook registered: ${url}` });
});

/**
 * GET /api/events/recent
 * Get recent published events.
 * Query params: ?count=10
 */
app.get('/api/events/recent', (req: Request, res: Response) => {
  const count = parseInt(req.query.count as string || '10', 10);
  const events = eventBus.getRecentEvents(count);
  res.json({ events, count: events.length });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = app.listen(PORT, () => {
  // Initialize database on startup
  getStore();

  console.log('\n' + '╔' + '═'.repeat(56) + '╗');
  console.log('║  Knowledge Graph Agent                                 ║');
  console.log('║  REST API Server                                       ║');
  console.log('╠' + '═'.repeat(56) + '╣');
  console.log(`║  URL: http://localhost:${PORT}                            ║`);
  console.log('║                                                        ║');
  console.log('║  Endpoints:                                            ║');
  console.log('║    POST /api/ingest           ← Explorer Agent         ║');
  console.log('║    POST /api/ingest/batch     ← Explorer Agent (bulk)  ║');
  console.log('║    GET  /api/graph/:id        → Full graph export      ║');
  console.log('║    GET  /api/query/workflows  → Documentation Agent    ║');
  console.log('║    GET  /api/query/forms      → QA Agent               ║');
  console.log('║    GET  /api/query/search     → AI Chat Agent          ║');
  console.log('║    GET  /api/health           → Health check           ║');
  console.log('╚' + '═'.repeat(56) + '╝\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  closeDatabase();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  server.close();
  process.exit(0);
});

export default app;
