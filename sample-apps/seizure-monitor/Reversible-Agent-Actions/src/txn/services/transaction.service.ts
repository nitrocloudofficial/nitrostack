import { Injectable } from '@nitrostack/core';
import Database from 'better-sqlite3';
import { ulid } from 'ulid';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ReversibilityClass, Transaction, TransactionStatus } from '../types.js';
import { TxnError } from './txn-error.js';

interface TransactionRow {
  id: string;
  label: string;
  actor: string;
  scope: string;
  status: string;
  pivot_seq: number | null;
  opened_at: string;
  closed_at: string | null;
  ttl_seconds: number;
}

function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    label: row.label,
    actor: row.actor,
    scope: JSON.parse(row.scope),
    status: row.status as TransactionStatus,
    pivotSeq: row.pivot_seq,
    openedAt: new Date(row.opened_at),
    closedAt: row.closed_at !== null ? new Date(row.closed_at) : null,
    ttlSeconds: row.ttl_seconds,
  };
}

const LEGAL_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  OPEN: ['COMMITTED', 'ROLLING_BACK'],
  ROLLING_BACK: ['ROLLED_BACK', 'PARTIAL'],
  COMMITTED: [],
  ROLLED_BACK: [],
  PARTIAL: [],
};

/** Manages the lifecycle of transactions, backed by SQLite. */
@Injectable()
export class TransactionService {
  private readonly db: Database.Database;

  constructor() {
    const dbPath = process.env.DB_PATH ?? './data/journal.db';
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        actor TEXT NOT NULL,
        scope TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN',
        pivot_seq INTEGER,
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        ttl_seconds INTEGER NOT NULL DEFAULT 3600
      )
    `);
  }

  /**
   * Opens a new transaction with a generated 'txn_' prefixed id, unless an id
   * is explicitly supplied — only fixtures/tests should do that, for
   * deterministic seeded data; production callers (begin_transaction) never do.
   */
  open(params: { label: string; actor: string; scope: string[]; ttlSeconds: number; id?: string }): Transaction {
    const txn: Transaction = {
      id: params.id ?? `txn_${ulid()}`,
      label: params.label,
      actor: params.actor,
      scope: params.scope,
      status: 'OPEN',
      pivotSeq: null,
      openedAt: new Date(),
      closedAt: null,
      ttlSeconds: params.ttlSeconds,
    };

    this.db
      .prepare(
        `INSERT INTO transactions (id, label, actor, scope, status, pivot_seq, opened_at, closed_at, ttl_seconds)
         VALUES (@id, @label, @actor, @scope, @status, @pivotSeq, @openedAt, @closedAt, @ttlSeconds)`
      )
      .run({
        id: txn.id,
        label: txn.label,
        actor: txn.actor,
        scope: JSON.stringify(txn.scope),
        status: txn.status,
        pivotSeq: txn.pivotSeq,
        openedAt: txn.openedAt.toISOString(),
        closedAt: txn.closedAt,
        ttlSeconds: txn.ttlSeconds,
      });

    return txn;
  }

  /** Fetches a transaction by id, throwing TxnError('TXN_NOT_FOUND') if it doesn't exist. */
  get(id: string): Transaction {
    const row = this.db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(id) as
      | TransactionRow
      | undefined;
    if (!row) {
      throw new TxnError('TXN_NOT_FOUND', id);
    }
    return rowToTransaction(row);
  }

  /** Lists all transactions, optionally filtered by actor. */
  list(actor?: string): Transaction[] {
    const rows = actor
      ? (this.db.prepare(`SELECT * FROM transactions WHERE actor = ? ORDER BY opened_at ASC`).all(actor) as TransactionRow[])
      : (this.db.prepare(`SELECT * FROM transactions ORDER BY opened_at ASC`).all() as TransactionRow[]);
    return rows.map(rowToTransaction);
  }

  /** Validates and applies a status transition, throwing TxnError on illegal transitions. */
  transition(id: string, newStatus: TransactionStatus): void {
    const txn = this.get(id);

    if (txn.status === 'COMMITTED') {
      throw new TxnError('COMMITTED_IMMUTABLE', id);
    }
    if (txn.status === 'ROLLED_BACK' || txn.status === 'PARTIAL') {
      throw new TxnError('ALREADY_FINALIZED', id);
    }
    if (!LEGAL_TRANSITIONS[txn.status].includes(newStatus)) {
      throw new TxnError('ILLEGAL_TRANSITION', `${txn.status} -> ${newStatus}`);
    }

    this.db.prepare(`UPDATE transactions SET status = ? WHERE id = ?`).run(newStatus, id);
  }

  /** Transitions a transaction to COMMITTED and stamps closedAt. */
  commit(id: string): Transaction {
    this.transition(id, 'COMMITTED');
    this.db
      .prepare(`UPDATE transactions SET closed_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), id);
    return this.get(id);
  }

  /** Aggregates step reversibility classes and pivot position for a transaction. */
  reversibilityProfile(txnId: string): {
    total: number;
    byClass: Record<ReversibilityClass, number>;
    pivotSeq: number | null;
  } {
    const rows = this.db
      .prepare(`SELECT reversibility FROM steps WHERE txn_id = ?`)
      .all(txnId) as { reversibility: ReversibilityClass }[];

    const byClass: Record<ReversibilityClass, number> = {
      CLEAN: 0,
      RESTORATIVE: 0,
      TOMBSTONED: 0,
      MITIGABLE: 0,
      TERMINAL: 0,
    };
    for (const row of rows) {
      byClass[row.reversibility]++;
    }

    const txn = this.get(txnId);
    return { total: rows.length, byClass, pivotSeq: txn.pivotSeq };
  }
}
