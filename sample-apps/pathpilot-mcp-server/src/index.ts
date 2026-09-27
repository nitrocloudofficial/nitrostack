/**
 * PathPilot — GitHub + LinkedIn Skill Evidence MCP Server
 *
 * Evidence fusion backbone for adaptive career roadmaps:
 * - Retrieves repository evidence via GitHub adapter (public REST API)
 * - Retrieves LinkedIn profile signals (user-authorized, mock/demo in MVP)
 * - Runs rule-based detection for full-stack-developer pathway
 * - Publishes Verified / Partial / Self-reported / Missing skill evidence
 * - Produces roadmap signal for the AI/roadmap service
 *
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';


async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((error) => {
  console.error('❌ PathPilot MCP server failed to start:', error);
  process.exit(1);
});
