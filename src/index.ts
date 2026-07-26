/**
 * Aegis Protocol — Zero-Knowledge Threat Fusion Engine
 * 
 * Main entry point for the MCP server.
 * Implements a 2-Agent "Maker-Checker" architecture for detecting
 * "Digital Arrest" scams in real-time with HITL guard enforcement.
 * 
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the Aegis Protocol server
 */
async function bootstrap() {
  // Ensure cloud container runtimes use HTTP transport (avoiding STDIO process.stdin EOF exits)
  if (!process.env.MCP_TRANSPORT_TYPE) {
    process.env.MCP_TRANSPORT_TYPE = 'http';
  }

  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start Aegis Protocol server:', error);
  process.exit(1);
});
