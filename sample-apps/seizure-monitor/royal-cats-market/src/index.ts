/**
 * Calculator MCP Server
 * 
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 * 
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';
import { globalOauthService } from './modules/oauth/oauth.service.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  // Create and start the MCP server
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();

  const httpTransport = server.getHttpTransport();
  if (httpTransport && httpTransport.getApp) {
    const app = httpTransport.getApp();

    // Add health check endpoints for Cloud Load Balancers
    app.get('/', (req: any, res: any) => {
      res.status(200).send('NitroStack MCP Server is running');
    });
    
    app.get('/health', (req: any, res: any) => {
      res.status(200).send({ status: 'ok', uptime: process.uptime() });
    });
    app.get('/auth/callback', async (req: any, res: any) => {
      const code = req.query.code as string;
      if (!code) {
        res.status(400).send('No code provided');
        return;
      }
      const renderPage = (title: string, message: string) => `
        <html>
          <head>
            <style>
              body {
                background-color: #C4BDB7;
                color: #89715B;
                font-family: 'Inter', sans-serif;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
              }
              h1 {
                font-size: 3rem;
                margin-bottom: 1rem;
              }
              p {
                font-size: 1.2rem;
              }
            </style>
          </head>
          <body>
            <h1>Royal Cats</h1>
            <p>${message}</p>
          </body>
        </html>
      `;

      try {
        if (globalOauthService) {
          await globalOauthService.handleCallback(code);
          res.send(renderPage('Success', 'Successfully authenticated with Google Drive! You can close this window.'));
        } else {
          res.status(500).send(renderPage('Error', 'OAuth service not initialized'));
        }
      } catch (error: any) {
        res.status(500).send(renderPage('Error', 'Authentication failed: ' + error.message));
      }
    });
  }
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
