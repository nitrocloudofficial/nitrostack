/**
 * JSON-file-backed data store (no native modules).
 *
 * Data lives in process memory for speed and is flushed to a JSON snapshot on
 * every write, then reloaded at boot — so seeded documents and sealed ledgers
 * survive dev-server restarts (Studio restarts the STDIO process on reconnect).
 * No native compilation is needed, which keeps NitroCloud builds clean. All
 * operations are synchronous, so the hash chain stays consistent even while
 * clause comparisons run concurrently (JS is single-threaded between awaits).
 */
import fs from "node:fs";
import path from "node:path";
import { Audit, DecisionRecord, Doc, Finding } from "./audit/types.js";

type StoredRecord = DecisionRecord & { seq: number };

let docs: Doc[] = [];
let audits: Audit[] = [];
let findings: Finding[] = [];
let records: StoredRecord[] = [];

const DATA_FILE = process.env.DATA_FILE || path.join(process.cwd(), ".data", "auditor-zero.json");

function load(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const snap = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      docs = snap.docs ?? [];
      audits = snap.audits ?? [];
      findings = snap.findings ?? [];
      records = snap.records ?? [];
      // A freshly-booted process cannot have an in-flight pipeline: any audit
      // still marked running/pending was interrupted by a restart. Mark it
      // failed so it never sits as a zombie "running" row forever.
      for (const a of audits) {
        if (a.status === "running" || a.status === "pending") {
          a.status = "failed";
          a.error = "Interrupted by a server restart before completing";
          a.completedAt = a.completedAt ?? new Date().toISOString();
        }
      }
    }
  } catch {
    // A corrupt/missing snapshot is never fatal — start empty.
    docs = []; audits = []; findings = []; records = [];
  }
}

function save(): void {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify({ docs, audits, findings, records }));
  } catch {
    // Read-only filesystem (some cloud sandboxes): keep running in-memory only.
  }
}

load();

// --- Documents ---
export function nextDocSeq(): number {
  return docs.reduce((m, d) => Math.max(m, d.seq), 0) + 1;
}
export function insertDoc(d: Doc): void {
  docs.push(d);
  save();
}
export function getDocById(id: string): Doc | null {
  return docs.find((d) => d.id === id) ?? null;
}
export function allDocs(): Doc[] {
  return [...docs].sort((a, b) => a.seq - b.seq);
}

// --- Audits ---
export function insertAudit(a: Audit): void {
  audits.push(a);
  save();
}
export function getAuditById(id: string): Audit | null {
  return audits.find((a) => a.id === id) ?? null;
}
export function allAudits(): Audit[] {
  return [...audits].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function updateAudit(id: string, patch: Partial<Audit>): void {
  const a = getAuditById(id);
  if (a) {
    Object.assign(a, patch);
    save();
  }
}
export function bumpAuditProgress(id: string): void {
  const a = getAuditById(id);
  if (a) {
    a.progressDone += 1;
    save();
  }
}

// --- Findings ---
export function insertFinding(f: Finding): void {
  findings.push(f);
  save();
}
export function findingsByAudit(auditId: string): Finding[] {
  return findings.filter((f) => f.auditId === auditId);
}
export function getFindingById(id: string): Finding | null {
  return findings.find((f) => f.id === id) ?? null;
}

// --- Decision records (Black Box) ---
export function lastHash(auditId: string): string {
  const rs = records.filter((r) => r.auditId === auditId).sort((a, b) => a.seq - b.seq);
  return rs.length ? rs[rs.length - 1].hash : "GENESIS";
}
export function nextDecisionSeq(auditId: string): number {
  const rs = records.filter((r) => r.auditId === auditId);
  return rs.length ? Math.max(...rs.map((r) => r.seq)) + 1 : 0;
}
export function insertDecision(r: StoredRecord): void {
  records.push(r);
  save();
}
export function ledger(auditId: string, findingId?: string | null): DecisionRecord[] {
  let rs = records.filter((r) => r.auditId === auditId);
  if (findingId) rs = rs.filter((r) => r.findingId === findingId || r.findingId == null);
  return rs.sort((a, b) => a.seq - b.seq).map(({ seq, ...rest }) => rest);
}
export function getDecision(recordId: string): DecisionRecord | null {
  const r = records.find((x) => x.id === recordId);
  if (!r) return null;
  const { seq, ...rest } = r;
  return rest;
}
export function tamperDecision(recordId: string, newOutput: unknown): boolean {
  const r = records.find((x) => x.id === recordId);
  if (!r) return false;
  r.output = newOutput; // deliberately does NOT recompute the hash
  save();
  return true;
}
