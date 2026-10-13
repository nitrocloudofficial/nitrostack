import { Injectable } from '@nitrostack/core';
import { createHash } from 'crypto';
import { DatabaseService } from './database.service.js';

/**
 * AuditLogService — append-only audit trail for every tool call.
 *
 * Rules (enforced by convention — SQLite has no row-level triggers here):
 *  - NEVER call UPDATE or DELETE on audit_log rows
 *  - Always call log() at the END of a tool call so duration_ms is accurate
 *  - Input/output are stored as SHA-256 hashes — never raw data in the log
 */
@Injectable({ deps: [DatabaseService] })
export class AuditLogService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Append a single audit entry.
   * Non-throwing — a logging failure must never crash a workflow.
   */
  async log(entry: {
    workflowId?:  string;
    toolName:     string;
    input:        unknown;
    output?:      unknown;
    actor?:       string;
    status?:      'success' | 'error';
    errorMsg?:    string;
    durationMs?:  number;
  }): Promise<void> {
    try {
      await this.database.sql(
        `INSERT INTO audit_log
           (workflow_id, tool_name, input_hash, output_hash, actor, status, error_msg, duration_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        entry.workflowId  ?? null,
        entry.toolName,
        this.hash(entry.input),
        entry.output !== undefined ? this.hash(entry.output) : null,
        entry.actor     ?? 'system',
        entry.status    ?? 'success',
        entry.errorMsg  ?? null,
        entry.durationMs ?? null,
      );
    } catch (err) {
      // Silently swallow — audit failure must never surface to the caller
      console.error('[AuditLogService] Failed to write audit entry:', err);
    }
  }

  /**
   * Retrieve the full audit trail for a workflow run.
   */
  async getByWorkflow(workflowId: string): Promise<AuditEntry[]> {
    return (await this.database.sql(
      `SELECT * FROM audit_log WHERE workflow_id = ? ORDER BY created_at`,
      workflowId,
    )) as AuditEntry[];
  }

  /**
   * Retrieve audit entries for a single tool (most recent first).
   */
  async getByTool(toolName: string, limit = 50): Promise<AuditEntry[]> {
    return (await this.database.sql(
      `SELECT * FROM audit_log WHERE tool_name = ? ORDER BY created_at DESC LIMIT ?`,
      toolName,
      limit,
    )) as AuditEntry[];
  }

  private hash(data: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .slice(0, 16); // short prefix — enough for correlation, not for verification
  }
}

// ─── Row type ────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id:          number;
  workflow_id: string | null;
  tool_name:   string;
  input_hash:  string;
  output_hash: string | null;
  actor:       string;
  status:      'success' | 'error';
  error_msg:   string | null;
  duration_ms: number | null;
  created_at:  string;
}
