/**
 * Family MedCare Ecosystem — MCP Server
 *
 * Main entry point for the multi-agent health memory MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 *
 * Agents:
 * - Agent 1 (Health Memory): Patient profiles, lab report extraction
 * - Agent 2 (Medication Safety): Drug safety checks, FDA label lookup, authenticity verification
 * - Agent 3 (Emergency Hub): Emergency card generation, caregiver weekly briefing
 *
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 */

import 'dotenv/config';
import { McpApplicationFactory, DIContainer } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  DIContainer.getInstance().registerValue('OAUTH_CONFIG', null);

  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start Family MedCare Ecosystem server:', error);
  process.exit(1);
});
