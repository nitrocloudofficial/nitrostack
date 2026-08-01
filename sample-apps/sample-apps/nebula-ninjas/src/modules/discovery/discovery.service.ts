/**
 * Sentinel Gateway — Discovery Service
 * 
 * Registers downstream MCP servers, fetches their tool lists,
 * and triggers fingerprinting for each discovered tool.
 */

import { Injectable, OnModuleInit } from '@nitrostack/core';
import { FingerprintService } from '../fingerprint/fingerprint.service.js';
import { LedgerService } from '../ledger/ledger.service.js';
import type { ServerRegistration, ToolDefinition } from '../shared/types.js';

@Injectable({ deps: [FingerprintService, LedgerService] })
export class DiscoveryService implements OnModuleInit {
  private servers: Map<string, ServerRegistration> = new Map();

  constructor(
    private readonly fingerprint: FingerprintService,
    private readonly ledger: LedgerService,
  ) {}

  async onModuleInit() {
    console.error('🔍 Discovery service initialized — ready to register MCP servers');
  }

  /**
   * Register a new downstream MCP server.
   * Fetches its tool list and fingerprints each tool.
   */
  async registerServer(name: string, url: string): Promise<ServerRegistration> {
    // Fetch tool list from the server
    const tools = await this.fetchToolList(url);

    const registration: ServerRegistration = {
      name,
      url,
      tools,
      registeredAt: new Date().toISOString(),
      status: 'online',
    };

    this.servers.set(name, registration);

    // Fingerprint each tool
    for (const tool of tools) {
      this.fingerprint.pinTool(
        name,
        tool.name,
        tool.description,
        tool.inputSchema,
      );
    }

    // Log to ledger
    this.ledger.append({
      agentId: 'system',
      serverName: name,
      toolName: '*',
      action: 'SERVER_REGISTERED',
      status: 'INFO',
      details: `Registered server "${name}" at ${url} with ${tools.length} tools: ${tools.map((t) => t.name).join(', ')}`,
    });

    console.error(`🔍 Registered server: ${name} (${url}) — ${tools.length} tools discovered`);
    return registration;
  }

  /**
   * Fetch the current tool list from a server.
   */
  async fetchToolList(url: string): Promise<ToolDefinition[]> {
    try {
      const response = await fetch(`${url}/tools`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json() as { tools: ToolDefinition[] };
      return data.tools || [];
    } catch (error) {
      console.error(`🔍 Failed to fetch tools from ${url}:`, error);
      return [];
    }
  }

  /**
   * Refresh a server's tool list (re-fetch and compare).
   */
  async refreshToolList(serverName: string): Promise<ToolDefinition[]> {
    const server = this.servers.get(serverName);
    if (!server) throw new Error(`Server "${serverName}" not registered`);

    const tools = await this.fetchToolList(server.url);
    server.tools = tools;
    return tools;
  }

  /**
   * Get a registered server by name.
   */
  getServer(name: string): ServerRegistration | undefined {
    return this.servers.get(name);
  }

  /**
   * Get all registered servers.
   */
  getAllServers(): ServerRegistration[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get the URL for a registered server.
   */
  getServerUrl(name: string): string | undefined {
    return this.servers.get(name)?.url;
  }

  /**
   * Check if a server is registered.
   */
  isRegistered(name: string): boolean {
    return this.servers.has(name);
  }

  /**
   * Remove a server registration.
   */
  removeServer(name: string): boolean {
    const removed = this.servers.delete(name);
    if (removed) {
      this.ledger.append({
        agentId: 'system',
        serverName: name,
        toolName: '*',
        action: 'SERVER_REMOVED',
        status: 'INFO',
        details: `Server "${name}" has been unregistered`,
      });
    }
    return removed;
  }

  /**
   * Get a flat list of all tools across all servers.
   */
  getAllTools(): Array<{ serverName: string; tool: ToolDefinition }> {
    const result: Array<{ serverName: string; tool: ToolDefinition }> = [];
    for (const server of this.servers.values()) {
      for (const tool of server.tools) {
        result.push({ serverName: server.name, tool });
      }
    }
    return result;
  }

  /**
   * Find which server a tool belongs to.
   */
  findToolServer(toolName: string): ServerRegistration | undefined {
    for (const server of this.servers.values()) {
      if (server.tools.some((t) => t.name === toolName)) {
        return server;
      }
    }
    return undefined;
  }

  /**
   * Clear all ledger entries.
   */
  clearLedger(): void {
    this.ledger.clearLedger();
  }

  /**
   * Total number of registered servers.
   */
  get serverCount(): number {
    return this.servers.size;
  }
}
