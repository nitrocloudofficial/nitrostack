import { McpApplicationFactory } from '@nitrostack/core';
import { App } from './app.module.js';

// Required for Docker/Cloud environments to bind to all interfaces
process.env.HOST = process.env.HOST || '0.0.0.0';
process.env.PORT = process.env.PORT || '3000';

async function bootstrap() {
  const server = await McpApplicationFactory.create(App);
  await server.start(); // <-- Added this to start the STDIO/HTTP transport listener
}

bootstrap().catch(console.error);
