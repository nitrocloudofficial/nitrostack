/**
 * Quant Execution MCP Server
 *
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern.
 *
 * Transport Configuration (resolved inside @nitrostack/core):
 * - MCP_TRANSPORT_TYPE takes precedence when set (stdio | http | dual)
 * - NODE_ENV unset/development/dev -> stdio
 * - NODE_ENV=production           -> dual (STDIO + HTTP on PORT/HOST)
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((error) => {
  // stderr is NOT the JSON-RPC channel (stdout is), so writing here is safe
  // and is required for a hosted platform to surface why boot failed.
  process.stderr.write(
    `[quant-execution-server] fatal: failed to start server\n${
      error instanceof Error ? (error.stack ?? error.message) : String(error)
    }\n`,
  );
  process.exit(1);
});
