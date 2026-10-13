/**
 * Decision Twin MCP Server
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 */

import 'dotenv/config';

// Force pure HTTP transport mode and 0.0.0.0 host binding for NitroCloud container ingress health checks
process.env.MCP_TRANSPORT_TYPE = 'http';
process.env.HOST = '0.0.0.0';
process.env.MCP_SERVER_HOST = '0.0.0.0';

import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

export * from './reflection_memory/index.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
