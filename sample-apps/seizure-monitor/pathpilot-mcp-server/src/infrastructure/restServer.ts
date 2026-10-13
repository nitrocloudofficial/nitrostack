import express, { Express, Request, Response, NextFunction } from 'express';
import { analysisService } from '../application/pathpilotService.js';
import { UnifiedAnalysisResult } from '../domain/models.js';

function jsonBodyLimit(): express.RequestHandler {
  return express.json({ limit: '1mb' });
}

function setCors(req: Request, res: Response, next: NextFunction) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}

function asStatus(status: 'success' | 'partial' | 'error'): number {
  if (status === 'success' || status === 'partial') return 200;
  return 400;
}

export interface PathPilotRestServerOptions {
  port?: number;
  host?: string;
}

export class PathPilotRestServer {
  readonly app: Express;
  private server: any = null;
  private readonly port: number;
  private readonly host: string;

  constructor(options: PathPilotRestServerOptions = {}) {
    this.port = options.port ?? (Number(process.env.REST_PORT) || Number(process.env.PORT) || 3002);
    this.host = options.host ?? (process.env.REST_HOST || '127.0.0.1');
    this.app = express();
    this.app.disable('x-powered-by');
    this.app.use(setCors);
    this.app.use(jsonBodyLimit());
    this.registerRoutes();
  }

  private registerRoutes() {
    const app = this.app;

    app.get('/', (_req, res) => {
      res.json({
        name: 'PathPilot Evidence REST API',
        version: '1.1.0',
        status: 'online',
        endpoints: [
          'POST   /api/evidence/analyze',
          'GET    /api/analyses/:id',
          'GET    /api/dashboard/:id',
          'POST   /api/roadmap/signal',
          'GET    /api/health',
          'GET    /api/openapi',
        ],
      });
    });

    app.get('/api/health', (_req, res) => {
      res.json({
        status: 'ok',
        service: 'pathpilot-evidence-server',
        version: '1.1.0',
        timestamp: new Date().toISOString(),
        checks: {
          analysisService: 'ready',
          adapter: { github: 'configured', linkedin: 'demo-by-default' },
        },
      });
    });

    app.get('/api/openapi', (_req, res) => {
      res.json({
        openapi: '3.1.0',
        info: { title: 'PathPilot Evidence REST API', version: '1.1.0' },
        paths: {
          '/api/evidence/analyze': { post: { operationId: 'analyzeEvidence', tags: ['Evidence'] } },
          '/api/analyses/{id}': { get: { operationId: 'getAnalysisById', tags: ['Evidence'] } },
          '/api/dashboard/{id}': { get: { operationId: 'getDashboardById', tags: ['Evidence'] } },
          '/api/roadmap/signal': { post: { operationId: 'roadmapSignal', tags: ['Roadmap'] } },
          '/api/health': { get: { operationId: 'health', tags: ['System'] } },
        },
      });
    });

    app.post('/api/evidence/analyze', async (req: Request, res: Response) => {
      try {
        const body = req.body || {};
        const result = await analysisService.analyze(body, {
          info: (m, meta) => {
            if (process.env.NODE_ENV !== 'test') {
              // optional console log; MCP logger handled separately
            }
          },
        });
        res.status(asStatus(result.status)).json(result);
      } catch (err: any) {
        const message = err instanceof Error ? err.message : String(err);
        res.status(500).json({
          requestId: `req_${Date.now()}`,
          status: 'error',
          warnings: [],
          error: { code: 'PROVIDER_UNAVAILABLE', message: `Unexpected REST error: ${message}`, retryable: true },
        });
      }
    });

    app.get('/api/analyses/:id', (req: Request, res: Response) => {
      try {
        const id = String(req.params.id || '');
        const analysis = analysisService.getAnalysisById(id) as UnifiedAnalysisResult | undefined;
        if (!analysis) {
          res.status(404).json({
            requestId: `req_${Date.now()}`,
            status: 'error',
            warnings: [],
            error: {
              code: 'ANALYSIS_LIMIT_EXCEEDED',
              message: 'Analysis not found in cache (TTL 10 minutes). Run POST /api/evidence/analyze first.',
              retryable: true,
            },
          });
          return;
        }
        res.json({
          requestId: `req_${Date.now()}`,
          status: 'success',
          data: analysis,
          warnings: [],
        });
      } catch (err: any) {
        res.status(500).json({
          requestId: `req_${Date.now()}`,
          status: 'error',
          warnings: [],
          error: { code: 'PROVIDER_UNAVAILABLE', message: err?.message || String(err), retryable: true },
        });
      }
    });

    app.get('/api/dashboard/:id', (req: Request, res: Response) => {
      try {
        const signal = analysisService.getRoadmapSignal({ analysisId: String(req.params.id || '') });
        res.status(asStatus(signal.status)).json({
          requestId: signal.requestId,
          status: signal.status,
          data: signal.data?.dashboard,
          warnings: signal.warnings,
          error: signal.error,
        });
      } catch (err: any) {
        res.status(500).json({
          requestId: `req_${Date.now()}`,
          status: 'error',
          warnings: [],
          error: { code: 'PROVIDER_UNAVAILABLE', message: err?.message || String(err), retryable: true },
        });
      }
    });

    app.post('/api/roadmap/signal', (req: Request, res: Response) => {
      try {
        const body = req.body || {};
        const signal = analysisService.getRoadmapSignal({
          analysisId: body.analysisId,
          analysis: body.analysis,
        });
        res.status(asStatus(signal.status)).json(signal);
      } catch (err: any) {
        res.status(500).json({
          requestId: `req_${Date.now()}`,
          status: 'error',
          warnings: [],
          error: { code: 'PROVIDER_UNAVAILABLE', message: err?.message || String(err), retryable: true },
        });
      }
    });

    // 404 handler
    app.use((_req: Request, res: Response) => {
      res.status(404).json({
        requestId: `req_${Date.now()}`,
        status: 'error',
        warnings: [],
        error: { code: 'ANALYSIS_LIMIT_EXCEEDED', message: 'Endpoint not found. See GET / for available endpoints.', retryable: false },
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, this.host, () => {
          console.log(`📡 PathPilot REST API  : http://${this.host}:${this.port}`);
          console.log(`    → Health            : http://${this.host}:${this.port}/api/health`);
          console.log(`    → Evidence analyze  : POST http://${this.host}:${this.port}/api/evidence/analyze`);
          resolve();
        });
        this.server.on('error', (err: Error) => reject(err));
      } catch (e) {
        reject(e);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) return resolve();
      this.server.close((err: Error | undefined) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export const restServer = new PathPilotRestServer();
