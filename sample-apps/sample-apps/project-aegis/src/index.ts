import 'reflect-metadata';
import { McpApplicationFactory } from '@nitrostack/core';
import { AegisApplication } from './app.module.js';
import * as path from 'path';
import * as fs from 'fs';
import express, { Request, Response } from 'express';

// Ensure cloud container ingress binds to 0.0.0.0 for external health checks
process.env.HOST = process.env.HOST || '0.0.0.0';
process.env.PORT = process.env.PORT || '3000';

function findWidgetHtmlFile(widgetName: string): string | null {
  const cleanName = widgetName.replace(/\.html$/, '');
  const candidatePaths = [
    path.join(process.cwd(), 'src/widgets/out', `${cleanName}.html`),
    path.join(process.cwd(), 'widgets/out', `${cleanName}.html`),
    path.join(process.cwd(), 'dist/widgets/out', `${cleanName}.html`),
    path.join(process.cwd(), 'out', `${cleanName}.html`),
    path.join(process.cwd(), 'src/widgets/out', 'tools.html'),
    path.join(process.cwd(), 'widgets/out', 'tools.html'),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function bootstrap() {
  // Initialize the MCP server with the NitroStack factory
  const server = await McpApplicationFactory.create(AegisApplication);
  
  // Start the server (dual/http mode in production)
  await server.start();

  // Attach static web UI routes directly to NitroStack's primary HTTP server (Port 3000 / NitroCloud ingress)
  const httpTransport = server.getHttpTransport();
  if (httpTransport && typeof httpTransport.getApp === 'function') {
    const expressApp = httpTransport.getApp();
    if (expressApp) {
      // Serve Next.js static assets so Tailwind CSS loads correctly
      const nextStaticPaths = [
        path.join(process.cwd(), 'src/widgets/out/_next'),
        path.join(process.cwd(), 'widgets/out/_next'),
        path.join(process.cwd(), 'dist/widgets/out/_next'),
        path.join(process.cwd(), 'out/_next'),
      ];
      for (const p of nextStaticPaths) {
        if (fs.existsSync(p)) {
          expressApp.use('/_next', (req: Request, res: Response, next: any) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            next();
          }, express.static(p));
          break;
        }
      }

      const handleWidgetRequest = (req: Request, res: Response) => {
        const rawParam = req.params.widgetName || 'tools';
        const name = Array.isArray(rawParam) ? rawParam[0] : rawParam;
        let file = findWidgetHtmlFile(name);
        if (!file) file = findWidgetHtmlFile('tools');
        
        if (file) {
          const fs = require('fs');
          let html = fs.readFileSync(file, 'utf8');
          const actualHost = req.get('host');
          if (actualHost) {
            html = html.replace(/http:\/\/localhost:3000/g, `http://${actualHost}`);
          }
          res.setHeader('Content-Type', 'text/html');
          return res.send(html);
        }
        return res.status(404).send('Bank SRE Control Panel widget build not found');
      };

      expressApp.get('/tools', handleWidgetRequest);
      expressApp.get('/login', handleWidgetRequest);
      expressApp.get('/sre-control-panel', handleWidgetRequest);
      expressApp.get('/aegis-resilience-widget', handleWidgetRequest);
      expressApp.get('/aegis-agent-control-center', handleWidgetRequest);
      expressApp.get('/widgets/:widgetName', handleWidgetRequest);
    }
  }

  console.error('Project Aegis MAS MCP Server running on stdio/http');
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
