import crypto from "node:crypto";
import * as store from "../store.js";
import { DecisionRecord, ReplayResult } from "./types.js";

const GENESIS = "GENESIS";

/**
 * The ledger is keyed with an HMAC secret held only by the server. Because each
 * link is HMAC-SHA256(secret, prevHash + payload) — not a plain hash — an
 * attacker who edits a stored record CANNOT recompute a valid chain to cover
 * their tracks without the secret. That is what makes the Black Box tamper-proof
 * rather than merely tamper-evident.
 */
let warnedFallback = false;
function ledgerSecret(): string {
  const secret = process.env.LEDGER_SECRET || process.env.JWT_SECRET;
  if (secret) return secret;
  // In production a real secret is mandatory — the tamper-proof claim depends on it.
  if (process.env.NODE_ENV === "production") {
    throw new Error("LEDGER_SECRET (or JWT_SECRET) must be set to seal the Black Box ledger.");
  }
  // Local development fallback so a missing .env never blocks the demo.
  if (!warnedFallback) {
    warnedFallback = true;
    console.error("[blackbox] WARNING: LEDGER_SECRET not set — using a development fallback key. Set LEDGER_SECRET in .env for a real keyed ledger.");
  }
  return "auditor-zero-dev-ledger-fallback";
}

function hmac(input: string): string {
  return crypto.createHmac("sha256", ledgerSecret()).update(input).digest("hex");
}

function computeHash(prevHash: string, agentName: string, input: unknown, output: unknown, timestamp: string): string {
  return hmac(prevHash + JSON.stringify({ agentName, input, output, timestamp }));
}

/** Seals a single agent decision into the hash chain. */
export function logDecision(params: {
  auditId: string;
  findingId?: string | null;
  agentName: string;
  input: unknown;
  output: unknown;
}): DecisionRecord {
  const { auditId, agentName, input, output } = params;
  const findingId = params.findingId ?? null;
  const timestamp = new Date().toISOString();
  const prevHash = store.lastHash(auditId);
  const hash = computeHash(prevHash, agentName, input, output, timestamp);
  const seq = store.nextDecisionSeq(auditId);
  const record: DecisionRecord = { id: crypto.randomUUID(), auditId, findingId, agentName, input, output, timestamp, prevHash, hash };
  store.insertDecision({ ...record, seq });
  return record;
}

export function getLedger(auditId: string, findingId?: string | null): DecisionRecord[] {
  return store.ledger(auditId, findingId);
}

export function getDecisionRecord(recordId: string): DecisionRecord | null {
  return store.getDecision(recordId);
}

/**
 * Recomputes the keyed hash chain from GENESIS forward and checks every stored
 * hash against the recomputed one — returning verified=false and the breaking
 * record id the moment a record (or something before it) was tampered with.
 */
export function verifyReplayChain(auditId: string, findingId?: string | null): ReplayResult {
  const records = getLedger(auditId, findingId);
  let expectedPrev = GENESIS;
  let brokenAt: string | null = null;

  for (const record of records) {
    const recomputed = computeHash(expectedPrev, record.agentName, record.input, record.output, record.timestamp);
    if (record.prevHash !== expectedPrev || recomputed !== record.hash) {
      brokenAt = record.id;
      break;
    }
    expectedPrev = record.hash;
  }

  return { auditId, findingId: findingId ?? null, records, verified: brokenAt === null && records.length > 0, brokenAt };
}

/** DEMO ONLY: edits a stored record's output without recomputing its hash, to prove verify catches it. */
export function debugTamperRecord(recordId: string, newOutput: unknown): boolean {
  return store.tamperDecision(recordId, newOutput);
}
