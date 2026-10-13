/**
 * Sentinel Gateway — Fingerprint Service
 * 
 * Pins and verifies tool description hashes. When a tool is first discovered,
 * its description is hashed and stored as the "trusted" fingerprint. On every
 * subsequent call, the current description is re-hashed and compared.
 * 
 * Mismatch = tool poisoning / drift → BLOCK.
 */

import { Injectable } from '@nitrostack/core';
import { CryptoService } from '../shared/crypto.service.js';
import type { ToolFingerprint, FingerprintCheckResult } from '../shared/types.js';

@Injectable({ deps: [CryptoService] })
export class FingerprintService {
  private fingerprints: Map<string, ToolFingerprint> = new Map();

  constructor(private readonly crypto: CryptoService) {}

  /**
   * Create a unique key for a tool on a specific server.
   */
  private makeKey(serverName: string, toolName: string): string {
    return `${serverName}::${toolName}`;
  }

  /**
   * Pin a tool's description hash as trusted.
   * Called when a tool is first discovered.
   */
  pinTool(
    serverName: string,
    toolName: string,
    description: string,
    schema?: Record<string, unknown>,
  ): ToolFingerprint {
    const key = this.makeKey(serverName, toolName);
    const hash = this.crypto.hashToolDescription(toolName, description, schema);
    const now = new Date().toISOString();

    const fingerprint: ToolFingerprint = {
      serverName,
      toolName,
      hash,
      description,
      schema,
      pinnedAt: now,
      lastVerifiedAt: now,
    };

    this.fingerprints.set(key, fingerprint);
    return fingerprint;
  }

  /**
   * Check a tool's current description against its trusted fingerprint.
   * Returns match status with details.
   */
  checkTool(
    serverName: string,
    toolName: string,
    currentDescription: string,
    currentSchema?: Record<string, unknown>,
  ): FingerprintCheckResult {
    const key = this.makeKey(serverName, toolName);
    const fingerprint = this.fingerprints.get(key);

    const currentHash = this.crypto.hashToolDescription(toolName, currentDescription, currentSchema);

    if (!fingerprint) {
      // Tool never seen before — pin it now
      this.pinTool(serverName, toolName, currentDescription, currentSchema);
      return {
        match: true,
        serverName,
        toolName,
        expectedHash: currentHash,
        actualHash: currentHash,
      };
    }

    // Update last verified time
    fingerprint.lastVerifiedAt = new Date().toISOString();

    const match = fingerprint.hash === currentHash;

    return {
      match,
      serverName,
      toolName,
      expectedHash: fingerprint.hash,
      actualHash: currentHash,
      drift: match
        ? undefined
        : {
            oldDescription: fingerprint.description,
            newDescription: currentDescription,
          },
    };
  }

  /**
   * Check if a tool has been pinned.
   */
  isPinned(serverName: string, toolName: string): boolean {
    return this.fingerprints.has(this.makeKey(serverName, toolName));
  }

  /**
   * Re-pin a tool (e.g., after admin review approves a description change).
   */
  repinTool(
    serverName: string,
    toolName: string,
    newDescription: string,
    newSchema?: Record<string, unknown>,
  ): ToolFingerprint {
    return this.pinTool(serverName, toolName, newDescription, newSchema);
  }

  /**
   * Clear a fingerprint (for testing / reset).
   */
  clearFingerprint(serverName: string, toolName: string): boolean {
    return this.fingerprints.delete(this.makeKey(serverName, toolName));
  }

  /**
   * Get all trusted fingerprints.
   */
  getAllFingerprints(): ToolFingerprint[] {
    return Array.from(this.fingerprints.values());
  }

  /**
   * Get fingerprints for a specific server.
   */
  getServerFingerprints(serverName: string): ToolFingerprint[] {
    return Array.from(this.fingerprints.values()).filter(
      (fp) => fp.serverName === serverName,
    );
  }

  /**
   * Get a single fingerprint.
   */
  getFingerprint(serverName: string, toolName: string): ToolFingerprint | undefined {
    return this.fingerprints.get(this.makeKey(serverName, toolName));
  }

  /**
   * Total number of pinned tools.
   */
  get count(): number {
    return this.fingerprints.size;
  }
}
