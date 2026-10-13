/**
 * Agentic Commerce Gateway — MCP Server
 *
 * Stripe Radar for AI shopping agents: screens the buying agent before a sale
 * settles, and verifies every sales receipt against the on-chain record.
 *
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 * 
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';
import { CONSOLE_PATH, registerConsoleRoute } from './console/console.route.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  // Create and start the MCP server
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();

  // Serve the seller console alongside the MCP endpoint (HTTP transports only).
  if (registerConsoleRoute(server)) {
    console.error(`🖥️  Seller console available at ${CONSOLE_PATH}`);
  }
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
