/**
 * medagent PACS MCP Server
 *
 * Main entry point. Bridges the LangGraph clinical agent to a hospital
 * PACS archive over MCP; the only tool exposed is query_prior_studies
 * (see modules/pacs/pacs.tools.ts).
 *
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 *
 * NOTE ON STDIO: stdout carries the JSON-RPC frames. Nothing in this
 * server may write to stdout directly -- use ctx.logger (stderr), or the
 * protocol stream is corrupted and the client session dies.
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
