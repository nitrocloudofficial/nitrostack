/**
 * RetailMind — Local development bridge (DEV ONLY)
 *
 * The widget frontend runs as a plain Next.js app on localhost:3001, where
 * there is no MCP host — `WidgetSDK.callTool()` needs `window.openai` or
 * `__MCP_APP_CONTEXT__`, neither of which exists in a normal browser tab. And
 * a Next API route can't be used either: the widget build sets
 * `output: 'export'`, which rejects route handlers.
 *
 * So this exposes a single plain-HTTP endpoint that runs the exact same
 * PlannerTools.analyze() the MCP tool runs — no duplicated orchestration and
 * no separate code path that could drift from what NitroStudio executes.
 *
 * This is a development convenience for verifying the UI on localhost. It is
 * NOT part of the MCP server, is not started by `npm run dev`/`start`, and
 * nothing in the MCP architecture depends on it.
 *
 *   npm run dev:api      →  http://localhost:3002/analyze
 */

import 'dotenv/config';
import { createServer } from 'node:http';
import type { ExecutionContext } from '@nitrostack/core';
import { MapsService } from './tools/maps/maps.service.js';
import { PlacesService } from './tools/places/places.service.js';
import { DemographicsService } from './tools/demographics/demographics.service.js';
import { TrafficService } from './tools/traffic/traffic.service.js';
import { OpportunityEngineService } from './opportunity/opportunity-engine.service.js';
import { PlannerTools } from './planner/planner.tools.js';

const PORT = Number(process.env.DEV_API_PORT ?? 3002);
const WIDGET_ORIGIN = process.env.DEV_WIDGET_ORIGIN ?? 'http://localhost:3001';

// Same wiring the DI container performs, done by hand because there is no
// MCP application bootstrapped here.
const planner = new PlannerTools(
  new MapsService(),
  new PlacesService(),
  new DemographicsService(),
  new TrafficService(),
  new OpportunityEngineService()
);

// PlannerTools only uses ctx.logger, so console satisfies the contract. The
// cast is confined to this dev-only file and never affects the MCP path.
const devContext = { logger: console } as unknown as ExecutionContext;

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Guard against an unbounded upload on an open local port.
      if (body.length > 1e6) reject(new Error('Request body too large.'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', WIDGET_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  if (req.method !== 'POST' || !req.url?.startsWith('/analyze')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. Use POST /analyze.' }));
    return;
  }

  try {
    const { businessType, city, budget, radius } = JSON.parse(await readBody(req));

    if (typeof businessType !== 'string' || typeof city !== 'string') {
      throw new Error('businessType and city are required.');
    }

    const started = Date.now();
    const result = await planner.analyze(
      { businessType, city, budget: Number(budget), radius: Number(radius) },
      devContext
    );
    console.error(`[dev-api] ${city} / ${businessType} → ${Date.now() - started}ms`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (err) {
    // Surfaced verbatim to the browser so a provider failure is visible during
    // development instead of being masked by placeholder data.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[dev-api] FAILED: ${message}`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
  }
});

server.listen(PORT, () => {
  console.error(`[dev-api] RetailMind dev bridge on http://localhost:${PORT}/analyze`);
  console.error(`[dev-api] allowing origin ${WIDGET_ORIGIN}`);
});
