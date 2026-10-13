/**
 * Sentinel Gateway — Proxy Tools
 * 
 * The main gateway endpoint: `call_tool`.
 * All agent tool calls route through here.
 */

import {
  ToolDecorator as Tool,
  ControllerDecorator as Controller,
  Widget,
  ExecutionContext,
  Injectable,
  z,
} from '@nitrostack/core';
import { ProxyService } from './proxy.service.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { CryptoService } from '../shared/crypto.service.js';

@Controller('sentinel')
@Injectable({ deps: [ProxyService, LedgerService, CryptoService] })
export class ProxyTools {
  constructor(
    private readonly proxy: ProxyService,
    private readonly ledger: LedgerService,
    private readonly crypto: CryptoService,
  ) {}

  @Tool({
    name: 'call_tool',
    description: 'Route a tool call through Sentinel Gateway\'s security pipeline. The gateway verifies tool integrity (fingerprint check), enforces RBAC policy, logs to the provenance ledger, and only then forwards the call to the downstream MCP server.',
    inputSchema: z.object({
      agentId: z.string().describe('Identity of the calling agent (e.g. "sales-bot", "data-analyst")'),
      serverName: z.string().describe('Name of the target MCP server (e.g. "email-server")'),
      toolName: z.string().describe('Name of the tool to call (e.g. "send_email")'),
      args: z.record(z.unknown()).optional().describe('Arguments to pass to the tool'),
    }),
  })
  async callTool(
    input: { agentId: string; serverName: string; toolName: string; args?: Record<string, unknown> },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info(`🔒 Gateway call: ${input.agentId} → ${input.serverName}/${input.toolName}`);

    const result = await this.proxy.proxyCall(
      input.agentId,
      input.serverName,
      input.toolName,
      input.args || {},
    );

    if (result.blocked) {
      ctx.logger.warn(`🛑 BLOCKED: ${input.agentId} → ${input.serverName}/${input.toolName}: ${result.reason}`);
    } else {
      ctx.logger.info(`✅ ALLOWED: ${input.agentId} → ${input.serverName}/${input.toolName}`);
    }

    return {
      ...result,
      gateway: 'sentinel-gateway',
      pipeline: result.blocked
        ? '🛑 BLOCKED by security pipeline'
        : '✅ Passed: Integrity ✓ → Policy ✓ → Forwarded ✓ → Logged ✓',
    };
  }

  @Tool({
    name: 'query_ledger',
    description: 'Search and filter the provenance ledger. Returns cryptographically linked entries with hash-chain validation.',
    inputSchema: z.object({
      limit: z.number().optional().default(20).describe('Number of entries to return (default: 20)'),
      agentId: z.string().optional().describe('Filter by agent ID'),
      serverName: z.string().optional().describe('Filter by server name'),
      status: z.enum(['ALLOWED', 'BLOCKED', 'FLAGGED', 'INFO']).optional().describe('Filter by status'),
    }),
  })
  @Widget('ledger-viewer')
  async queryLedger(
    input: { limit?: number; agentId?: string; serverName?: string; status?: string },
    ctx: ExecutionContext,
  ) {
    let entries = this.ledger.getAll();

    if (input.agentId) entries = entries.filter((e) => e.agentId === input.agentId);
    if (input.serverName) entries = entries.filter((e) => e.serverName === input.serverName);
    if (input.status) entries = entries.filter((e) => e.status === input.status);

    const limited = entries.slice(-(input.limit || 20));

    ctx.logger.info(`Ledger query: ${limited.length} entries returned`);

    return {
      entries: limited.map((e) => ({
        index: e.index,
        timestamp: e.timestamp,
        agentId: e.agentId,
        serverName: e.serverName,
        toolName: e.toolName,
        action: e.action,
        status: e.status,
        details: e.details,
        hash: this.crypto.shortHash(e.hash),
        prevHash: this.crypto.shortHash(e.prevHash),
        fullHash: e.hash,
      })),
      totalInLedger: this.ledger.length,
      returned: limited.length,
    };
  }

  @Tool({
    name: 'verify_chain_integrity',
    description: 'Verify the cryptographic integrity of the entire provenance ledger. Each entry is hash-chained to the previous one — if any entry has been tampered with, this check will detect it.',
    inputSchema: z.object({}),
  })
  async verifyChainIntegrity(_input: Record<string, never>, ctx: ExecutionContext) {
    const result = this.ledger.verifyIntegrity();

    ctx.logger.info(`Chain verification: ${result.valid ? 'VALID' : 'BROKEN'}`);

    return {
      ...result,
      icon: result.valid ? '🔗✅' : '🔗🛑',
    };
  }

  @Tool({
    name: 'get_dashboard_stats',
    description: 'Get summary statistics for the Sentinel Gateway dashboard — total calls, blocks, drift detections, chain status.',
    inputSchema: z.object({}),
  })
  @Widget('dashboard-stats')
  async getDashboardStats(_input: Record<string, never>, ctx: ExecutionContext) {
    const stats = this.ledger.getStats();
    const history = this.proxy.getCallHistory(100);

    ctx.logger.info('Dashboard stats requested');

    return {
      ...stats,
      recentCalls: history.length,
      uptime: process.uptime(),
      icon: stats.chainValid ? '🛡️✅' : '🛡️⚠️',
    };
  }

  @Tool({
    name: 'get_call_history',
    description: 'Get recent tool call history through the gateway, with status and timing information.',
    inputSchema: z.object({
      limit: z.number().optional().default(20).describe('Number of records to return'),
      agentId: z.string().optional().describe('Filter by agent ID'),
    }),
  })
  async getCallHistory(
    input: { limit?: number; agentId?: string },
    ctx: ExecutionContext,
  ) {
    const history = input.agentId
      ? this.proxy.getAgentHistory(input.agentId, input.limit)
      : this.proxy.getCallHistory(input.limit);

    ctx.logger.info(`Call history: ${history.length} records`);

    return {
      calls: history.map((c) => ({
        timestamp: c.timestamp,
        agentId: c.agentId,
        serverName: c.serverName,
        toolName: c.toolName,
        status: c.status,
        blockReason: c.blockReason,
        durationMs: c.durationMs,
      })),
      totalReturned: history.length,
    };
  }
}
