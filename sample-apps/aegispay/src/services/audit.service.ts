// audit.service.ts — In-memory hash-chained audit log.
//
// Every tool call outcome (allowed or blocked) is appended here. Guard-level
// rejections log directly via this service since the AuditInterceptor only
// wraps successful handler invocation and never sees a guard's `false`.
//
// No persistence, no external I/O — in-memory only, per CLAUDE.md §1.

import { Injectable } from '@nitrostack/core';
import { createHash } from 'node:crypto';
import type { AuditEntry } from '../types/contracts.js';

const GENESIS_HASH = '0'.repeat(64);

@Injectable()
export class AuditService {
  private entries: AuditEntry[] = [];
  private seq = 1;
  private prevHash = GENESIS_HASH;

  log(input: { tool: string; subject: string | null; outcome: 'allowed' | 'blocked'; reason?: string }): AuditEntry {
    const fields: Omit<AuditEntry, 'hash'> = {
      seq: this.seq,
      timestamp: new Date().toISOString(),
      tool: input.tool,
      subject: input.subject,
      outcome: input.outcome,
      reason: input.reason,
      prevHash: this.prevHash,
    };

    const hash = createHash('sha256')
      .update(this.prevHash + JSON.stringify(fields))
      .digest('hex');

    const entry: AuditEntry = { ...fields, hash };

    this.entries.push(entry);
    this.seq += 1;
    this.prevHash = hash;

    return entry;
  }

  getTrail(): AuditEntry[] {
    return [...this.entries];
  }
}
