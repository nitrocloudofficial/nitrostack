/**
 * BouldersGate — compute as a negotiated capability.
 *
 * Transport configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): dual transport (STDIO + HTTP SSE)
 */

import 'dotenv/config';
import {
  DIContainer,
  McpApplicationFactory,
  OAuthModule,
} from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  // Create and start the MCP server
  const server = await McpApplicationFactory.create(AppModule);

  // @nitrostack/core@1.0.14 auto-registers OAuthModule even when OAuth is not
  // configured. Eager provider initialization then logs the entire class source,
  // including a literal NITROSTACK_OAUTH marker that NitroStudio mistakes for
  // discovery JSON. Suppress only that unconfigured provider; a future real
  // OAuthModule.forRoot() configuration remains untouched.
  if (!OAuthModule.getConfig()) {
    DIContainer.getInstance().registerValue(
      OAuthModule,
      Object.create(null) as OAuthModule,
    );
  }

  await server.start();
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
