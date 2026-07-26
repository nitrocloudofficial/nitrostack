/**
 * Express Event Gateway — Aegis Protocol REST Interface
 *
 * Exposes REST endpoints for the Aegis Protocol zero-knowledge threat fusion engine:
 * 1. POST /api/v1/transaction/process: Processes incoming financial transactions through the 2-agent pipeline.
 * 2. POST /api/v1/guard/resolve: Resolves pending HITL guard states triggered by high threat scores.
 * 3. GET  /api/v1/events: Server-Sent Events (SSE) stream for real-time dashboard updates.
 */

import express, { Request, Response } from 'express';
import { AegisAgents, TransactionPayload } from './agents/AegisAgents.js';
import { HitlGateState } from './modules/aegis/guards/threat-score.guard.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Enable CORS for cross-origin frontend communication
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const aegisAgents = new AegisAgents();

// Active processing tasks map to keep track of asynchronous adjudication resolution
const pendingTransactions = new Map<string, {
  promise: Promise<any>;
  transaction_id: string;
  threat_score: number;
  report: any;
}>();

// ─────────────────────────────────────────────────────────────
// SSE (Server-Sent Events) Infrastructure
// ─────────────────────────────────────────────────────────────

/** Set of connected SSE clients */
const sseClients = new Set<Response>();

/**
 * Broadcast an event to all connected SSE clients.
 *
 * Wire format:
 *   event: <eventName>\n
 *   data: <JSON payload>\n\n
 */
function broadcastSSE(eventName: string, data: Record<string, unknown>): void {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  console.log(`📡 [SSE] Broadcasting "${eventName}" to ${sseClients.size} client(s)`);

  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      // Client disconnected, will be cleaned up
      sseClients.delete(client);
    }
  }
}

/**
 * Endpoint 3: Server-Sent Events Stream
 *
 * Frontend connects via EventSource to receive real-time updates:
 *   - guard_frozen:   When a high-threat transaction triggers the HITL gate
 *   - guard_resolved: When a fraud officer approves or denies the freeze
 *   - heartbeat:      Keep-alive every 30 seconds
 */
app.get('/api/v1/events', (req: Request, res: Response) => {
  console.log(`\n📡 [SSE] New client connected (total: ${sseClients.size + 1})`);

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',    // Disable nginx buffering
  });

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({
    message: 'Aegis Protocol SSE stream connected',
    timestamp: new Date().toISOString(),
    client_count: sseClients.size + 1,
  })}\n\n`);

  // Add to active clients
  sseClients.add(res);

  // Heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({
        timestamp: new Date().toISOString(),
        clients: sseClients.size,
      })}\n\n`);
    } catch {
      clearInterval(heartbeatInterval);
      sseClients.delete(res);
    }
  }, 30_000);

  // Clean up on client disconnect
  req.on('close', () => {
    console.log(`📡 [SSE] Client disconnected (remaining: ${sseClients.size - 1})`);
    clearInterval(heartbeatInterval);
    sseClients.delete(res);
  });
});

/**
 * Endpoint 1: Process Transaction Pipeline
 *
 * Accepts transaction payload, executes Agent 1 (Investigator) and Agent 2 (Adjudicator).
 * If @Guard halts Agent 2 (threat_score >= 80), returns 202 Accepted with status FROZEN_PENDING_REVIEW
 * and broadcasts a `guard_frozen` SSE event.
 */
