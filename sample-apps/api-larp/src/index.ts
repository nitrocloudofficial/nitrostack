import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

process.on('unhandledRejection', (reason, promise) => {
  process.stderr.write(`[api-larp] fatal unhandled rejection at: ${promise} reason: ${reason}\n`);
  // Do NOT exit here so the MCP server stays alive
});

process.on('uncaughtException', (err) => {
  process.stderr.write(`[api-larp] fatal uncaught exception: ${err.message}\n`);
  // Do NOT exit here so the MCP server stays alive
});

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`[api-larp] fatal bootstrap error: ${message}\n`);
  process.exitCode = 1;
});
