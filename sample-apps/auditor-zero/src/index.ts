/**
 * Auditor Zero MCP Server
 *
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 *
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 */

// Make the server completely launcher-independent: resolve the PROJECT ROOT
// from this file's location, pin the working directory there, and load .env
// from it. Launchers (NitroStudio, cloud runners) may spawn us with any cwd —
// widget HTML resolution, the .env file, and the .data snapshot all depend on
// a correct cwd, so we normalize it before anything else runs.
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)); // src/ (tsx) or dist/ (built)
const PROJECT_ROOT = path.resolve(HERE, '..');
try {
  process.chdir(PROJECT_ROOT);
} catch {
  // Read-only or restricted environments: continue with the launcher's cwd.
}
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });
dotenv.config(); // cwd fallback, no-op if already loaded

// @nitrostack/core binds to `process.env.HOST || 'localhost'`, which listens on
// the loopback only — inside a container the platform's health probe can never
// reach it and the deploy fails with a gateway timeout. Bind all interfaces
// unless the host explicitly asks for something narrower.
process.env.HOST ??= '0.0.0.0';

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