app.post('/api/v1/transaction/process', async (req: Request, res: Response) => {
  try {
    const payload: TransactionPayload = req.body;

    if (!payload.amount || !payload.sender_phone || !payload.destination_account) {
      return res.status(400).json({
        error: 'INVALID_PAYLOAD',
        message: 'Payload must contain amount, sender_phone, and destination_account.',
      });
    }

    const txnId = `TXN-${Date.now()}`;
    console.log(`\n📥 [REST GATEWAY] Received transaction process request ${txnId}`);

    // Step 1: Execute Agent 1 (Investigator)
    const report = await aegisAgents.runInvestigator(payload);

    // Step 2: Trigger Agent 2 (Adjudicator) asynchronously so we can catch guard activation
    const adjudicationPromise = aegisAgents.runAdjudicator(report);

    // Give the adjudicator a microtick to calculate threat score and set guard state
    await new Promise((r) => setTimeout(r, 50));

    const gate = HitlGateState.getInstance();
    const threatScore = gate.getThreatScore();

    // Check if the guard has paused execution
    if (gate.hasPendingApproval() || threatScore >= 80) {
      pendingTransactions.set(txnId, {
        promise: adjudicationPromise,
        transaction_id: txnId,
        threat_score: threatScore,
        report,
      });

      // ── Broadcast SSE: guard_frozen ──
      broadcastSSE('guard_frozen', {
        transaction_id: txnId,
        threat_score: threatScore,
        threat_level: threatScore >= 80 ? 'CRITICAL' : 'HIGH',
        investigator_report: report,
        status: 'FROZEN_PENDING_REVIEW',
        timestamp: new Date().toISOString(),
      });

      return res.status(202).json({
        status: 'FROZEN_PENDING_REVIEW',
        transaction_id: txnId,
        threat_score: threatScore,
        data: report,
      });
    }

    // Otherwise, wait for completed adjudication
    const result = await adjudicationPromise;
    return res.status(200).json({
      status: 'PROCESSED',
      transaction_id: txnId,
      result,
    });
  } catch (error: any) {
    console.error('❌ [REST GATEWAY] Error processing transaction:', error);
    return res.status(500).json({
      error: 'PROCESSING_FAILED',
      message: error.message || 'An error occurred during pipeline execution.',
    });
  }
});

/**
 * Endpoint 2: Resolve Guard State
 *
 * Resolves an active HITL guard lock with action FREEZE or ALLOW.
 * If FREEZE, resumes Agent 2 to call dispatch_mha_alert and returns success.
 * Broadcasts a `guard_resolved` SSE event to all connected dashboards.
 */
app.post('/api/v1/guard/resolve', async (req: Request, res: Response) => {
  try {
    const { action, transaction_id } = req.body;

    if (!action || !['FREEZE', 'ALLOW'].includes(action)) {
      return res.status(400).json({
        error: 'INVALID_ACTION',
        message: 'Action must be either "FREEZE" or "ALLOW".',
      });
    }

    console.log(`\n🛡️ [REST GATEWAY] Guard resolution request: ${action} for ${transaction_id || 'active transaction'}`);

    const gate = HitlGateState.getInstance();

    if (!gate.hasPendingApproval()) {
      return res.status(404).json({
        error: 'NO_PENDING_GUARD',
        message: 'No active guard gate waiting for approval.',
      });
    }

    const isFreeze = action === 'FREEZE';
    const wasResolved = gate.resolveApproval(isFreeze);

    if (!wasResolved) {
      return res.status(500).json({
        error: 'RESOLUTION_FAILED',
        message: 'Failed to resolve HITL gate approval.',
      });
    }

    // Retrieve pending transaction promise if tracking by ID
    const pending = transaction_id ? pendingTransactions.get(transaction_id) : null;
    let finalResult = null;

    if (pending) {
      finalResult = await pending.promise;
      pendingTransactions.delete(transaction_id);
    }

    // ── Broadcast SSE: guard_resolved ──
    broadcastSSE('guard_resolved', {
      transaction_id: transaction_id || 'ACTIVE_TRANSACTION',
      action,
      mha_dispatch_triggered: isFreeze,
      mha_case_id: finalResult?.mha_dispatch?.mha_case_id || null,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      status: 'RESOLVED',
      action,
      transaction_id: transaction_id || 'ACTIVE_TRANSACTION',
      mha_dispatch_triggered: isFreeze,
      details: finalResult || { message: `Guard lock resolved with action ${action}` },
    });
  } catch (error: any) {
    console.error('❌ [REST GATEWAY] Error resolving guard:', error);
    return res.status(500).json({
      error: 'RESOLVE_FAILED',
      message: error.message || 'An error occurred during guard resolution.',
    });
  }
});

// Start Express Gateway Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Aegis Protocol Express Gateway running on http://localhost:${PORT}`);
    console.log(`   - POST http://localhost:${PORT}/api/v1/transaction/process`);
    console.log(`   - POST http://localhost:${PORT}/api/v1/guard/resolve`);
    console.log(`   - GET  http://localhost:${PORT}/api/v1/events (SSE Stream)\n`);
  });
}

export { broadcastSSE, sseClients };
export default app;
