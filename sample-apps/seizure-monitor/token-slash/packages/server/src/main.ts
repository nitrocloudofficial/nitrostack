import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Force 0.0.0.0 host binding for Docker container cloud ingress to prevent 502 Bad Gateway
process.env.HOST = '0.0.0.0';
process.env.NITRO_HOST = '0.0.0.0';
if (!process.env.PORT) {
  process.env.PORT = '3000';
}

async function bootstrap(): Promise<void> {
  const server = await McpApplicationFactory.create(AppModule);

  // Attach custom Web Client UI & root health probe handlers to Express app
  const httpTransport = (server as any).getHttpTransport?.() ?? (server as any).httpTransport;
  if (httpTransport && typeof httpTransport.getApp === 'function') {
    const app = httpTransport.getApp();
    if (app) {
      const possiblePublicDirs = [
        path.resolve(process.cwd(), 'packages/server/dist/public'),
        path.resolve(process.cwd(), 'packages/web/dist'),
        path.resolve(__dirname, './public'),
        path.resolve(__dirname, '../public'),
        path.resolve(process.cwd(), 'dist/public'),
      ];

      let publicDir: string | null = null;
      for (const dir of possiblePublicDirs) {
        if (fs.existsSync(dir)) {
          publicDir = dir;
          break;
        }
      }

      if (publicDir) {
        app.use(express.static(publicDir));
        app.get('/', (_req: any, res: any) => {
          res.sendFile(path.join(publicDir!, 'index.html'));
        });
      } else {
        app.get('/', (_req: any, res: any) => {
          res.json({ status: 'ok', server: 'tokenslash-server', health: 'healthy' });
        });
      }

      app.get('/health', (_req: any, res: any) => {
        res.json({ status: 'ok', server: 'tokenslash-server', health: 'healthy' });
      });
      app.get('/api/health', (_req: any, res: any) => {
        res.json({ status: 'ok', server: 'tokenslash-server', health: 'healthy' });
      });
    }
  }

  await server.start();
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Failed to start TokenSlash MCP server:', message);
  process.exit(1);
});
