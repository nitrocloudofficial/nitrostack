/**
 * ArogyaAI OS — MCP Server Entry Point
 *
 * Bootstraps the NitroStack application that exposes the full hospital
 * intelligence platform over the Model Context Protocol (MCP).
 *
 * Transport:
 * - Development (NODE_ENV=development): STDIO
 * - Production (NODE_ENV=production):  STDIO + HTTP SSE
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
