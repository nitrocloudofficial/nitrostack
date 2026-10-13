/**
 * Sentinel Gateway — Discovery Tools
 * 
 * NitroStack MCP tools for server registration and tool discovery.
 * These are the tools that agents/dashboard call to manage the gateway.
 */

import {
  ToolDecorator as Tool,
  ControllerDecorator as Controller,
  Widget,
  ExecutionContext,
  Injectable,
  z,
} from '@nitrostack/core';
import { DiscoveryService } from './discovery.service.js';
import { FingerprintService } from '../fingerprint/fingerprint.service.js';
import { CryptoService } from '../shared/crypto.service.js';

@Controller('sentinel')
@Injectable({ deps: [DiscoveryService, FingerprintService, CryptoService] })
export class DiscoveryTools {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly fingerprint: FingerprintService,
    private readonly crypto: CryptoService,
  ) {}

  @Tool({
    name: 'register_server',
    description: 'Register a new downstream MCP server with Sentinel Gateway. The gateway will discover all tools, fingerprint their descriptions, and begin monitoring for drift.',
    inputSchema: z.object({
      name: z.string().describe('Unique name for this server (e.g. "email-server", "crm-server")'),
      url: z.string().url().describe('Base URL of the MCP server (e.g. "http://localhost:3001")'),
    }),
  })
  async registerServer(
    input: { name: string; url: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info(`Registering server: ${input.name} at ${input.url}`);

    const registration = await this.discovery.registerServer(input.name, input.url);
    const fingerprints = this.fingerprint.getServerFingerprints(input.name);

    return {
      success: true,
      server: {
        name: registration.name,
        url: registration.url,
        status: registration.status,
        registeredAt: registration.registeredAt,
        toolCount: registration.tools.length,
      },
      tools: registration.tools.map((tool) => {
        const fp = fingerprints.find((f) => f.toolName === tool.name);
        return {
          name: tool.name,
          description: tool.description,
          fingerprint: fp ? this.crypto.shortHash(fp.hash) : 'N/A',
          fullHash: fp?.hash,
        };
      }),
      message: `✅ Server "${input.name}" registered with ${registration.tools.length} tools. All descriptions fingerprinted.`,
    };
  }

  @Tool({
    name: 'list_servers',
    description: 'List all registered downstream MCP servers and their connection status.',
    inputSchema: z.object({}),
  })
  @Widget('server-topology')
  async listServers(_input: Record<string, never>, ctx: ExecutionContext) {
    const servers = this.discovery.getAllServers();

    ctx.logger.info(`Listing ${servers.length} registered servers`);

    return {
      servers: servers.map((s) => ({
        name: s.name,
        url: s.url,
        status: s.status,
        registeredAt: s.registeredAt,
        toolCount: s.tools.length,
        tools: s.tools.map((t) => t.name),
      })),
      totalServers: servers.length,
      totalTools: servers.reduce((sum, s) => sum + s.tools.length, 0),
    };
  }

  @Tool({
    name: 'list_tools',
    description: 'List all discovered tools across all registered servers, with their fingerprint status and trust level.',
    inputSchema: z.object({
      serverName: z.string().optional().describe('Filter by server name'),
    }),
  })
  async listTools(
    input: { serverName?: string },
    ctx: ExecutionContext,
  ) {
    const allTools = this.discovery.getAllTools();
    const filtered = input.serverName
      ? allTools.filter((t) => t.serverName === input.serverName)
      : allTools;

    const fingerprints = this.fingerprint.getAllFingerprints();

    ctx.logger.info(`Listing ${filtered.length} tools`);

    return {
      tools: filtered.map(({ serverName, tool }) => {
        const fp = fingerprints.find(
          (f) => f.serverName === serverName && f.toolName === tool.name,
        );
        return {
          serverName,
          toolName: tool.name,
          description: tool.description.substring(0, 100) + (tool.description.length > 100 ? '...' : ''),
          fingerprint: fp ? this.crypto.shortHash(fp.hash) : 'NOT PINNED',
          fullHash: fp?.hash,
          pinnedAt: fp?.pinnedAt,
          lastVerifiedAt: fp?.lastVerifiedAt,
          trusted: !!fp,
        };
      }),
      totalTools: filtered.length,
      totalFingerprinted: fingerprints.length,
    };
  }

  @Tool({
    name: 'setup_demo',
    description: 'Quick setup: Register all 3 demo mock servers (filesystem, CRM, email) with the gateway in one step. Useful for demo initialization.',
    inputSchema: z.object({}),
  })
  async setupDemo(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Setting up demo — registering all mock servers');

    // Wipe previous ledger entries to start fresh with clean hash chain
    this.discovery.clearLedger();

    const servers = [
      { name: 'filesystem-server', url: process.env.MOCK_FILESYSTEM_URL || 'http://127.0.0.1:3001' },
      { name: 'crm-server', url: process.env.MOCK_CRM_URL || 'http://127.0.0.1:3002' },
      { name: 'email-server', url: process.env.MOCK_EMAIL_URL || 'http://127.0.0.1:3003' },
    ];

    const results = [];
    for (const server of servers) {
      try {
        // Reset mock server to original clean state before registering
        await fetch(`${server.url}/admin/reset`, { method: 'POST' }).catch(() => {});

        const reg = await this.discovery.registerServer(server.name, server.url);
        results.push({
          name: server.name,
          status: 'registered',
          toolCount: reg.tools.length,
          tools: reg.tools.map((t) => t.name),
        });
      } catch (error) {
        results.push({
          name: server.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'registered').length;

    return {
      results,
      summary: `✅ ${successCount}/${servers.length} servers registered. ${this.fingerprint.count} tools fingerprinted.`,
    };
  }
}
