import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * index.ts — NEW FILE. Mirrors the real CLI-generated bootstrap exactly
 * (verified via `npx @nitrostack/cli init`, not assumed from docs):
 * `create()` and `start()` are two separate calls, not one — this
 * contradicts the SDK reference's single-call example.
 *
 * NOTE: the real CLI scaffold imports 'dotenv/config' here too, but
 * `dotenv` isn't in this repo's pinned package.json and I was told not to
 * touch that file — omitted rather than silently adding a dependency.
 * Add it back (`npm install dotenv`) if/when a real .env workflow is needed.
 */
async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
