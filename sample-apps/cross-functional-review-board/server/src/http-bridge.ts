/**
 * CFRB HTTP Bridge
 *
 * Thin, additive layer that exposes the existing MCP tool classes over a
 * plain HTTP/SSE endpoint so a standalone React frontend can drive the
 * review board without speaking MCP/JSON-RPC.
 *
 * This file does NOT modify or duplicate any review logic — it directly
 * imports and calls the same ProductTools / EngineeringTools / SecurityTools /
 * LegalTools / DebateService / ModeratorTools classes used by the MCP server,
 * so the demo and the "real" system can never drift apart.
 *
 * Run alongside (or instead of) the MCP server:
 *   npm run bridge
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { ProductTools } from './modules/product/product.tools.js';
import { EngineeringTools } from './modules/engineering/engineering.tools.js';
import { SecurityTools } from './modules/security/security.tools.js';
import { LegalTools } from './modules/legal/legal.tools.js';
import { DebateService } from './modules/debate/debate.service.js';
import { ModeratorTools } from './modules/moderator/moderator.tools.js';
import { DepartmentOutput } from './modules/shared/types.js';

// Minimal ExecutionContext stub — the tool classes only ever call ctx.logger.info/.error
const makeCtx = (tag: string) => ({
  logger: {
    info: (msg: string, meta?: unknown) => console.log(`[${tag}] ${msg}`, meta ?? ''),
    error: (msg: string, meta?: unknown) => console.error(`[${tag}] ${msg}`, meta ?? '')
  }
});

const productTools = new ProductTools();
const engineeringTools = new EngineeringTools();
const securityTools = new SecurityTools();
const legalTools = new LegalTools();
const debateService = new DebateService();
const moderatorTools = new ModeratorTools();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mockMode: process.env.USE_MOCK_LLM === 'true' });
});

/**
 * GET /api/review/stream?proposalTitle=...&proposalDescription=...
 *
 * Server-Sent Events stream. Emits one event per real milestone as it
 * actually completes — nothing here is a hardcoded delay or fake progress
 * bar. Event types, in order:
 *
 *   agent_start   { agent }
 *   agent_done    { agent, output: DepartmentOutput }
 *   agent_error   { agent, error }
 *   reconciliation_done { reconciled: boolean, productOutput }
 *   debate_exchange     { exchange: ChallengeRoundOutput }   (one per exchange, as it resolves)
 *   debate_done         { outputs: DepartmentOutput[] }
 *   final_report        { finalReport: ModeratorOutput }
 *   error                { message }
 *   done                 {}
 */
app.get('/api/review/stream', async (req, res) => {
  const proposalTitle = String(req.query.proposalTitle || '');
  const proposalDescription = String(req.query.proposalDescription || '');

  if (!proposalTitle.trim() || !proposalDescription.trim()) {
    res.status(400).json({ error: 'proposalTitle and proposalDescription are required' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const input = { proposalTitle, proposalDescription };

  try {
    // --- Step 1: Round 0 — four agents run genuinely in parallel ---
    const agentRunners: Array<[DepartmentOutput['agent'], () => Promise<DepartmentOutput>]> = [
      ['product', () => productTools.reviewProposal(input, makeCtx('product') as any)],
      ['engineering', () => engineeringTools.reviewProposal(input, makeCtx('engineering') as any)],
      ['security', () => securityTools.reviewProposal(input, makeCtx('security') as any)],
      ['legal', () => legalTools.reviewProposal(input, makeCtx('legal') as any)]
    ];

    agentRunners.forEach(([agent]) => send('agent_start', { agent }));

    const settled = await Promise.all(
      agentRunners.map(async ([agent, run]) => {
        try {
          const output = await run();
          send('agent_done', { agent, output });
          return output;
        } catch (err: any) {
          send('agent_error', { agent, error: err?.message || String(err) });
          throw err;
        }
      })
    );

    let [prodOutput, engOutput, secOutput, legOutput] = settled;

    // --- Step 2: Estimate Reconciliation ---
    const reconciliation = debateService.reconcileEstimates(prodOutput, engOutput);
    prodOutput = reconciliation.productOutput;
    send('reconciliation_done', {
      reconciled: reconciliation.reconciled,
      productOutput: prodOutput
    });

    let currentOutputs: DepartmentOutput[] = [prodOutput, engOutput, secOutput, legOutput];

    // --- Step 3: Debate cycle ---
    const proposalText = `Title: ${proposalTitle}\n\nDescription: ${proposalDescription}`;
    const debateRes = await debateService.runFullDebateCycle(
      currentOutputs,
      proposalText,
      makeCtx('debate') as any
    );
    currentOutputs = debateRes.outputs;

    debateRes.exchanges.forEach(exchange => send('debate_exchange', { exchange }));
    send('debate_done', { outputs: currentOutputs });

    // --- Step 4: Moderator synthesis ---
    const finalReport = await moderatorTools.synthesizeReport(
      { proposalTitle, proposalDescription, agentOutputs: currentOutputs },
      makeCtx('moderator') as any
    );
    send('final_report', { finalReport });

    send('done', {});
    res.end();
  } catch (err: any) {
    send('error', { message: err?.message || String(err) });
    res.end();
  }
});

const PORT = Number(process.env.BRIDGE_PORT || 4000);
app.listen(PORT, () => {
  console.log(`✅ CFRB HTTP bridge listening on http://localhost:${PORT}`);
  console.log(`   Mock LLM mode: ${process.env.USE_MOCK_LLM === 'true' ? 'ON (offline/demo-safe)' : 'off (using real provider, with mock fallback on error)'}`);
});
