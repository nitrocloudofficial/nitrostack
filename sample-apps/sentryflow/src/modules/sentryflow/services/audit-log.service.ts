/**
 * AuditLogService
 * 
 * Append-only, hashed audit trail for all tool calls, signal evaluations, and guard decisions.
 * Provides tamper-evidence and PII redaction for compliance.
 */

import { Injectable } from '@nitrostack/core';
import * as crypto from 'crypto';
import { AuditLogEntry } from '../sentryflow.types.js';

@Injectable()
export class AuditLogService {
  private log: AuditLogEntry[] = [];
  private lastHash: string = '';

  constructor() {
    // Initialize with a genesis hash
    this.lastHash = this.hashEntry({
      timestamp: new Date(0).toISOString(),
      orderId: 'genesis',
      action: 'audit',
      previousHash: '',
    });
  }

  /**
   * Record an audit entry (tool call, signal evaluation, guard decision).
   * Automatically redacts PII and chains hashes for tamper-evidence.
   */
  record(entry: {
    orderId: string;
    action: 'audit' | 'dispatch' | 'guard_block';
    result?: any;
    input?: any;
    guardDecision?: boolean;
  }): AuditLogEntry {
    const timestamp = new Date().toISOString();

    // Redact PII from result/input before logging
    const redactedResult = this.redactPII(entry.result);
    const redactedInput = this.redactPII(entry.input);

    const logEntry: AuditLogEntry = {
      timestamp,
      orderId: entry.orderId,
      action: entry.action,
      result: redactedResult,
      input: redactedInput,
      guardDecision: entry.guardDecision,
      entryHash: '', // Will be computed below
      previousHash: this.lastHash,
    };

    // Compute hash of this entry (including previous hash for chain)
    logEntry.entryHash = this.hashEntry(logEntry);

    // Append to log
    this.log.push(logEntry);
    this.lastHash = logEntry.entryHash;

    return logEntry;
  }

  /**
   * Get the full audit trail for an order
   */
  getOrderAudit(orderId: string): AuditLogEntry[] {
    return this.log.filter(entry => entry.orderId === orderId);
  }

  /**
   * Verify the integrity of the audit trail (check hash chain)
   */
  verifyIntegrity(): boolean {
    let previousHash = this.hashEntry({
      timestamp: new Date(0).toISOString(),
      orderId: 'genesis',
      action: 'audit',
      previousHash: '',
    });

    for (const entry of this.log) {
      if (entry.previousHash !== previousHash) {
        return false;
      }
      previousHash = entry.entryHash;
    }

    return true;
  }

  /**
   * Get the last N entries (for display in Q&A)
   */
  getRecentEntries(count: number = 10): AuditLogEntry[] {
    return this.log.slice(-count);
  }

  /**
   * Private: hash an entry (excluding the entryHash field itself)
   */
  private hashEntry(entry: Omit<AuditLogEntry, 'entryHash'>): string {
    const payload = JSON.stringify({
      timestamp: entry.timestamp,
      orderId: entry.orderId,
      action: entry.action,
      result: entry.result,
      input: entry.input,
      guardDecision: entry.guardDecision,
      previousHash: entry.previousHash,
    });

    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Private: redact PII from objects (buyer name, address, email)
   */
  private redactPII(obj: any): any {
    if (!obj) return obj;

    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactPII(item));
    }

    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Redact known PII fields
      if (
        key.toLowerCase().includes('name') ||
        key.toLowerCase().includes('address') ||
        key.toLowerCase().includes('email') ||
        key.toLowerCase().includes('phone')
      ) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        redacted[key] = this.redactPII(value);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }
}
