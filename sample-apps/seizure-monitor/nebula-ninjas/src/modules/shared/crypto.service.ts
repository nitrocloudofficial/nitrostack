/**
 * Sentinel Gateway — Cryptographic Service
 * 
 * Provides SHA-256 hashing for:
 * - Tool description fingerprinting (name + description + schema)
 * - Ledger entry chain linking (entry data + previous hash)
 * - Generic content hashing (inputs, outputs)
 */

import { createHash } from 'crypto';
import { Injectable } from '@nitrostack/core';
import type { LedgerEntry } from './types.js';

@Injectable()
export class CryptoService {
  /**
   * Hash a tool's identity: name + description + schema.
   * This is the fingerprint that gets pinned on first discovery
   * and re-verified on every subsequent call.
   */
  hashToolDescription(name: string, description: string, schema?: Record<string, unknown>): string {
    const payload = JSON.stringify({
      name: name.trim().toLowerCase(),
      description: description.trim(),
      schema: schema ? this.sortObject(schema) : null,
    });
    return this.sha256(payload);
  }

  /**
   * Hash a ledger entry by combining its data with the previous entry's hash.
   * This creates the chain — if any entry is tampered with, all subsequent
   * hashes become invalid.
   */
  hashLedgerEntry(entry: Omit<LedgerEntry, 'hash'>, prevHash: string): string {
    const payload = JSON.stringify({
      id: entry.id,
      index: entry.index,
      timestamp: entry.timestamp,
      agentId: entry.agentId,
      serverName: entry.serverName,
      toolName: entry.toolName,
      action: entry.action,
      status: entry.status,
      details: entry.details,
      inputHash: entry.inputHash || '',
      outputHash: entry.outputHash || '',
      prevHash,
    });
    return this.sha256(payload);
  }

  /**
   * Verify the integrity of the entire ledger chain.
   * Returns the index of the first broken link, or -1 if the chain is valid.
   */
  verifyChain(entries: LedgerEntry[]): { valid: boolean; brokenAtIndex: number } {
    if (entries.length === 0) {
      return { valid: true, brokenAtIndex: -1 };
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedPrevHash = i === 0 ? '0'.repeat(64) : entries[i - 1].hash;

      // Check that prevHash links correctly
      if (entry.prevHash !== expectedPrevHash) {
        return { valid: false, brokenAtIndex: i };
      }

      // Re-compute the hash and verify
      const computedHash = this.hashLedgerEntry(entry, entry.prevHash);
      if (entry.hash !== computedHash) {
        return { valid: false, brokenAtIndex: i };
      }
    }

    return { valid: true, brokenAtIndex: -1 };
  }

  /**
   * Hash arbitrary content (for input/output hashing).
   */
  hashContent(content: unknown): string {
    const payload = typeof content === 'string' ? content : JSON.stringify(content);
    return this.sha256(payload);
  }

  /**
   * Generate a short hash preview (first 12 chars) for display.
   */
  shortHash(hash: string): string {
    return hash.substring(0, 12);
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private sha256(data: string): string {
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * Deep-sort object keys for deterministic hashing.
   * Without this, { a: 1, b: 2 } and { b: 2, a: 1 } would produce different hashes.
   */
  private sortObject(obj: Record<string, unknown>): Record<string, unknown> {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.sortObject(item as Record<string, unknown>)) as unknown as Record<string, unknown>;

    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      const value = obj[key];
      sorted[key] = typeof value === 'object' && value !== null
        ? this.sortObject(value as Record<string, unknown>)
        : value;
    }
    return sorted;
  }
}
