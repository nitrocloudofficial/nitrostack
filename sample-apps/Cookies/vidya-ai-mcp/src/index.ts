/**
 * VidyaAI MCP Server
 * 
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern for clean, NitroStack-style architecture.
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
  try {
    // Create and start the MCP server
    const server = await McpApplicationFactory.create(AppModule);
    await server.start();
  } catch (error) {
    // Use process.stderr for startup errors (does not corrupt MCP protocol)
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`❌ Failed to start server: ${message}\n`);
    process.exit(1);
  }
}

// Start the application
bootstrap();
