import 'reflect-metadata';
import { McpApp, Module, McpApplicationFactory } from '@nitrostack/core';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { SignalCollectorController } from './tools/signalCollector.controller.js';
import { CorrelatorController } from './tools/correlator.controller.js';
import { ClassifierController } from './tools/classifier.controller.js';
import { NotifierController } from './tools/notifier.controller.js';
import { QueryController } from './tools/query.controller.js';
import { initDb } from './db.js';

@Module({
  name: 'escalation-triage',
  description: 'Escalation Triage agents: signal collection, correlation/risk, classification/assignment, notification, and status queries',
  controllers: [
    SignalCollectorController,
    CorrelatorController,
    ClassifierController,
    NotifierController,
    QueryController,
  ],
})
class AppModule {}

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

@McpApp({
  module: AppModule,
  server: { name: 'escalation-triage', version: '2.0.0' },
  transport: {
    type: 'http',
    http: {
      port,
      host: '0.0.0.0',
      basePath: '/mcp',
    },
  },
})
class EscalationTriageApp {}

async function main() {
  await initDb();
  const app = await McpApplicationFactory.create(EscalationTriageApp);
  
  await app.start();

  try {
    const httpTransport = (app as any).getHttpTransport?.() || (app as any)._httpTransport;
    if (httpTransport && typeof httpTransport.getApp === 'function') {
      const expressApp = httpTransport.getApp();
      const publicPath = path.join(process.cwd(), 'public');

      if (fs.existsSync(publicPath)) {
        // Intercept GET / at the top of Express stack to override NitroStack default page
        if (expressApp._router && Array.isArray(expressApp._router.stack)) {
          expressApp._router.stack.unshift({
            route: {
              path: '/',
              methods: { get: true },
              stack: [
                {
                  handle: (_req: any, res: any) => {
                    res.sendFile(path.join(publicPath, 'index.html'));
                  }
                }
              ]
            }
          });
        }

        expressApp.use(express.static(publicPath));
        expressApp.use('/ui', express.static(publicPath));
        expressApp.use('/app', express.static(publicPath));

        const renderUi = (_req: any, res: any) => {
          const indexPath = path.join(publicPath, 'index.html');
          if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
          } else {
            res.send('UI building...');
          }
        };

        expressApp.get('/ui', renderUi);
        expressApp.get('/app', renderUi);
      }
    }
  } catch (err) {
    console.error('Static UI route warning:', err);
  }

  console.error(`Escalation Triage server running on http://0.0.0.0:${port}/mcp (UI at /)`);
}

main().catch((err) => {
  console.error('Failed to start Escalation Triage server:', err);
  process.exit(1);
});
