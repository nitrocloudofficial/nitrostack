/**
 * IT Access Resolver MCP Server
 * 
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 * 
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production Interactive (NODE_ENV=production with TTY): Dual transport (STDIO + HTTP SSE)
 * - Production Container / Headless (no TTY): HTTP only (prevents STDIO EOF restart loops)
 */

import './stdout-fix.js';
import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  // In headless cloud container environments (like Docker or NitroStack Cloud), process.stdin is closed (not a TTY).
  // In Dual mode, receiving EOF on stdin triggers a graceful STDIO server shutdown.
  // Switching automatically to 'http' prevents continuous container restart loops.
  if (process.env.NODE_ENV === 'production' && !process.env.MCP_TRANSPORT_TYPE && !process.stdin.isTTY) {
    process.env.MCP_TRANSPORT_TYPE = 'http';
    console.error('[NitroStack] Headless environment detected: switching default transport to HTTP.');
  }

  // Create and start the MCP server
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
