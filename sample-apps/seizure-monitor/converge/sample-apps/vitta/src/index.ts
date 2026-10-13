/**
 * Vitta MCP Lending Server
 *
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 *
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 */

import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';
import { store } from './lib/store.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  // Create and start the MCP server
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();

  // Sanction-letter download route on the built-in HTTP transport
  // (getHttpTransport()/getApp() are public API — core/dist/core/server.d.ts:197,
  //  transports/streamable-http.d.ts:158). Available in http/dual mode only.
  const app = (server as any).getHttpTransport?.()?.getApp?.();
  if (app) {
    app.get('/letters/:leadId', (req: any, res: any) => {
      const leadId = String(req.params.leadId ?? '');
      if (!/^[A-Za-z0-9-]{1,64}$/.test(leadId)) {
        res.status(400).json({ error: 'BAD_LEAD_ID' });
        return;
      }
      // 1) in-memory store (works on read-only cloud filesystems)
      const html = store.getCase(leadId)?.sanction?.letter_fields?.html as string | undefined;
      if (html) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
        return;
      }
      // 2) disk fallback (local dev)
      const file = join(process.cwd(), 'data', 'letters', `${leadId}.html`);
      if (existsSync(file)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(readFileSync(file, 'utf8'));
        return;
      }
      res.status(404).json({ error: 'LETTER_NOT_FOUND', hint: 'Run create_sanction_letter first.' });
    });
    console.error('[vitta] sanction-letter route mounted: GET /letters/:leadId');
  }
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
