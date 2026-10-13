import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const AUDIT_FILE = path.join(process.cwd(), 'audit-chain.jsonl');

export interface AuditEntry {
  tool: string;
  params: Record<string, unknown>;
  decision: string;
  conflict: unknown;
  role: string;
  ts: string;
  prev_hash?: string;
  hash?: string;
}

function computeHash(entry: Omit<AuditEntry, 'hash'>, prevHash: string): string {
  const payload = JSON.stringify({ ...entry, prev_hash: prevHash });
  return createHash('sha256').update(payload).digest('hex');
}

function readAllEntries(): AuditEntry[] {
  if (!fs.existsSync(AUDIT_FILE)) return [];
  const lines = fs.readFileSync(AUDIT_FILE, 'utf8').trim().split('\n').filter(Boolean);
  return lines.map(l => JSON.parse(l));
}

export function writeAuditEntry(entryData: Omit<AuditEntry, 'hash' | 'prev_hash'>): AuditEntry {
  const entries = readAllEntries();
  const last = entries[entries.length - 1];
  const prevHash = last?.hash ?? '0'.repeat(64);
  const hash = computeHash(entryData, prevHash);
  const fullEntry: AuditEntry = { ...entryData, prev_hash: prevHash, hash };
  fs.appendFileSync(AUDIT_FILE, JSON.stringify(fullEntry) + '\n');
  return fullEntry;
}

export function getAuditHistory(limit = 100): AuditEntry[] {
  return readAllEntries().reverse().slice(0, limit);
}

export function verifyChain(): { valid: boolean; count: number; broken_at?: string } {
  const entries = readAllEntries();
  if (entries.length === 0) return { valid: true, count: 0 };

  let prevHash = '0'.repeat(64);
  for (const entry of entries) {
    if (entry.prev_hash !== prevHash) {
      return { valid: false, broken_at: entry.ts, count: entries.length };
    }
    const { hash, prev_hash, ...data } = entry;
    const recomputed = computeHash(data, prevHash);
    if (recomputed !== hash) {
      return { valid: false, broken_at: entry.ts, count: entries.length };
    }
    prevHash = hash!;
  }
  return { valid: true, count: entries.length };
}
