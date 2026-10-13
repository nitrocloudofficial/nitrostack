import { Injectable } from '@nitrostack/core';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../shared/database.service.js';

// ─── Row type ─────────────────────────────────────────────────────────────────

export interface ExceptionRecord {
  exceptionId:   string;
  workflowId:    string;
  invoiceNumber: string | null;
  reason:        string;
  discrepancies: string[];
  status:        'flagged' | 'under_review' | 'resolved' | 'dismissed';
  createdAt:     string;
  resolvedAt:    string | null;
  data?:         unknown;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ deps: [DatabaseService] })
export class ExceptionService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Log a new exception to the SQLite `exceptions` table.
   * Returns the created record (including the generated exceptionId).
   */
  async flag(
    workflowId:    string,
    reason:        string,
    data?:         unknown,
    invoiceNumber?: string,
  ): Promise<ExceptionRecord> {
    const exceptionId   = randomUUID();
    const discrepancies = this.extractDiscrepancies(data);
    const now           = new Date().toISOString();

    const invNum =
      invoiceNumber ??
      (data !== null && typeof data === 'object' && 'invoiceNumber' in data
        ? String((data as Record<string, unknown>)['invoiceNumber'])
        : null);

    await this.database.sql(
      `INSERT INTO exceptions
         (workflow_id, invoice_number, reason, discrepancies, status, created_at)
       VALUES (?, ?, ?, ?, 'flagged', ?)`,
      workflowId,
      invNum,
      reason,
      JSON.stringify(discrepancies),
      now,
    );

    return {
      exceptionId,
      workflowId,
      invoiceNumber:  invNum,
      reason,
      discrepancies,
      status:         'flagged',
      createdAt:      now,
      resolvedAt:     null,
      data,
    };
  }

  /** Update exception status (for resolution workflows). */
  async updateStatus(
    workflowId: string,
    newStatus:  'under_review' | 'resolved' | 'dismissed',
  ): Promise<void> {
    const resolvedAt = newStatus === 'resolved' ? new Date().toISOString() : null;
    await this.database.sql(
      `UPDATE exceptions
       SET status = ?, resolved_at = ?
       WHERE workflow_id = ? AND status IN ('flagged','under_review')`,
      newStatus, resolvedAt, workflowId,
    );
  }

  /** Get all open exceptions (flagged or under_review). */
  async getOpen(limit = 50): Promise<ExceptionRecord[]> {
    const rows = (await this.database.sql(
      `SELECT * FROM exceptions
       WHERE status IN ('flagged','under_review')
       ORDER BY created_at DESC LIMIT ?`,
      limit,
    )) as Record<string, unknown>[];
    return rows.map(this.rowToRecord);
  }

  /** Get exceptions for a specific workflow run. */
  async getByWorkflow(workflowId: string): Promise<ExceptionRecord[]> {
    const rows = (await this.database.sql(
      `SELECT * FROM exceptions WHERE workflow_id = ? ORDER BY created_at`,
      workflowId,
    )) as Record<string, unknown>[];
    return rows.map(this.rowToRecord);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private extractDiscrepancies(data: unknown): string[] {
    if (!data || typeof data !== 'object') return [];
    const d = data as Record<string, unknown>;
    if (Array.isArray(d['discrepancies'])) {
      return d['discrepancies'].filter((x): x is string => typeof x === 'string');
    }
    return [];
  }

  private rowToRecord(row: Record<string, unknown>): ExceptionRecord {
    return {
      exceptionId:   String(row['id'] ?? ''),
      workflowId:    String(row['workflow_id'] ?? ''),
      invoiceNumber: row['invoice_number'] as string | null,
      reason:        String(row['reason'] ?? ''),
      discrepancies: JSON.parse(String(row['discrepancies'] ?? '[]')) as string[],
      status:        (row['status'] as ExceptionRecord['status']) ?? 'flagged',
      createdAt:     String(row['created_at'] ?? ''),
      resolvedAt:    row['resolved_at'] as string | null,
    };
  }
}
