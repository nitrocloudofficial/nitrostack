import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';
import { setup } from './modules/memory/memory.service.js';

async function bootstrap() {
  await setup();
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap();
