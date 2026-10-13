import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';
import { createApiRouter } from './api/routes.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);

  await server.start();

  const httpTransport = server.getHttpTransport();
  if (httpTransport?.getApp) {
    const app = httpTransport.getApp();
    app.use('/api', createApiRouter());
  }

  console.log('[CircuLink] MCP server running on http://localhost:3000');
  console.log('[CircuLink] REST API: http://localhost:3000/api');
  console.log('[CircuLink] 6 agents: Intake, Verification, Sourcing, Matching, Logistics, Prediction');
  console.log('[CircuLink] MCP endpoint: POST /mcp');
  console.log('[CircuLink] Open NitroStudio to test tools interactively');
}

bootstrap().catch((error) => {
  console.error('[CircuLink] Failed to start:', error);
  process.exit(1);
});
