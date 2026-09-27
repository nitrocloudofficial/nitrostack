/**
 * MedLens MCP server.
 *
 * Placeholder tools (search_flights, get_flight_details, search_airports)
 * from the starter template have been removed — this module registers only
 * the 8 real MedLens tools below.
 *
 * EMA (European Medicines Agency) integration is a documented stretch goal
 * beyond the 20-hour MVP scope and is NOT implemented in this build.
 *
 * Data sources used, live only, no mocked data:
 *   - https://api.fda.gov/drug/label.json
 *   - https://api.fda.gov/drug/event.json
 *   - https://rxnav.nlm.nih.gov/REST/*
 */

import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection', reason);
});

import {
  get_drug_regulatory_status,
  get_drug_safety_profile,
  search_medicine_by_condition,
} from './tools/fdaTools.js';
import { check_medicine_combination } from './tools/checkMedicineCombination.js';
import { find_generic_equivalent, get_drug_cost_estimate } from './tools/rxnormTools.js';
import { manage_medicine_schedule, get_due_reminders } from './tools/scheduleTools.js';

const server = new Server(
  { name: 'medlens', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

// Tool schemas are written to stand alone for ANY MCP client (ChatGPT, etc.),
// not just NitroStack's internal agent — no orchestration rules baked in here.
const TOOLS = [
  {
    name: 'get_drug_regulatory_status',
    description:
      'Look up FDA regulatory/label metadata for a drug by name (brand or generic): manufacturer, route, pharmacologic class, whether it carries a boxed warning, and a short indication summary. Use when the user asks what a drug is, who makes it, or whether it has a boxed warning.',
    inputSchema: {
      type: 'object',
      properties: { drugName: { type: 'string', description: 'Brand or generic drug name' } },
      required: ['drugName'],
    },
  },
  {
    name: 'get_drug_safety_profile',
    description:
      'Get FDA label warnings/contraindications plus real reported adverse-event signals (top reaction terms and seriousness flags) for a drug. Use when the user asks if a drug is safe, what its side effects are, or about reported adverse events.',
    inputSchema: {
      type: 'object',
      properties: { drugName: { type: 'string', description: 'Brand or generic drug name' } },
      required: ['drugName'],
    },
  },
  {
    name: 'check_medicine_combination',
    description:
      'Check whether two named drugs have a documented interaction, based on a cross-reference of each drug\'s label warnings mentioning the other. Always call this when a user mentions two or more medicines together, before giving a final answer. Not an exhaustive interaction database.',
    inputSchema: {
      type: 'object',
      properties: {
        drugA: { type: 'string', description: 'First drug name' },
        drugB: { type: 'string', description: 'Second drug name' },
      },
      required: ['drugA', 'drugB'],
    },
  },
  {
    name: 'find_generic_equivalent',
    description:
      'Resolve a drug name via RxNorm to find its generic ingredient-level name and related generic/branded options. Explains whether the queried name is itself branded or generic. Use when a user asks for a generic equivalent or an alternative name for a drug.',
    inputSchema: {
      type: 'object',
      properties: { drugName: { type: 'string', description: 'Brand or generic drug name' } },
      required: ['drugName'],
    },
  },
  {
    name: 'get_drug_cost_estimate',
    description:
      'Return a coarse cost-tier signal (brand-tier vs generic-tier) for a drug — NOT a real dollar price, since no free real-time pricing API is used. Use when a user asks about cost or for something cheaper; pair with find_generic_equivalent.',
    inputSchema: {
      type: 'object',
      properties: { drugName: { type: 'string', description: 'Brand or generic drug name' } },
      required: ['drugName'],
    },
  },
  {
    name: 'search_medicine_by_condition',
    description:
      'Search FDA label data for medicines indicated for a described medical condition (e.g. "high blood pressure"). Returns up to 5 candidate drugs with brand/generic name and pharmacologic class. Use when the user describes a condition rather than naming a drug.',
    inputSchema: {
      type: 'object',
      properties: { condition: { type: 'string', description: 'Medical condition, in plain language' } },
      required: ['condition'],
    },
  },
  {
    name: 'manage_medicine_schedule',
    description:
      'Add a medicine to a user\'s in-memory daily schedule at a given time of day (HH:MM). Returns the user\'s full updated schedule. Data resets on server restart (demo-scope only, not persistent storage).',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        name: { type: 'string', description: 'Medicine name' },
        timeOfDay: { type: 'string', description: 'Time in HH:MM 24h format' },
      },
      required: ['userId', 'name', 'timeOfDay'],
    },
  },
  {
    name: 'get_due_reminders',
    description:
      'Get all of a user\'s scheduled medicines that are not yet taken and are due at or before the given current time (HH:MM). Call automatically right after manage_medicine_schedule so the user sees the updated due list without asking again.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        currentTime: { type: 'string', description: 'Current time in HH:MM 24h format' },
      },
      required: ['userId', 'currentTime'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params as { name: string; arguments: any };

  try {
    let result: unknown;

    switch (name) {
      case 'get_drug_regulatory_status':
        result = await get_drug_regulatory_status(args.drugName);
        break;
      case 'get_drug_safety_profile':
        result = await get_drug_safety_profile(args.drugName);
        break;
      case 'check_medicine_combination':
        result = await check_medicine_combination(args.drugA, args.drugB);
        break;
      case 'find_generic_equivalent':
        result = await find_generic_equivalent(args.drugName);
        break;
      case 'get_drug_cost_estimate':
        result = await get_drug_cost_estimate(args.drugName);
        break;
      case 'search_medicine_by_condition':
        result = await search_medicine_by_condition(args.condition);
        break;
      case 'manage_medicine_schedule':
        result = manage_medicine_schedule(args.userId, args.name, args.timeOfDay);
        break;
      case 'get_due_reminders':
        result = get_due_reminders(args.userId, args.currentTime);
        break;
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } catch (err: any) {
    // Belt-and-suspenders: individual tools already catch their own fetch
    // errors and return {found:false}, but nothing here should ever throw
    // an unhandled error back to the MCP client.
    return {
      content: [
        { type: 'text', text: JSON.stringify({ found: false, error: err?.message ?? 'Unknown error' }) },
      ],
      isError: true,
    };
  }
});

async function main() {
  const port = Number(process.env.PORT || 3000);
  console.error(`Starting MedLens MCP server on port ${port}`);
  const app = createMcpExpressApp({ host: '0.0.0.0' });
  const transport = new StreamableHTTPServerTransport();

  app.use(express.json());

  app.get('/', (_req, res) => {
    console.error('Health probe: GET /');
    res.status(200).type('text/plain').send('ok');
  });

  app.get('/health', (_req, res) => {
    console.error('Health probe: GET /health');
    res.status(200).type('text/plain').send('ok');
  });

  app.post('/mcp', async (req, res) => {
    await transport.handleRequest(req, res, req.body);
  });

  app.get('/mcp', async (req, res) => {
    const acceptHeader = String(req.headers.accept || '');
    if (!acceptHeader.includes('text/event-stream')) {
      return res.status(200).json({ status: 'ok', mcp: true });
    }

    await transport.handleRequest(req, res);
  });

  await server.connect(transport);

  app.listen(port, '0.0.0.0', () => {
    console.error(`MedLens MCP server running on http://0.0.0.0:${port}/mcp`);
  });
}

main().catch((err) => {
  console.error('Fatal error starting MedLens MCP server:', err);
  process.exit(1);
});
