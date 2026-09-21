/**
 * Care Mediator MCP Server
 *
 * Exposes five agent modules as MCP tools:
 *   - Hospital  : CGHS rate lookups, procedure listing
 *   - Insurer   : claim status, network-hospital check, decision submission
 *   - Lender    : loan offers with true effective-annual-rate comparison
 *   - Objectivity: cross-checks hospital billing vs CGHS benchmark + insurer claim
 *   - Orchestrator: single reconcile_case / reconcile_case_by_id entry point
 *
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  // Create and start the MCP server
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
