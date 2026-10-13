import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import {
  BUSINESS_IMPACT,
  CAUSAL_GRAPH,
  INCIDENT,
  RECOMMENDATIONS,
  TIMELINE_EVENTS,
} from './data/incident-data.js';
import { SimulationEngine } from './services/simulation-engine.js';

type JsonObject = Record<string, unknown>;

const simulationEngine = new SimulationEngine();
const allowedIntents = new Set(['evidence', 'machine', 'compare', 'report']);

const toolTrace = [
  {
    id: 'trace-1',
    server: 'MES',
    tool: 'get_queue_events',
    status: 'complete',
    durationMs: 124,
    records: ['evt:Q-2407-001'],
  },
  {
    id: 'trace-2',
    server: 'Quality',
    tool: 'get_inspection_results',
    status: 'complete',
    durationMs: 96,
    records: ['insp:INSP-2407-091'],
  },
  {
    id: 'trace-3',
    server: 'Maintenance',
    tool: 'get_machine_alerts',
    status: 'complete',
    durationMs: 108,
    records: ['alert:MA-2407-012', 'alert:MA-2407-013'],
  },
  {
    id: 'trace-4',
    server: 'Simulation',
    tool: 'compare_scenarios',
    status: 'complete',
    durationMs: 342,
    records: ['sim:run_014', 'sim:run_015', 'sim:run_016'],
  },
];

const agentResponses: Record<string, JsonObject> = {
  evidence: {
    intent: 'show_evidence',
    conclusion: 'Queue delay is the strongest controllable contributor.',
    effect: 'Reducing the wait below 60 minutes restores predicted yield from 82% to 96%.',
    confidence: 0.96,
    evidenceRefs: ['timeline:evt_2291', 'graph:node_queue_delay', 'sim:run_014'],
    assumptions: ['Machine 7 condition held constant', 'No supplier change within 30 days'],
    actions: ['open_evidence', 'run_comparison', 'generate_report'],
  },
  machine: {
    intent: 'explain_exclusion',
    conclusion: 'Machine 7 contributes to the failure, but it is not the primary cause.',
    effect: 'Replacement alone improves predicted yield by 2 points, versus 14 points from reducing queue delay.',
    confidence: 0.87,
    evidenceRefs: ['timeline:evt_2293', 'graph:node_machine_7', 'sim:run_015'],
    assumptions: ['Queue delay remains at 198 minutes', 'Humidity conditions remain unchanged'],
    actions: ['open_evidence', 'run_comparison', 'generate_report'],
  },
  compare: {
    intent: 'compare_options',
    conclusion: 'Reduce queue delay first; it matches humidity control yield at a fraction of the cost.',
    effect: '96% predicted yield, INR 15,000 implementation cost, and about two hours to deploy.',
    confidence: 0.94,
    evidenceRefs: ['graph:node_queue_delay', 'sim:run_014', 'sim:run_016', 'sim:run_015'],
    assumptions: ['Current production schedule can be reprioritized', 'Supplier freeze remains active'],
    actions: ['open_evidence', 'run_comparison', 'generate_report'],
  },
  report: {
    intent: 'generate_report',
    conclusion: 'The plant-manager decision brief is ready for review.',
    effect: 'It packages the incident, evidence chain, scenarios, recommendation, impact, and approval record.',
    confidence: 0.96,
    evidenceRefs: ['timeline:evt_2291', 'graph:node_queue_delay', 'sim:run_014'],
    assumptions: ['The report remains a draft until an authorized manager approves it'],
    actions: ['open_evidence', 'generate_report'],
  },
};

function sendJson(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request: IncomingMessage): Promise<JsonObject> {
  const chunks: Buffer[] = [];
  let length = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > 1_000_000) throw new Error('Request body exceeds 1 MB');
    chunks.push(buffer);
  }

  if (chunks.length === 0) return {};
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Expected a JSON object');
  }
  return parsed as JsonObject;
}

function getAgentResponse(body: JsonObject) {
  const requestedIntent = typeof body.intent === 'string' ? body.intent : 'evidence';
  const intent = allowedIntents.has(requestedIntent) ? requestedIntent : 'evidence';

  if (body.incident_id && body.incident_id !== INCIDENT.incident_id) {
    return { status: 404, payload: { error: `Incident ${String(body.incident_id)} was not found` } };
  }
  if (body.batch_id && body.batch_id !== INCIDENT.batch_id) {
    return { status: 404, payload: { error: `Batch ${String(body.batch_id)} was not found` } };
  }

  return {
    status: 200,
    payload: {
      ...agentResponses[intent],
      incidentId: INCIDENT.incident_id,
      batchId: INCIDENT.batch_id,
      toolTrace,
    },
  };
}

async function route(request: IncomingMessage, response: ServerResponse) {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  const url = new URL(request.url ?? '/', 'http://forgeops.local');
  const routes: Record<string, unknown> = {
    '/api/health': {
      status: 'ok',
      service: 'forgeops-integrated-api',
      incidentId: INCIDENT.incident_id,
      modules: ['mes', 'maintenance', 'quality', 'materials', 'simulation', 'orchestrator'],
      runtime: {
        mode: 'deterministic-demo',
        transport: 'http-tool-bridge',
        agentProcesses: 0,
        mcpServerAttached: false,
      },
    },
    '/api/incident': INCIDENT,
    '/api/timeline': TIMELINE_EVENTS,
    '/api/graph': CAUSAL_GRAPH,
    '/api/recommendations': RECOMMENDATIONS,
    '/api/business-impact': BUSINESS_IMPACT,
  };

  if (request.method === 'GET' && url.pathname in routes) {
    sendJson(response, 200, routes[url.pathname]);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/simulate') {
    const body = await readJson(request);
    const name = typeof body.name === 'string'
      ? body.name
      : typeof body.scenario_name === 'string'
        ? body.scenario_name
        : 'baseline';
    const inputs = body.inputs && typeof body.inputs === 'object' ? body.inputs as JsonObject : {};
    const constraints = body.constraints && typeof body.constraints === 'object' ? body.constraints as JsonObject : {};
    const result = simulationEngine.runScenario({
      scenario_name: name,
      parameters: { ...inputs, ...constraints },
    });
    sendJson(response, 200, {
      ...result,
      evidence_refs: [
        `simulation:${result.scenario_id}`,
        'timeline:evt_2291',
        'graph:node_queue_delay',
      ],
      model_version: 'forgeops-sim-v1.0',
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/agent/query') {
    const result = getAgentResponse(await readJson(request));
    sendJson(response, result.status, result.payload);
    return;
  }

  sendJson(response, 404, { error: `No route for ${request.method} ${url.pathname}` });
}

export function createHttpApiServer(): Server {
  return createServer((request, response) => {
    route(request, response).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unexpected server error';
      sendJson(response, 400, { error: message });
    });
  });
}

export function startHttpApi(port = Number(process.env.FORGEOPS_API_PORT ?? 8787), host = '127.0.0.1') {
  const server = createHttpApiServer();
  server.listen(port, host, () => {
    console.log(`ForgeOps integrated API listening on http://${host}:${port}`);
  });
  return server;
}

const entryPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryPath) startHttpApi();
