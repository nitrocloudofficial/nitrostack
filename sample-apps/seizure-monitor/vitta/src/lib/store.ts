/**
 * store.ts — tiny JSON-file-backed singleton (no DB, per CLAUDE.md rule 7).
 * Namespaces: cases, consents (proof), audit (append-only + seq), revocations.
 * Persists to ./data/*.json (gitignored). In-memory + synchronous flush.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { redactAuditPayload } from './redact.js';
import { VERSION_BLOCK } from './types.js';
import type { CaseRecord, AuditEnvelope } from './types.js';

const DATA_DIR = join(process.cwd(), 'data');

interface DiskShape {
  cases: Record<string, CaseRecord>;
  consents: Record<string, unknown>;
  audit: AuditEnvelope[];
  revocations: string[]; // jti list
  seq: number;
}

function emptyShape(): DiskShape {
  return { cases: {}, consents: {}, audit: [], revocations: [], seq: 0 };
}

class Store {
  private data: DiskShape = emptyShape();
  private loaded = false;
  private file = join(DATA_DIR, 'store.json');

  private ensureLoaded(): void {
    if (this.loaded) return;
    try {
      if (existsSync(this.file)) {
        this.data = { ...emptyShape(), ...JSON.parse(readFileSync(this.file, 'utf8')) };
      }
    } catch {
      this.data = emptyShape();
    }
    this.loaded = true;
  }

  private flush(): void {
    try {
      if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(this.file, JSON.stringify(this.data, null, 2), 'utf8');
    } catch {
      /* best-effort persistence; in-memory remains authoritative for the session */
    }
  }

  // ---- cases ----
  getCase(leadId: string): CaseRecord | undefined {
    this.ensureLoaded();
    return this.data.cases[leadId];
  }
  putCase(rec: CaseRecord): CaseRecord {
    this.ensureLoaded();
    this.data.cases[rec.lead_id] = rec;
    this.flush();
    return rec;
  }
  patchCase(leadId: string, patch: Partial<CaseRecord>): CaseRecord | undefined {
    this.ensureLoaded();
    const cur = this.data.cases[leadId];
    if (!cur) return undefined;
    const next = { ...cur, ...patch };
    this.data.cases[leadId] = next;
    this.flush();
    return next;
  }

  // ---- consent proof + revocation ----
  putConsentProof(jti: string, proof: unknown): void {
    this.ensureLoaded();
    this.data.consents[jti] = proof;
    this.flush();
  }
  revoke(jti: string): void {
    this.ensureLoaded();
    if (!this.data.revocations.includes(jti)) this.data.revocations.push(jti);
    this.flush();
  }
  isRevoked(jti: string): boolean {
    this.ensureLoaded();
    return this.data.revocations.includes(jti);
  }

  // ---- audit (append-only, PII redacted) ----
  audit(
    session_id: string,
    actor: string,
    event: string,
    payload: Record<string, unknown>,
  ): { ack: true; seq: number } {
    this.ensureLoaded();
    const seq = ++this.data.seq;
    const envelope: AuditEnvelope = {
      session_id,
      seq,
      actor,
      event,
      payload: redactAuditPayload(payload),
      version: { ...VERSION_BLOCK },
      ts: new Date().toISOString(),
    };
    this.data.audit.push(envelope);
    this.flush();
    return { ack: true, seq };
  }

  trail(session_id: string, view: 'FULL' | 'SUMMARY' | 'COMPLIANCE_VIEW' = 'FULL'): {
    events: Partial<AuditEnvelope>[];
    count: number;
  } {
    this.ensureLoaded();
    const events = this.data.audit.filter((e) => e.session_id === session_id);
    if (view === 'SUMMARY') {
      return { events: events.map((e) => ({ seq: e.seq, actor: e.actor, event: e.event, ts: e.ts })), count: events.length };
    }
    if (view === 'COMPLIANCE_VIEW') {
      return {
        events: events.map((e) => ({ seq: e.seq, actor: e.actor, event: e.event, version: e.version, ts: e.ts })),
        count: events.length,
      };
    }
    return { events, count: events.length };
  }

  /** Test/demo helper: wipe a session's state. */
  resetSession(session_id: string): void {
    this.ensureLoaded();
    this.data.audit = this.data.audit.filter((e) => e.session_id !== session_id);
    for (const [id, c] of Object.entries(this.data.cases)) {
      if (c.session_id === session_id) delete this.data.cases[id];
    }
    this.flush();
  }

  /** Test helper: fully in-memory reset (does not touch disk of other sessions). */
  _resetAll(): void {
    this.data = emptyShape();
    this.loaded = true;
  }
}

export const store = new Store();
