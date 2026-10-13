import { Injectable, OnEvent } from '@nitrostack/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { env } from '../config/env.js';

export interface AuditEntry {
  ts: string;
  request_id: string;
  tool: string;
  subject: string;
  scopes: string[];
  input_summary: Record<string, any>;
  input_hash: string;
  emergency_detected: boolean;
  urgency_tier: string;
  cache_hit: boolean;
  external_calls: Array<{
    api: string;
    path: string;
    status: number;
    latency_ms: number;
    error_code?: string;
  }>;
  latency_ms: number;
  status: 'ok' | 'error';
  error_code?: string | null;
}

type AuditLogger = {
  warn?: (message: string, meta?: Record<string, unknown>) => void;
};

@Injectable({ deps: ['Logger'] })
export class AuditStore {
  private readonly ringBuffer: AuditEntry[] = [];
  private readonly maxRingSize = 50;
  private readonly maxPersistentLines = 5_000;
  private readonly logPath: string;

  constructor(private readonly logger?: AuditLogger) {
    this.logPath = path.resolve(process.cwd(), env.AUDIT_LOG_PATH ?? 'logs/audit.jsonl');
    this.ensureLogDir();
    this.loadRecentEntries();
  }

  /** Event consumer keeps synchronous persistence outside the request path. */
  @OnEvent('audit.entry')
  async handleAuditEntry(entry: AuditEntry): Promise<void> {
    this.addEntry(entry);
  }

  addEntry(entry: AuditEntry): void {
    this.ringBuffer.push(entry);
    if (this.ringBuffer.length > this.maxRingSize) {
      this.ringBuffer.shift();
    }

    try {
      fs.appendFileSync(this.logPath, `${JSON.stringify(entry)}\n`, 'utf-8');
      this.trimPersistentLog();
    } catch (error) {
      this.reportStorageFailure('write', error);
    }
  }

  private ensureLogDir(): void {
    try {
      const dir = path.dirname(this.logPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (error) {
      this.reportStorageFailure('directory setup', error);
    }
  }

  private loadRecentEntries(): void {
    try {
      if (!fs.existsSync(this.logPath)) return;
      const lines = fs
        .readFileSync(this.logPath, 'utf-8')
        .split('\n')
        .filter(Boolean)
        .slice(-this.maxRingSize);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as AuditEntry;
          this.ringBuffer.push(entry);
        } catch (error) {
          this.reportStorageFailure('historical entry parse', error);
        }
      }
    } catch (error) {
      this.reportStorageFailure('startup read', error);
    }
  }

  private trimPersistentLog(): void {
    try {
      const lines = fs.readFileSync(this.logPath, 'utf-8').split('\n').filter(Boolean);
      if (lines.length > this.maxPersistentLines) {
        fs.writeFileSync(
          this.logPath,
          `${lines.slice(-this.maxPersistentLines).join('\n')}\n`,
          'utf-8',
        );
      }
    } catch (error) {
      this.reportStorageFailure('trim', error);
    }
  }

  private reportStorageFailure(operation: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    if (this.logger?.warn) {
      this.logger.warn(`Audit persistence ${operation} failed`, { error: message });
    } else {
      console.error(`[AuditStore] Audit persistence ${operation} failed: ${message}`);
    }
  }

  getRecentEntries(): AuditEntry[] {
    return [...this.ringBuffer].reverse();
  }
}
