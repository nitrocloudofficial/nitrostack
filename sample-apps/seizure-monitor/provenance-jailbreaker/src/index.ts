import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch(() => {
  // Do NOT use console.error here — it corrupts the MCP JSON-RPC stream.
  // The framework logger will handle errors internally.
  process.exit(1);
});
