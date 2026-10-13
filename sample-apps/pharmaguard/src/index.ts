#!/usr/bin/env node
import { McpApp, McpApplicationFactory, Module } from '@nitrostack/core';
import { FdaTools } from './tools/fda.tools.js';
import { FdaPrompts } from './prompts/fda.prompts.js';
import { HealthResource } from './resources/health.resource.js';

// Redirect all logs to stderr to prevent breaking the STDIO transport
console.log = console.error;
console.info = console.error;
console.warn = console.error;
console.debug = console.error;

@Module({
  name: 'fda',
  description: 'FDA drug safety intelligence module',
  controllers: [FdaTools, FdaPrompts, HealthResource],
})
export class FdaModule {}

@McpApp({
  module: FdaModule,
  server: {
    name: 'pharmaguard-mcp',
    version: '1.0.0',
  },
})
export class PharmaGuardApp {}

// Bootstrap the application — starts the STDIO transport and listens for JSON-RPC
// create() builds and wires all tools/resources but does NOT start the transport.
// We must await the NitroStackServer instance and then call start() so the process
// stays alive and the STDIO transport can respond to the MCP initialize handshake.
async function bootstrap() {
  const app = await McpApplicationFactory.create(PharmaGuardApp);
  await app.start();
}

bootstrap().catch((err) => {
  console.error('Fatal: Failed to start PharmaGuard MCP server', err);
  process.exit(1);
});
