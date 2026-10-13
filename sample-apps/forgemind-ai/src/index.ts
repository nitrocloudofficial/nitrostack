import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
  console.log('[FORGEMIND AI] 🚀 Server started successfully on port 3000');
}

bootstrap().catch((error) => {
  console.error('[FORGEMIND AI] ❌ Server bootstrap failed:', error);
  process.exit(1);
});