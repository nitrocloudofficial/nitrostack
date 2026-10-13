/**
 * AuditLogService — append-only record of officer decisions.
 *
 * Feeds Frontend B's audit trail ("who decided what, when, and why") and backs
 * the closing line of the pitch: "a paper trail regulators trust".
 *
 * Append-only by design: there is no update or delete method. A decision log you
 * can edit is not evidence.
 */
import { Injectable } from '@nitrostack/core';
import type { AuditTrail, DecisionRecord } from '../../../contracts/index.js';

@Injectable()
export class AuditLogService {
  private readonly entries: DecisionRecord[] = [];

  /** Append a decision. Called from the application.decided listener. */
  record(entry: DecisionRecord): void {
    this.entries.push(entry);
  }

  /**
   * The trail, newest first.
   *
   * @param applicationId narrow to a single application; omit for everything.
   */
  getTrail(applicationId?: string): AuditTrail {
    const filtered = applicationId
      ? this.entries.filter((entry) => entry.applicationId === applicationId)
      : [...this.entries];

    const ordered = filtered.sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));

    return { entries: ordered, total: ordered.length };
  }

  getLatestFor(applicationId: string): DecisionRecord | undefined {
    return this.getTrail(applicationId).entries[0];
  }

  size(): number {
    return this.entries.length;
  }

  /** Test-only. */
  clear(): void {
    this.entries.length = 0;
  }
}
