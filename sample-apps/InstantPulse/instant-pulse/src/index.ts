/**
 * InstantPulse MCP Server
 *
 * Business onboarding and credit pre-screening in seconds rather than days.
 *
 * Transport:
 * - Development (NODE_ENV=development): STDIO — the NitroStudio / Claude Desktop path
 * - Production (NODE_ENV=production): dual STDIO + HTTP SSE
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start InstantPulse:', error);
  process.exit(1);
});
