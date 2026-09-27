/**
 * ForgeOps MCP Server
 *
 * AI Decision Workbench backend for Smart Manufacturing.
 * Built with NitroStack TypeScript SDK.
 *
 * Transport:
 * - Development: STDIO (for MCP clients like Claude Desktop)
 * - Production: Dual transport (STDIO + HTTP SSE)
 */

import 'dotenv/config';
import { McpApplicationFactory } from './nitrostack.js';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((error) => {
  console.error('❌ ForgeOps MCP Server failed to start:', error);
  process.exit(1);
});
