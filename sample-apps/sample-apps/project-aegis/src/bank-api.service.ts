import { Injectable } from '@nitrostack/core';
import express, { Express } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import cors from 'cors';
import { MockCBSService } from './mock-cbs.service.js';
import { SingleFlightGate } from './patterns/single-flight.js';
import { IdempotencyEnforcer } from './patterns/idempotency.js';
import { QosShunting, TrafficClass } from './patterns/qos-shunting.js';

/** Helper to resolve static widget HTML files across diverse environment CWD layouts. */
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
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

@Injectable({ deps: [MockCBSService, SingleFlightGate, IdempotencyEnforcer, QosShunting] })
export class BankApiService {
  private app: Express;
  private server: any;

  constructor(
    private readonly cbs: MockCBSService,
    private readonly singleFlight: SingleFlightGate,
    private readonly idempotency: IdempotencyEnforcer,
    private readonly qos: QosShunting
  ) {
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());

    // Robust static widget route handler
    const handleWidgetRequest = (req: express.Request, res: express.Response) => {
      const rawParam = req.params.widgetName;
      const name = (Array.isArray(rawParam) ? rawParam[0] : rawParam) || 'tools';
      const file = findWidgetHtmlFile(name);
      if (file) {
        return res.sendFile(file);
      }
      // Ultimate fallback to primary widget HTML
      const fallbackFile = findWidgetHtmlFile('tools');
      if (fallbackFile) {
        return res.sendFile(fallbackFile);
      }
      return res.status(404).send('Bank SRE Control Panel widget build not found');
    };

    // Explicit UI routes
    this.app.get('/', handleWidgetRequest);
    this.app.get('/tools', handleWidgetRequest);
    this.app.get('/sre-control-panel', handleWidgetRequest);
    this.app.get('/aegis-resilience-widget', handleWidgetRequest);
    this.app.get('/widgets/:widgetName', handleWidgetRequest);
    this.app.get('/:widgetName', handleWidgetRequest);

    this.app.use(express.static(path.join(process.cwd(), 'src/widgets/out')));
    this.app.use(express.static(path.join(process.cwd(), 'widgets/out')));

    this.setupRoutes();
    this.startServer();
  }

  private setupRoutes() {
    // 1. Transfer Endpoint
    this.app.post('/api/v1/transfer', async (req, res) => {
      const { from, to, amount, nonce } = req.body;

      // Input Validation Phase (Prevent exploits & self-transfer lockup)
      if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
        return res.status(400).json({ error: 'Bad Request - Invalid sender or recipient account' });
      }

      if (from === to) {
        return res.status(400).json({ error: 'Bad Request - Self-transfers are not permitted' });
      }

      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Bad Request - Amount must be a positive finite number' });
      }

      // Admission Control Phase (QoS)
      if (!this.qos.admit(TrafficClass.MONEY_TRANSFER)) {
        return res.status(429).json({ error: 'Too Many Requests - QoS Shunting Active' });
      }

      // Idempotency Phase (Double-Spend Protection)
      if (!this.idempotency.checkAndRegister(from, to, amount, nonce || '')) {
        return res.status(409).json({ error: 'Conflict - Duplicate Transaction Intercepted' });
      }

      // Simulate Lock Contention & Process
      try {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate write latency
        await this.cbs.processTransaction({
          fromAccountId: from,
          toAccountId: to,
          amount,
          currency: 'USD',
          timestamp: new Date().toISOString()
        });
        return res.status(200).json({ status: 'SUCCESS' });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    });

    // 2. Balance Endpoint
    this.app.get('/api/v1/balance/:id', async (req, res) => {
      const accountId = req.params.id;

      // Admission Control Phase (QoS)
      if (!this.qos.admit(TrafficClass.NON_CRITICAL)) {
        return res.status(429).json({ error: 'Too Many Requests - QoS Shunting Active' });
      }

      try {
        // Single-Flight Coalescing Phase
        const balance = await this.singleFlight.coalesce(`balance:${accountId}`, async () => {
          return (await this.cbs.getBalance(accountId)) || 0;
        });

        return res.status(200).json({ accountId, balance });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    });

    // 3. Synthetic Storm Trigger
    this.app.post('/api/v1/simulate-storm', (req, res) => {
      this.simulateStorm();
      return res.status(202).json({ status: 'STORM_INITIATED' });
    });
  }

  private simulateStorm() {
    console.log('[AEGIS-SIM] Salary Day Storm Initiated...');
    
    // In-memory simulation of 500 transfers with duplicated nonces
    for (let i = 0; i < 500; i++) {
      const nonce = `storm-nonce-${Math.floor(i / 10)}`;
      if (this.idempotency.checkAndRegister('MOCK-CORP-ACCOUNT', `EMP-${i}`, 5000, nonce)) {
        this.cbs.processTransaction({
          fromAccountId: 'MOCK-CORP-ACCOUNT',
          toAccountId: `EMP-${i}`,
          amount: 5000,
          currency: 'USD',
          timestamp: new Date().toISOString()
        }).catch(() => null);
      }
    }

    // In-memory simulation of 1000 balance queries over single-flight gate
    for (let i = 0; i < 1000; i++) {
      this.singleFlight.coalesce('/api/v1/balance/MOCK-CORP-ACCOUNT', () => this.cbs.getBalance('MOCK-CORP-ACCOUNT')).catch(() => null);
    }
  }

  private startServer() {
    try {
      // PRODUCTION DEPLOYMENT PATCH: Host Binding & Dynamic Port Assignment
      // Listens on process.env.BANK_API_PORT dynamically with 3001 fallback
      const PORT = Number(process.env.BANK_API_PORT) || 3001;
      const HOST = '0.0.0.0';

      this.server = this.app.listen(PORT, HOST, () => {
        console.log(`Server listening on http://${HOST}:${PORT}`);
      });
      this.server.on('error', (err: any) => {
        console.warn(`[AEGIS] Bank API server note: ${err.message}`);
      });
    } catch (err: any) {
      console.warn(`[AEGIS] Could not bind server port: ${err.message}`);
    }
  }
}
