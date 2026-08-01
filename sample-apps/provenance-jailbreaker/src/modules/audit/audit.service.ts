import { Injectable } from '@nitrostack/core';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service.js';
import { AuditEntryModel, type AuditEntryDocument } from './schemas/audit-entry.schema.js';

export interface AuditToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface AuditResult {
  authorized: boolean;
  confidence?: number;
  evidence?: string;
}

export interface AuditEntry {
  sequence: number;
  timestamp: string;
  action: string;
  actor: string;
  scope: string;
  toolCall: AuditToolCall;
  result: AuditResult;
  hash: string;
  prevHash: string;
}

export interface ChainVerification {
  chain_valid: boolean;
  break_at_sequence?: number;
  total_entries: number;
  errors: string[];
}

const GENESIS_HASH = 'GENESIS';

function toPlainEntry(doc: AuditEntryDocument): AuditEntry {
  return {
    sequence: doc.sequence,
    timestamp: doc.timestamp,
    action: doc.action,
    actor: doc.actor,
    scope: doc.scope,
    toolCall: doc.toolCall,
    result: doc.result,
    hash: doc.hash,
    prevHash: doc.prevHash
  };
}

function computeHash(entry: Omit<AuditEntry, 'hash'>): string {
  const hashInput = JSON.stringify({
    sequence: entry.sequence,
    timestamp: entry.timestamp,
    action: entry.action,
    actor: entry.actor,
    scope: entry.scope,
    toolCall: entry.toolCall,
    result: entry.result,
    prevHash: entry.prevHash
  });
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * AuditService — tamper-evident hash-chained audit log, Mongo-backed.
 *
 * Each entry's hash is SHA256(sequence + timestamp + action + actor + scope
 * + toolCall + result + prevHash). verifyChain() walks the chain in
 * sequence order and reports the first sequence number where either the
 * prevHash link or the recomputed content hash no longer matches — this is
 * how manual tampering with a stored entry is detected.
 */
@Injectable({ deps: [DatabaseService] })
export class AuditService {
  private inMemoryChain: AuditEntry[] = [];

  constructor(private db: DatabaseService) {}

  /**
   * Append a new entry to the chain. Sequence numbers are assigned
   * contiguously based on the current max sequence in storage.
   */
  async append(
    action: string,
    actor: string,
    scope: string,
    toolCall: AuditToolCall,
    result: AuditResult
  ): Promise<AuditEntry> {
    const isMongo = this.db.isConnected();

    let sequence = 1;
    let prevHash = GENESIS_HASH;

    if (isMongo) {
      const last = await AuditEntryModel.findOne().sort({ sequence: -1 }).lean<AuditEntryDocument>();
      sequence = last ? last.sequence + 1 : 1;
      prevHash = last ? last.hash : GENESIS_HASH;
    } else {
      const last = this.inMemoryChain[this.inMemoryChain.length - 1];
      sequence = last ? last.sequence + 1 : 1;
      prevHash = last ? last.hash : GENESIS_HASH;
    }

    const timestamp = new Date().toISOString();

    const draft: Omit<AuditEntry, 'hash'> = {
      sequence,
      timestamp,
      action,
      actor,
      scope,
      toolCall,
      result,
      prevHash
    };

    const hash = computeHash(draft);
    const entry: AuditEntry = { ...draft, hash };

    if (isMongo) {
      const { AppSettingsModel } = await import('./schemas/settings.schema.js');
      const settings = await AppSettingsModel.findOne();
      const retentionDays = settings?.logRetentionDays || 7;
      
      const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
      await AuditEntryModel.create({ ...entry, expiresAt });
    } else {
      this.inMemoryChain.push(entry);
    }

    return entry;
  }

  /**
   * Verify the integrity of the entire chain in sequence order.
   * Reports the first sequence number at which tampering is detected,
   * either via a broken prevHash link or a content-hash mismatch.
   */
  async verifyChain(): Promise<ChainVerification> {
    const isMongo = this.db.isConnected();
    let docs: AuditEntry[] = [];

    if (isMongo) {
      const raw = await AuditEntryModel.find().sort({ sequence: 1 }).lean<AuditEntryDocument[]>();
      docs = raw.map(toPlainEntry);
    } else {
      docs = [...this.inMemoryChain];
    }

    const errors: string[] = [];
    let breakAtSequence: number | undefined;

    for (let i = 0; i < docs.length; i++) {
      const entry = docs[i];
      const expectedPrevHash = i === 0 ? GENESIS_HASH : docs[i - 1].hash;

      if (entry.prevHash !== expectedPrevHash) {
        errors.push(
          `Sequence ${entry.sequence}: prevHash mismatch. Expected ${expectedPrevHash}, got ${entry.prevHash}`
        );
        breakAtSequence = entry.sequence;
        break;
      }

      const recomputed = computeHash({
        sequence: entry.sequence,
        timestamp: entry.timestamp,
        action: entry.action,
        actor: entry.actor,
        scope: entry.scope,
        toolCall: entry.toolCall,
        result: entry.result,
        prevHash: entry.prevHash
      });

      if (recomputed !== entry.hash) {
        errors.push(
          `Sequence ${entry.sequence}: content hash mismatch. Entry has been tampered with.`
        );
        breakAtSequence = entry.sequence;
        break;
      }
    }

    return {
      chain_valid: breakAtSequence === undefined,
      break_at_sequence: breakAtSequence,
      total_entries: docs.length,
      errors
    };
  }

  /**
   * List entries in sequence order (used by the verify-audit-chain tool
   * to surface a preview alongside the verification result).
   */
  async listEntries(limit = 50): Promise<AuditEntry[]> {
    await this.db.connect();
    const docs = await AuditEntryModel.find()
      .sort({ sequence: 1 })
      .limit(limit)
      .lean<AuditEntryDocument[]>();
    return docs.map(toPlainEntry);
  }
}
