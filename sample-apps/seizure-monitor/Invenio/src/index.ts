import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  const internalServer = (server as any);
  if (internalServer.resources) {
    internalServer.resources.delete('health://checks');
    internalServer.resources.delete('widget://examples');
  }
  await server.start();
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
