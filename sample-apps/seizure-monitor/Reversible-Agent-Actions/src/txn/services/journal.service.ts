import { Injectable } from '@nitrostack/core';
import Database from 'better-sqlite3';
import { ulid } from 'ulid';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Step, StepStatus } from '../types.js';

interface StepRow {
  id: string;
  txn_id: string;
  seq: number;
  server: string;
  tool_name: string;
  input_json: string;
  output_json: string | null;
  prior_state_json: string | null;
  resource_ref: string | null;
  resource_version: string | null;
  reversibility: string;
  status: string;
  compensation_key: string;
  compensation_note: string | null;
  executed_at: string;
}

function rowToStep(row: StepRow): Step {
  return {
    id: row.id,
    txnId: row.txn_id,
    seq: row.seq,
    server: row.server,
    toolName: row.tool_name,
    input: JSON.parse(row.input_json),
    output: row.output_json !== null ? JSON.parse(row.output_json) : null,
    priorState: row.prior_state_json !== null ? JSON.parse(row.prior_state_json) : null,
    resourceRef: row.resource_ref,
    resourceVersion: row.resource_version,
    reversibility: row.reversibility as Step['reversibility'],
    executedAt: new Date(row.executed_at),
    status: row.status as StepStatus,
    compensationKey: row.compensation_key,
    compensationNote: row.compensation_note,
  };
}

/** Persists the append-only journal of executed steps, backed by SQLite. */
@Injectable()
export class JournalService {
  private readonly db: Database.Database;

  constructor() {
    const dbPath = process.env.DB_PATH ?? './data/journal.db';
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS steps (
        id TEXT PRIMARY KEY,
        txn_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        server TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        input_json TEXT NOT NULL,
        output_json TEXT,
        prior_state_json TEXT,
        resource_ref TEXT,
        resource_version TEXT,
        reversibility TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'EXECUTED',
        compensation_key TEXT NOT NULL UNIQUE,
        compensation_note TEXT,
        executed_at TEXT NOT NULL,
        UNIQUE(txn_id, seq)
      )
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_steps_txn_seq ON steps(txn_id, seq DESC)
    `);
  }

  /**
   * Inserts a new step, generating its id and executedAt. compensationKey is
   * generated too unless explicitly supplied — only fixtures/tests should ever
   * pass one, to make seeded data deterministic; production callers (the
   * interceptor) never do, preserving "generated at append, never at rollback."
   */
  append(data: Omit<Step, 'id' | 'executedAt' | 'compensationKey'> & { compensationKey?: string }): Step {
    const step: Step = {
      ...data,
      id: `step_${ulid()}`,
      executedAt: new Date(),
      compensationKey: data.compensationKey ?? ulid(),
    };

    this.db
      .prepare(
        `INSERT INTO steps (
          id, txn_id, seq, server, tool_name, input_json, output_json, prior_state_json,
          resource_ref, resource_version, reversibility, status, compensation_key,
          compensation_note, executed_at
        ) VALUES (@id, @txnId, @seq, @server, @toolName, @inputJson, @outputJson, @priorStateJson,
          @resourceRef, @resourceVersion, @reversibility, @status, @compensationKey,
          @compensationNote, @executedAt)`
      )
      .run({
        id: step.id,
        txnId: step.txnId,
        seq: step.seq,
        server: step.server,
        toolName: step.toolName,
        inputJson: JSON.stringify(step.input),
        outputJson: step.output !== null && step.output !== undefined ? JSON.stringify(step.output) : null,
        priorStateJson: step.priorState !== null && step.priorState !== undefined ? JSON.stringify(step.priorState) : null,
        resourceRef: step.resourceRef,
        resourceVersion: step.resourceVersion,
        reversibility: step.reversibility,
        status: step.status,
        compensationKey: step.compensationKey,
        compensationNote: step.compensationNote,
        executedAt: step.executedAt.toISOString(),
      });

    return step;
  }

  /** Returns the next monotonic sequence number for a transaction, starting at 1. */
  nextSeq(txnId: string): number {
    const row = this.db
      .prepare(`SELECT MAX(seq) AS maxSeq FROM steps WHERE txn_id = ?`)
      .get(txnId) as { maxSeq: number | null };
    return (row?.maxSeq ?? 0) + 1;
  }

  /** Returns all steps for a transaction in ascending sequence order. */
  steps(txnId: string): Step[] {
    const rows = this.db
      .prepare(`SELECT * FROM steps WHERE txn_id = ? ORDER BY seq ASC`)
      .all(txnId) as StepRow[];
    return rows.map(rowToStep);
  }

  /** Returns all steps for a transaction in descending sequence order (LIFO rollback path). */
  stepsDescending(txnId: string): Step[] {
    const rows = this.db
      .prepare(`SELECT * FROM steps WHERE txn_id = ? ORDER BY seq DESC`)
      .all(txnId) as StepRow[];
    return rows.map(rowToStep);
  }

  /** Updates a step's status and, optionally, its compensation note. */
  mark(stepId: string, status: StepStatus, note?: string): void {
    this.db
      .prepare(`UPDATE steps SET status = ?, compensation_note = ? WHERE id = ?`)
      .run(status, note ?? null, stepId);
  }

  /** Sets the transaction's pivotSeq to this step's seq, only if not already set. */
  markPivotIfUnset(txnId: string, seq: number): void {
    this.db
      .prepare(`UPDATE transactions SET pivot_seq = ? WHERE id = ? AND pivot_seq IS NULL`)
      .run(seq, txnId);
  }
}
