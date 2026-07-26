/**
 * HUNT3R-T MCP Server
 *
 * Main entry point. Uses the @McpApp decorator pattern (NitroStack).
 */
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';
import { ensureMockDataLoaded } from './resources/index.js';

async function bootstrap() {
  await ensureMockDataLoaded();
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((error) => {
  console.error('Failed to start HUNT3R-T server:', error);
  process.exit(1);
});
