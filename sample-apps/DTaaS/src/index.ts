import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  // Create and start the MCP server
  const server = await McpApplicationFactory.create(AppModule);

  // Expose a root-level health check endpoint to support standard cloud health checks
  const httpTransport = server.getHttpTransport();
  if (httpTransport && typeof httpTransport.getApp === 'function') {
    const app = httpTransport.getApp();
    if (app) {
      app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
      });
    }
  }

  await server.start();
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

