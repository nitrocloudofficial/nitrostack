// ============================================================================
// Project Aegis — Mock Core Banking Service
// Simulates a legacy high-concurrency relational database instance holding
// sample accounts. Exposes balance check methods with configurable lock
// contention delays and maintains a rolling telemetry history matrix for
// the SVD subspace analyzer.
//
// Decorated with @Injectable() for NitroStack DI integration.
// ============================================================================

import { Injectable } from '@nitrostack/core';
import { createHash, randomUUID } from 'crypto';
import pg from 'pg';
import type {
  BankAccount,
  TelemetryVector,
  TransactionPayload,
  TransactionResult,
} from './types/telemetry.js';

/** Maximum number of telemetry samples retained in the rolling history. */
const TELEMETRY_HISTORY_SIZE = 60;

/** Number of sample accounts to seed in the mock ledger. */
const ACCOUNT_COUNT = 500;

/** Nominal latency range (ms) for balance lookups under normal load. */
const NOMINAL_LATENCY_MIN = 5;
const NOMINAL_LATENCY_MAX = 20;

/** Stressed latency range (ms) simulating lock contention. */
const STRESSED_LATENCY_MIN = 200;
const STRESSED_LATENCY_MAX = 2000;

/**
 * MockCBSService simulates a core banking ledger with:
 * - 500 seeded accounts with randomized balances
 * - Configurable latency injection for stress simulation
 * - Rolling 60-sample telemetry history matrix for SVD baseline
 * - Atomic transaction processing with mutex-style guards
 */
@Injectable()
export class MockCBSService {
  /** In-memory account ledger. */
  private readonly accounts = new Map<string, BankAccount>();

  /** PRODUCTION DEPLOYMENT PATCH (2. Graceful Database Startup): PostgreSQL Pool instance */
  private dbPool: pg.Pool | null = null;

  /** Rolling telemetry history matrix (each row is a TelemetryVector). */
  private readonly telemetryHistory: TelemetryVector[] = [];

  /** Current stress multiplier (1.0 = nominal). */
  private stressMultiplier = 1.0;

  /** Mutex set to prevent concurrent writes to the same account. */
  private readonly writeLocks = new Set<string>();

  /** Map tracking concurrent active reads per account to simulate lock contention latency. */
  private readonly concurrentReads = new Map<string, number>();

  /** Event log buffer for the dashboard to subscribe to. */
  private readonly eventLog: { time: string, message: string, type: 'info' | 'warn' | 'error' | 'success', source: string }[] = [];

  /** Telemetry generation interval handle. */
  private telemetryInterval: ReturnType<typeof setInterval> | null = null;

  /** Server start timestamp for uptime calculation. */
  private readonly startedAt = Date.now();

  /** Request counters for telemetry generation. */
  private _requestCount = 0;
  private _retryCount = 0;
  private _activeThreads = 0;
  private _queuedRequests = 0;

  constructor() {
    this.seedAccounts();
    // PRODUCTION DEPLOYMENT PATCH (2. Graceful Database Startup):
    // Lazy PostgreSQL initialization wrapped in a try-catch block so database connection delays
    // or ECONNREFUSED do not throw unhandled promise rejections or crash the main Node process during health checks.
    this.initDatabaseGracefully().catch((err) => {
      console.warn(`[AEGIS] Graceful DB init non-fatal catch: ${err.message}`);
    });
    this.startTelemetryCollection();
  }

