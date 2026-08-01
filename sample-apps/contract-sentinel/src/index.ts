/**
 * Contract Sentinel MCP Server
 * 
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 * 
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 */

import 'dotenv/config';
import { DIContainer, McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';
import express from 'express';
import cors from 'cors';
import { PortfolioViewService } from './modules/sentinel/portfolio-view.service.js';
import { NOT_LEGAL_ADVICE } from './modules/intake/contract.types.js';

const allowedOrigins = new Set([
  'https://contract-sentinel-ten.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

const corsOptions = {
  origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

function createEmptyPortfolio(filter: string) {
  return {
    generatedAt: new Date().toISOString(),
    profileSummary:
      'No company profile set — defaults to medium risk tolerance. Call set-company-profile for tailored scoring.',
    dangerThreshold: 55,
    filter,
    summary: {
      total: 0,
      safe: 0,
      danger: 0,
      needsAttention: 0,
      averageScore: 0,
    },
    columns: {
      safe: [],
      danger: [],
    },
    disclaimer: NOT_LEGAL_ADVICE,
  };
}

function registerContractsRoute(app: express.Express) {
  app.use(cors(corsOptions));

  app.get('/api/contracts', (req, res) => {
    const requestedFilter = typeof req.query.filter === 'string' ? req.query.filter : 'all';
    const filter =
      requestedFilter === 'safe' || requestedFilter === 'danger' || requestedFilter === 'needs_attention'
        ? requestedFilter
        : 'all';

    try {
      const portfolioView = DIContainer.getInstance().resolve(PortfolioViewService);
      const board = portfolioView.buildBoard(filter);

      res.setHeader('Cache-Control', 'no-store');
      res.json(board);
      return;
    } catch (error) {
      console.error('Failed to build contract portfolio payload:', error);
      res.setHeader('Cache-Control', 'no-store');
      res.json(createEmptyPortfolio(filter));
    }
  });
}

/**
 * Bootstrap the application
 */
async function bootstrap() {
  // Create and start the MCP server
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();

  const httpTransport = server.getHttpTransport();
  const transportApp = httpTransport?.getApp?.();
  if (transportApp) {
    registerContractsRoute(transportApp);
    console.log('HTTP REST /api/contracts route attached to NitroStack transport');
    return;
  }

  // Local-only fallback when NitroStack is running in STDIO mode.
  const app = express();
  registerContractsRoute(app);

  const REST_PORT = Number(process.env.REST_PORT || 3001);
  const REST_HOST = process.env.REST_HOST || '127.0.0.1';
  app.listen(REST_PORT, REST_HOST, () => {
    console.log(`HTTP REST API bridge listening on http://${REST_HOST}:${REST_PORT}`);
  });
}

// Start the application
try {
  await bootstrap();
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}