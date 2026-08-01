import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  console.log('[CircuLink] 6 agents loaded — MCP server starting');
  console.log('[CircuLink] Intake | Verification | Sourcing | Matching | Logistics | Prediction');
  await server.start();
}

bootstrap().catch((error) => {
  console.error('[CircuLink] Failed to start:', error);
  process.exit(1);
});
