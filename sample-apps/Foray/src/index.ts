/**
 * FORAY — a school of agents.
 *
 * Entry point for the permission-scoped MCP surface: three servers
 * (Course Content, Student Model, Cohort Analytics) behind the Warden.
 *
 * The Warden is a NitroStack Guard, so it runs BEFORE any tool handler —
 * a model cannot reach a handler the framework never dispatched to.
 * See src/foray/warden.guard.ts. That boundary is demo beat 6.
 *
 * This process holds NO business logic. Tools are thin fetch calls onto
 * the Python backend ($FORAY_API_URL, default http://127.0.0.1:8000).
 *
 * Transport:
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
