/**
 * HealthBridge MCP Server — Entry Point
 * ======================================
 * Bootstraps the NitroStack application for NitroCloud deployment.
 *
 * Transport: HTTP (Streamable HTTP + SSE) for NitroCloud production.
 * Local dev:  npm run dev  →  http://localhost:3000
 *             NODE_ENV=development uses STDIO by default.
 */

import 'reflect-metadata';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);

  // NitroStack auto-detects transport:
  //   NODE_ENV=development → STDIO
  //   NODE_ENV=production  → dual (STDIO + HTTP on PORT)
  // Override via MCP_TRANSPORT_TYPE env var.
  await server.start();
}

bootstrap().catch((err) => {
  process.stderr.write(`HealthBridge failed to start: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
