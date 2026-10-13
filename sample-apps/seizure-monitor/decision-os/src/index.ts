/**
 * Calculator MCP Server
 * 
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 * 
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 */

import 'dotenv/config';
import { ApiKeyModule, McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

// NitroCloud/OpenAI clients use Streamable HTTP sessions. NitroStack defaults
// production deployments to dual transport, which leaves sessions disabled
// and can keep NitroChat in "Connecting..." even though /mcp is reachable.
// Keep local development unchanged, but make the hosted OpenAI mode explicit.
const isProductionDeployment = process.env.NODE_ENV?.toLowerCase() === 'production';
const isOpenAiDeployment = process.env.NITROSTACK_APP_MODE?.toLowerCase() === 'openai';
if (isProductionDeployment || isOpenAiDeployment) {
  process.env.MCP_TRANSPORT_TYPE = 'http';
  process.env.HOST ||= '0.0.0.0';
}

/**
 * Bootstrap the application
 */
async function bootstrap() {
  ApiKeyModule.forRoot({
    keysEnvPrefix: 'DECISION_OS_API_KEY',
    metadataField: 'apiKey',
    hashed: true,
  });

  // Create and start the MCP server
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
