/**
 * Vouch MCP Server
 * 
 * Main entry point for the Vouch trust-and-reputation platform MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 * 
 * Modules: auth, reviews, trustengine, reputation, community, business, ai
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
