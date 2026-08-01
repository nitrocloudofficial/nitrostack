/**
 * TrustLayer AI — MCP Server Entry Point
 * 
 * Bootstraps the NitroStack application using McpApplicationFactory.
 * This file is the required entry point that NitroStack's CLI compiles to dist/index.js.
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { TrustLayerModule } from './trust-layer.module.js';
import { setupFrontendIntegration } from './api-router.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(TrustLayerModule);
  // Must start server first so HttpTransport and Express instance are initialized
  await server.start();
  setupFrontendIntegration(server);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start TrustLayer AI server:', error);
  process.exit(1);
});
