/**
 * AuditService
 *
 * Append-only audit trail for every request that passes through the
 * Secure Data Gateway. Entries are structured (see AuditEntry) and
 * deliberately exclude decrypted healthcare content — only metadata
 * about *who did what, when, and how long it took*.
 *
 * Default implementation writes newline-delimited JSON to a local file
 * for the reference deployment. Swap `sink` for a SIEM/log-pipeline
 * integration (e.g. CloudWatch, Datadog, Splunk) in production without
 * changing any call site.
 */

import { appendFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import type { IAuditService } from '../interfaces/gateway.interfaces.js';
import type { AuditEntry } from '../types/gateway.types.js';

export interface AuditSink {
  write(entry: AuditEntry): Promise<void>;
}

/** Writes newline-delimited JSON audit entries to disk. */
export class FileAuditSink implements AuditSink {
  private ready: Promise<void>;

  constructor(private readonly filePath: string) {
    this.ready = mkdir(dirname(filePath), { recursive: true }).then(() => undefined);
  }

  async write(entry: AuditEntry): Promise<void> {
    await this.ready;
    // Defense in depth: strip any field that isn't part of the AuditEntry
    // contract, in case a caller accidentally attached extra data.
    const safeEntry: AuditEntry = {
      timestamp: entry.timestamp,
      userId: entry.userId,
      role: entry.role,
      service: entry.service,
      aiAgent: entry.aiAgent,
      action: entry.action,
      resource: entry.resource,
      requestId: entry.requestId,
      executionTimeMs: entry.executionTimeMs,
      status: entry.status,
      errorSummary: entry.errorSummary
    };
    await appendFile(this.filePath, JSON.stringify(safeEntry) + '\n', 'utf-8');
  }
}

export class AuditService implements IAuditService {
  constructor(private readonly sink: AuditSink) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.sink.write(entry);
    } catch (err) {
      // Audit logging must never crash a request, but a failure here is
      // itself security-relevant — surface it loudly to stderr/stdout
      // logging so ops tooling can alert on it.
      // eslint-disable-next-line no-console
      console.error('[AuditService] failed to persist audit entry:', err);
    }
  }
}

export function createAuditServiceFromEnv(env: NodeJS.ProcessEnv): AuditService {
  const storeDir = env.SECURE_STORE_DIR ?? './secure-store';
  return new AuditService(new FileAuditSink(`${storeDir}/audit.log`));
}