  /**
   * PRODUCTION DEPLOYMENT PATCH (2. Graceful Database Startup):
   * Safely initializes the PostgreSQL database connection pool inside a try-catch block.
   */
  private async initDatabaseGracefully(): Promise<void> {
    try {
      const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
      if (!connectionString) {
        console.log('[AEGIS] No DATABASE_URL provided. Operating in-memory ledger fallback.');
        return;
      }
      this.dbPool = new pg.Pool({
        connectionString,
        connectionTimeoutMillis: 5000,
      });
      const client = await this.dbPool.connect();
      try {
        await client.query('SELECT 1');
        console.log('[AEGIS] PostgreSQL connection established successfully.');
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn(
        `[AEGIS] PRODUCTION PATCH - Graceful DB Startup: PostgreSQL connection delay / ECONNREFUSED (${err.message}). Node process continuing container health check successfully.`
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Account Operations
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieve the balance for a given account.
   * Simulates lock contention with configurable latency based on stress level.
   *
   * @param accountId - The account identifier to query
   * @returns The current balance, or null if the account doesn't exist
   */
  async getBalance(accountId: string): Promise<number | null> {
    this._queuedRequests++;
    this._activeThreads++;
    
    // Increment concurrent reads for this account
    this.concurrentReads.set(accountId, (this.concurrentReads.get(accountId) || 0) + 1);

    try {
      // Simulate lock contention delay based on concurrent readers
      await this.simulateLatency(accountId);

      const account = this.accounts.get(accountId);
      this._requestCount++;
      return account?.balance ?? null;
    } finally {
      // Decrement concurrent reads
      const reads = this.concurrentReads.get(accountId) || 0;
      if (reads <= 1) this.concurrentReads.delete(accountId);
      else this.concurrentReads.set(accountId, reads - 1);

      this._activeThreads--;
      this._queuedRequests = Math.max(0, this._queuedRequests - 1);
    }
  }

  /**
   * Process an atomic debit/credit transaction between two accounts.
   * Uses a simple mutex guard to prevent concurrent modifications.
   *
   * @param payload - Transaction details (from, to, amount)
   * @returns Transaction result with updated balances
   */
  async processTransaction(payload: TransactionPayload): Promise<TransactionResult> {
    const { fromAccountId, toAccountId, amount } = payload;
    const startTime = Date.now();

    this._queuedRequests++;
    this._activeThreads++;

    try {
      // Acquire write locks (simple mutex)
      await this.acquireLock(fromAccountId);
      await this.acquireLock(toAccountId);

      try {
        await this.simulateLatency(fromAccountId);
        await this.simulateLatency(toAccountId);

        const fromAccount = this.accounts.get(fromAccountId);
        const toAccount = this.accounts.get(toAccountId);

        if (!fromAccount || !toAccount) {
          return {
            success: false,
            transactionId: randomUUID(),
            fromBalance: fromAccount?.balance ?? 0,
            toBalance: toAccount?.balance ?? 0,
            processedAt: new Date().toISOString(),
            latencyMs: Date.now() - startTime,
          };
        }

        if (fromAccount.balance < amount) {
          return {
            success: false,
            transactionId: randomUUID(),
            fromBalance: fromAccount.balance,
            toBalance: toAccount.balance,
            processedAt: new Date().toISOString(),
            latencyMs: Date.now() - startTime,
          };
        }

        // Atomic debit/credit
        fromAccount.balance -= amount;
        toAccount.balance += amount;

        this._requestCount++;

        return {
          success: true,
          transactionId: randomUUID(),
          fromBalance: fromAccount.balance,
          toBalance: toAccount.balance,
          processedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
        };
      } finally {
        this.releaseLock(fromAccountId);
        this.releaseLock(toAccountId);
      }
    } finally {
      this._activeThreads--;
      this._queuedRequests = Math.max(0, this._queuedRequests - 1);
    }
  }

  /**
   * Get the list of all account IDs in the ledger.
   */
  getAccountIds(): string[] {
    return Array.from(this.accounts.keys());
  }

  /**
   * Get the total number of accounts.
   */
  getAccountCount(): number {
    return this.accounts.size;
  }

  /**
   * Get the current ledger accounts with their status.
   */
  getLedger(): BankAccount[] {
    return Array.from(this.accounts.values());
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Telemetry
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Returns the rolling telemetry history matrix for SVD baseline computation.
   * Each row is a 4-dimensional TelemetryVector.
   */
  getTelemetryMatrix(): number[][] {
    return this.telemetryHistory.map((v) => [...v]);
  }

  /**
   * Returns the current instantaneous telemetry vector.
   */
  getCurrentVector(): TelemetryVector {
    return this.generateTelemetrySnapshot();
  }

  /**
   * Returns the server uptime in milliseconds.
   */
  getUptimeMs(): number {
    return Date.now() - this.startedAt;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Stress Injection
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Inject artificial stress into the mock CBS.
   * Inflates latency and queue depth to simulate surge conditions.
   *
   * @param multiplier - Stress intensity (1.0 = nominal, 50.0 = extreme)
   */
  injectStress(multiplier: number): void {
    this.stressMultiplier = Math.max(1.0, Math.min(100.0, multiplier));
    // Immediately spike the telemetry counters
    this._queuedRequests += Math.floor(multiplier * 50);
    this._retryCount += Math.floor(multiplier * 20);
  }

  /**
   * Reset to nominal operating parameters.
   */
  resetStress(): void {
    this.stressMultiplier = 1.0;
    this._queuedRequests = 0;
    this._retryCount = 0;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Synthetic Attack Generators
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * 1. Salary Day Balance Storm: High-volume duplicate reads on a single account.
   */
  async triggerSalaryDayStorm(accountId: string = 'ACCT-000100', iterations: number = 100): Promise<void> {
    this.injectStress(5.0); // Spike telemetry
    this.logEvent(`Salary Day Storm initialized on ${accountId}. Injecting ${iterations} concurrent reads.`, 'warn', 'SYS_LOAD');
    const promises = [];
    for (let i = 0; i < iterations; i++) {
      promises.push(this.getBalance(accountId).catch(() => null));
    }
    await Promise.all(promises);
    this.logEvent(`Salary Day Storm simulation completed.`, 'info', 'SYS_LOAD');
  }

  /**
   * 2. Unique P2P Transfer Surge: High-volume unique writes across hundreds of account pairs.
   */
  async triggerTransferSurge(iterations: number = 50): Promise<void> {
    this.injectStress(8.0);
    this.logEvent(`P2P Transfer Surge initialized. Firing ${iterations} random writes.`, 'warn', 'SYS_LOAD');
    const promises = [];
    for (let i = 0; i < iterations; i++) {
      const from = `ACCT-${String(100 + (i % 50)).padStart(6, '0')}`;
      const to = `ACCT-${String(200 + (i % 50)).padStart(6, '0')}`;
      promises.push(
        this.processTransaction({
          fromAccountId: from,
          toAccountId: to,
          amount: 1.0,
          currency: 'USD',
          timestamp: new Date().toISOString()
        }).catch(() => null)
      );
    }
    await Promise.all(promises);
    this.logEvent(`P2P Transfer Surge simulation completed.`, 'info', 'SYS_LOAD');
  }

  /**
   * 3. EOD Batch Collision: Heavy background processing clogging teller terminals.
   */
  async triggerEodBatchCollision(): Promise<void> {
    this.injectStress(10.0);
    this.logEvent(`EOD Batch Collision initialized. Acquiring long-lived background locks.`, 'warn', 'SYS_LOAD');
    // Simulate long-running DB locks by grabbing locks and holding them
    const promises = [];
    for (let i = 0; i < 20; i++) {
      const accountId = `ACCT-${String(100 + i).padStart(6, '0')}`;
      promises.push(
        (async () => {
          await this.acquireLock(accountId);
          await new Promise((r) => setTimeout(r, 2000)); // Hold lock for 2 seconds
          this.releaseLock(accountId);
        })()
      );
    }
    await Promise.all(promises);
    this.logEvent(`EOD Batch Collision simulation completed.`, 'info', 'SYS_LOAD');
  }

  /**
   * Returns the current stress multiplier.
   */
  getStressMultiplier(): number {
    return this.stressMultiplier;
  }

  /**
   * Clean up resources (telemetry interval).
   */
  destroy(): void {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private Internals
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Seeds the ledger with ACCOUNT_COUNT sample accounts.
   */
  private seedAccounts(): void {
    for (let i = 0; i < ACCOUNT_COUNT; i++) {
      const accountId = `ACCT-${String(i).padStart(6, '0')}`;
      const balance = Math.round((Math.random() * 100_000 + 1_000) * 100) / 100;
      const holderName = `Account Holder ${i}`;

      this.accounts.set(accountId, {
        accountId,
        balance,
        currency: 'USD',
        holderName,
        createdAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Starts periodic telemetry collection at 1-second intervals.
   */
  private startTelemetryCollection(): void {
    // Seed initial baseline with nominal telemetry
    for (let i = 0; i < TELEMETRY_HISTORY_SIZE; i++) {
      this.telemetryHistory.push(this.generateNominalVector());
    }

    this.telemetryInterval = setInterval(() => {
      const snapshot = this.generateTelemetrySnapshot();
      this.telemetryHistory.push(snapshot);

      // Maintain rolling window
      while (this.telemetryHistory.length > TELEMETRY_HISTORY_SIZE) {
        this.telemetryHistory.shift();
      }

      // Decay stress-induced counters naturally
      if (this.stressMultiplier > 1.0) {
        this._retryCount = Math.max(0, this._retryCount - 2);
      }
    }, 1000);

    if (this.telemetryInterval.unref) {
      this.telemetryInterval.unref();
    }
  }

  /**
   * Generate a nominal (healthy) telemetry vector with slight natural variance.
   */
  private generateNominalVector(): TelemetryVector {
    return [
      2 + Math.random() * 3,                // queueDepth: 2–5
      15 + Math.random() * 10,               // threadOccupancy: 15–25%
      10 + Math.random() * 8,                // dbSaturation: 10–18%
      0.5 + Math.random() * 1.5,             // retryRate: 0.5–2.0 req/s
    ];
  }

  /**
   * Generate the current telemetry snapshot based on actual system state.
   */
  private generateTelemetrySnapshot(): TelemetryVector {
    const stressFactor = this.stressMultiplier;

    const queueDepth = Math.max(0,
      (this._queuedRequests + Math.random() * 3) * stressFactor
    );

    const threadOccupancy = Math.min(100,
      (this._activeThreads * 5 + 15 + Math.random() * 10) * Math.sqrt(stressFactor)
    );

    const dbSaturation = Math.min(100,
      (10 + Math.random() * 8) * stressFactor
    );

    const retryRate = Math.max(0,
      (this._retryCount + Math.random() * 2) * stressFactor
    );

    return [queueDepth, threadOccupancy, dbSaturation, retryRate];
  }

  /**
   * Simulate database lock contention latency.
   * Dynamically scales delay based on concurrent reads to realistically model lock starvation.
   */
  private async simulateLatency(accountId: string): Promise<void> {
    const isStressed = this.stressMultiplier > 1.5;
    const baseMin = isStressed ? STRESSED_LATENCY_MIN : NOMINAL_LATENCY_MIN;
    const baseMax = isStressed ? STRESSED_LATENCY_MAX : NOMINAL_LATENCY_MAX;
    const baseLatency = baseMin + Math.random() * (baseMax - baseMin);

    const concurrent = this.concurrentReads.get(accountId) || 0;
    const factor = isStressed ? 0.5 : 0.05; 
    const delay = baseLatency * (1 + concurrent * factor);

    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Adds an event to the global event log buffer.
   */
  logEvent(message: string, type: 'info' | 'warn' | 'error' | 'success', source: string) {
    this.eventLog.push({
      time: new Date().toLocaleTimeString(),
      message,
      type,
      source
    });
    // Keep last 100 events
    if (this.eventLog.length > 100) this.eventLog.shift();
  }

  /**
   * Retrieves the current event log.
   */
  getEventLog() {
    return this.eventLog;
  }

  /**
   * Simple mutex-style lock acquisition with timeout.
   */
  private async acquireLock(accountId: string): Promise<void> {
    const maxWait = 5000;
    const startTime = Date.now();

    while (this.writeLocks.has(accountId)) {
      if (Date.now() - startTime > maxWait) {
        throw new Error(`Lock acquisition timeout for account ${accountId}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    this.writeLocks.add(accountId);
  }

  /**
   * Release a write lock on an account.
   */
  private releaseLock(accountId: string): void {
    this.writeLocks.delete(accountId);
  }
}
