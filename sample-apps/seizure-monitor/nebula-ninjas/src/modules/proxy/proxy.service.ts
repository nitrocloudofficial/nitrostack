/**
 * Sentinel Gateway — Proxy Service
 * 
 * The core forwarding engine. All tool calls go through here.
 * Pipeline: Integrity Check → Policy Check → Forward → Log Result
 */

import { Injectable } from '@nitrostack/core';
import { DiscoveryService } from '../discovery/discovery.service.js';
import { IntegrityService } from '../integrity/integrity.service.js';
import { PolicyService } from '../policy/policy.service.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { CryptoService } from '../shared/crypto.service.js';
import type { CallRecord } from '../shared/types.js';

@Injectable({ deps: [DiscoveryService, IntegrityService, PolicyService, LedgerService, CryptoService] })
export class ProxyService {
  private callHistory: CallRecord[] = [];

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly integrity: IntegrityService,
    private readonly policy: PolicyService,
    private readonly ledger: LedgerService,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Proxy a tool call through the full security pipeline:
   * 1. Verify server is registered
   * 2. Check tool integrity (fingerprint match)
   * 3. Check RBAC policy
   * 4. Forward call to downstream server
   * 5. Log everything to the ledger
   */
  async proxyCall(
    agentId: string,
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<{ success: boolean; result?: unknown; blocked: boolean; reason?: string; ledgerEntryId: string }> {
    const startTime = Date.now();
    const inputHash = this.crypto.hashContent(args);

    // Step 1: Check server is registered
    const server = this.discovery.getServer(serverName);
    if (!server) {
      const entry = this.ledger.append({
        agentId,
        serverName,
        toolName,
        action: 'CALL',
        status: 'BLOCKED',
        details: `Server "${serverName}" is not registered with the gateway`,
        inputHash,
      });

      return {
        success: false,
        blocked: true,
        reason: `Server "${serverName}" is not registered. Register it first using sentinel_register_server.`,
        ledgerEntryId: entry.id,
      };
    }

    // Step 2: Integrity check (re-hash tool description)
    const integrityResult = await this.integrity.validateCall(serverName, toolName, agentId);
    if (!integrityResult.match) {
      const entry = this.ledger.append({
        agentId,
        serverName,
        toolName,
        action: 'BLOCK_DRIFT',
        status: 'BLOCKED',
        details: `🛑 TOOL POISONING DETECTED: "${toolName}" description has changed since it was trusted. Expected hash: ${integrityResult.expectedHash.substring(0, 12)}..., Got: ${integrityResult.actualHash.substring(0, 12)}...`,
        inputHash,
      });

      this.recordCall(agentId, serverName, toolName, args, undefined, 'BLOCKED', 'Tool description drift detected', entry.id, Date.now() - startTime);

      return {
        success: false,
        blocked: true,
        reason: `🛑 BLOCKED: Tool "${toolName}" on "${serverName}" has been modified since it was trusted. This may be a tool-poisoning attack. Original description hash: ${integrityResult.expectedHash.substring(0, 12)}..., Current: ${integrityResult.actualHash.substring(0, 12)}...`,
        ledgerEntryId: entry.id,
      };
    }

    // Step 3: RBAC policy check
    const policyResult = this.policy.checkAccess(agentId, serverName, toolName, args);
    if (!policyResult.allowed) {
      const entry = this.ledger.append({
        agentId,
        serverName,
        toolName,
        action: 'BLOCK_POLICY',
        status: 'BLOCKED',
        details: `⛔ ACCESS DENIED: ${policyResult.reason}`,
        inputHash,
      });

      this.recordCall(agentId, serverName, toolName, args, undefined, 'BLOCKED', policyResult.reason, entry.id, Date.now() - startTime);

      return {
        success: false,
        blocked: true,
        reason: `⛔ BLOCKED: ${policyResult.reason}`,
        ledgerEntryId: entry.id,
      };
    }

    // Step 4: Forward call to downstream server
    try {
      const response = await fetch(`${server.url}/call/${toolName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });

      const result = await response.json();
      const outputHash = this.crypto.hashContent(result);

      // Step 5: Log successful call
      const entry = this.ledger.append({
        agentId,
        serverName,
        toolName,
        action: 'CALL',
        status: 'ALLOWED',
        details: `✅ Call forwarded and completed successfully`,
        inputHash,
        outputHash,
      });

      this.recordCall(agentId, serverName, toolName, args, result, 'ALLOWED', undefined, entry.id, Date.now() - startTime);

      return {
        success: true,
        result,
        blocked: false,
        ledgerEntryId: entry.id,
      };
    } catch (error) {
      const entry = this.ledger.append({
        agentId,
        serverName,
        toolName,
        action: 'CALL',
        status: 'BLOCKED',
        details: `❌ Downstream call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        inputHash,
      });

      return {
        success: false,
        blocked: true,
        reason: `Downstream server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ledgerEntryId: entry.id,
      };
    }
  }

  /**
   * Record a call in the call history.
   */
  private recordCall(
    agentId: string,
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
    result: unknown,
    status: 'ALLOWED' | 'BLOCKED',
    blockReason: string | undefined,
    ledgerEntryId: string,
    durationMs: number,
  ): void {
    const record: CallRecord = {
      id: ledgerEntryId,
      agentId,
      serverName,
      toolName,
      args,
      result,
      status,
      blockReason,
      timestamp: new Date().toISOString(),
      durationMs,
      ledgerEntryId,
    };

    this.callHistory.push(record);

    // Keep only last 1000 records in memory
    if (this.callHistory.length > 1000) {
      this.callHistory = this.callHistory.slice(-1000);
    }
  }

  /**
   * Get recent call history.
   */
  getCallHistory(limit: number = 50): CallRecord[] {
    return this.callHistory.slice(-limit);
  }

  /**
   * Get call history for a specific agent.
   */
  getAgentHistory(agentId: string, limit: number = 50): CallRecord[] {
    return this.callHistory
      .filter((c) => c.agentId === agentId)
      .slice(-limit);
  }
}
