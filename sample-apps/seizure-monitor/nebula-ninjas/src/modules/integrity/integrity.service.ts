/**
 * Sentinel Gateway — Integrity Service
 * 
 * Re-hashes tool descriptions on every call and compares against
 * the pinned fingerprint. This is the core drift detection mechanism.
 */

import { Injectable } from '@nitrostack/core';
import { DiscoveryService } from '../discovery/discovery.service.js';
import { FingerprintService } from '../fingerprint/fingerprint.service.js';
import { LedgerService } from '../ledger/ledger.service.js';
import type { FingerprintCheckResult } from '../shared/types.js';

@Injectable({ deps: [DiscoveryService, FingerprintService, LedgerService] })
export class IntegrityService {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly fingerprint: FingerprintService,
    private readonly ledger: LedgerService,
  ) {}

  /**
   * Validate a tool call by re-fetching the tool description from the
   * downstream server and comparing its hash against the pinned fingerprint.
   * 
   * Returns the check result with match/mismatch details.
   */
  async validateCall(
    serverName: string,
    toolName: string,
    agentId: string,
  ): Promise<FingerprintCheckResult> {
    const server = this.discovery.getServer(serverName);
    if (!server) {
      throw new Error(`Server "${serverName}" not registered`);
    }

    // Re-fetch the tool list from the downstream server
    const currentTools = await this.discovery.fetchToolList(server.url);
    const currentTool = currentTools.find((t) => t.name === toolName);

    if (!currentTool) {
      // Tool no longer exists on the server — suspicious
      const result: FingerprintCheckResult = {
        match: false,
        serverName,
        toolName,
        expectedHash: 'PINNED',
        actualHash: 'TOOL_MISSING',
        drift: {
          oldDescription: 'Tool was previously available',
          newDescription: 'Tool no longer exists on server — possible attack',
        },
      };

      this.ledger.append({
        agentId,
        serverName,
        toolName,
        action: 'BLOCK_DRIFT',
        status: 'BLOCKED',
        details: `Tool "${toolName}" no longer exists on server "${serverName}" — blocked`,
      });

      return result;
    }

    // Check the fingerprint
    const result = this.fingerprint.checkTool(
      serverName,
      toolName,
      currentTool.description,
      currentTool.inputSchema,
    );

    if (!result.match) {
      // DRIFT DETECTED — log and block
      this.ledger.append({
        agentId,
        serverName,
        toolName,
        action: 'BLOCK_DRIFT',
        status: 'BLOCKED',
        details: `🛑 DRIFT DETECTED on "${toolName}": description hash changed from ${result.expectedHash.substring(0, 12)}... to ${result.actualHash.substring(0, 12)}... — BLOCKED`,
      });

      console.error(`🛑 DRIFT DETECTED: ${serverName}/${toolName} — hash mismatch!`);
    }

    return result;
  }

  /**
   * Quick check without re-fetching (uses cached tool data).
   * Faster but doesn't catch real-time changes.
   */
  quickCheck(
    serverName: string,
    toolName: string,
  ): FingerprintCheckResult | null {
    const server = this.discovery.getServer(serverName);
    if (!server) return null;

    const tool = server.tools.find((t) => t.name === toolName);
    if (!tool) return null;

    return this.fingerprint.checkTool(
      serverName,
      toolName,
      tool.description,
      tool.inputSchema,
    );
  }
}
