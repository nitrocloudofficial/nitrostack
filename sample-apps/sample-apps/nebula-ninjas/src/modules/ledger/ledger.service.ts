/**
 * Sentinel Gateway — Ledger Service
 * 
 * Append-only, hash-chained provenance ledger.
 * Every tool call, block, policy change, and admin action is recorded here.
 * Each entry stores hash(prev_entry), making the chain tamper-evident.
 * 
 * Storage: in-memory array with optional JSON file persistence on shutdown.
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nitrostack/core';
import { randomUUID } from 'crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { CryptoService } from '../shared/crypto.service.js';
import type {
  LedgerEntry,
  LedgerAction,
  LedgerStatus,
  ChainVerificationResult,
  LedgerStats,
} from '../shared/types.js';

const GENESIS_HASH = '0'.repeat(64);
const DATA_DIR = join(process.cwd(), 'data');
const LEDGER_FILE = join(DATA_DIR, 'ledger.json');

@Injectable({ deps: [CryptoService] })
export class LedgerService implements OnModuleInit, OnModuleDestroy {
  private entries: LedgerEntry[] = [];
  private listeners: Array<(entry: LedgerEntry) => void> = [];

  constructor(private readonly crypto: CryptoService) {}

  async onModuleInit() {
    // Load persisted ledger if it exists
    try {
      if (existsSync(LEDGER_FILE)) {
        const data = readFileSync(LEDGER_FILE, 'utf-8');
        this.entries = JSON.parse(data);
        console.error(`📒 Ledger loaded: ${this.entries.length} entries from disk`);
      } else {
        console.error('📒 Ledger initialized: fresh start (no persisted data)');
      }
    } catch {
      console.error('📒 Ledger initialized: fresh start (failed to load persisted data)');
      this.entries = [];
    }
  }

  async onModuleDestroy() {
    this.persist();
  }

  /**
   * Append a new entry to the ledger.
   * Computes chain hash automatically.
   * Returns the created entry.
   */
  append(params: {
    agentId: string;
    serverName: string;
    toolName: string;
    action: LedgerAction;
    status: LedgerStatus;
    details: string;
    inputHash?: string;
    outputHash?: string;
  }): LedgerEntry {
    const index = this.entries.length;
    const prevHash = index === 0 ? GENESIS_HASH : this.entries[index - 1].hash;

    const entryWithoutHash: Omit<LedgerEntry, 'hash'> = {
      id: randomUUID(),
      index,
      timestamp: new Date().toISOString(),
      agentId: params.agentId,
      serverName: params.serverName,
      toolName: params.toolName,
      action: params.action,
      status: params.status,
      details: params.details,
      inputHash: params.inputHash,
      outputHash: params.outputHash,
      prevHash,
    };

    const hash = this.crypto.hashLedgerEntry(entryWithoutHash, prevHash);
    const entry: LedgerEntry = { ...entryWithoutHash, hash };

    this.entries.push(entry);

    // Notify listeners (for WebSocket/live feed)
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch {
        // Don't let listener errors break the ledger
      }
    }

    return entry;
  }

  /**
   * Get all ledger entries.
   */
  getAll(): LedgerEntry[] {
    return [...this.entries];
  }

  /**
   * Get the last N entries (for live feed).
   */
  getLatest(count: number): LedgerEntry[] {
    return this.entries.slice(-count);
  }

  /**
   * Get entries by index range.
   */
  getRange(from: number, to: number): LedgerEntry[] {
    return this.entries.slice(from, to + 1);
  }

  /**
   * Get a single entry by ID.
   */
  getById(id: string): LedgerEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  /**
   * Filter entries by agent.
   */
  getByAgent(agentId: string): LedgerEntry[] {
    return this.entries.filter((e) => e.agentId === agentId);
  }

  /**
   * Filter entries by server.
   */
  getByServer(serverName: string): LedgerEntry[] {
    return this.entries.filter((e) => e.serverName === serverName);
  }

  /**
   * Filter entries by action type.
   */
  getByAction(action: LedgerAction): LedgerEntry[] {
    return this.entries.filter((e) => e.action === action);
  }

  /**
   * Filter entries by status.
   */
  getByStatus(status: LedgerStatus): LedgerEntry[] {
    return this.entries.filter((e) => e.status === status);
  }

  /**
   * Verify the integrity of the entire chain.
   */
  verifyIntegrity(): ChainVerificationResult {
    const result = this.crypto.verifyChain(this.entries);

    if (result.valid) {
      return {
        valid: true,
        totalEntries: this.entries.length,
        message: `✅ Chain integrity verified — ${this.entries.length} entries, all hashes valid.`,
      };
    }

    return {
      valid: false,
      totalEntries: this.entries.length,
      brokenAtIndex: result.brokenAtIndex,
      brokenEntry: this.entries[result.brokenAtIndex],
      message: `🛑 TAMPERING DETECTED — chain broken at entry #${result.brokenAtIndex} (${this.entries[result.brokenAtIndex]?.id || 'unknown'}).`,
    };
  }

  /**
   * Get summary statistics for the dashboard.
   */
  getStats(): LedgerStats {
    const chainResult = this.crypto.verifyChain(this.entries);

    return {
      totalEntries: this.entries.length,
      totalCalls: this.entries.filter((e) => e.action === 'CALL').length,
      totalBlocked: this.entries.filter((e) => e.status === 'BLOCKED').length,
      totalAllowed: this.entries.filter((e) => e.status === 'ALLOWED').length,
      driftDetections: this.entries.filter((e) => e.action === 'BLOCK_DRIFT').length,
      policyDenials: this.entries.filter((e) => e.action === 'BLOCK_POLICY').length,
      injectionFlags: this.entries.filter((e) => e.action === 'BLOCK_INJECTION').length,
      chainValid: chainResult.valid,
    };
  }

  /**
   * Subscribe to new ledger entries (for real-time feed).
   */
  onNewEntry(listener: (entry: LedgerEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * DANGEROUS: Directly mutate an entry (used ONLY by the attack simulator
   * to demonstrate tamper detection). Never exposed via any tool.
   */
  _unsafeMutateEntry(index: number, field: string, value: string): boolean {
    if (index < 0 || index >= this.entries.length) return false;
    (this.entries[index] as unknown as Record<string, unknown>)[field] = value;
    return true;
  }

  /**
   * Reset the ledger completely (wipe all entries and disk persistence).
   */
  clearLedger(): void {
    this.entries = [];
    try {
      if (existsSync(LEDGER_FILE)) {
        writeFileSync(LEDGER_FILE, JSON.stringify([], null, 2));
      }
    } catch {
      // ignore
    }
  }

  /**
   * Repair the chain hashes (used when resetting after a simulated tampering attack).
   */
  repairChain(): void {
    let prevHash = GENESIS_HASH;
    for (let i = 0; i < this.entries.length; i++) {
      this.entries[i].prevHash = prevHash;
      const entryWithoutHash = { ...this.entries[i] };
      delete (entryWithoutHash as { hash?: string }).hash;
      const newHash = this.crypto.hashLedgerEntry(entryWithoutHash, prevHash);
      this.entries[i].hash = newHash;
      prevHash = newHash;
    }
  }

  /**
   * Get the total number of entries.
   */
  get length(): number {
    return this.entries.length;
  }

  /**
   * Persist ledger to disk.
   */
  private persist(): void {
    try {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
      }
      writeFileSync(LEDGER_FILE, JSON.stringify(this.entries, null, 2));
      console.error(`📒 Ledger persisted: ${this.entries.length} entries to ${LEDGER_FILE}`);
    } catch (err) {
      console.error('📒 Failed to persist ledger:', err);
    }
  }
}
