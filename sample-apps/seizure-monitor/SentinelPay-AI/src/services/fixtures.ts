/**
 * SentinelPay AI — Fixture Repository
 * Source: Technical Specification §4.4 (Why JSON fixtures), §5.2 ("O(1) if
 * indexed in memory by transaction ID"), §17.3 (dev/demo run on mock data).
 *
 * Loads the six `data/*.json` fixture files once and indexes them in
 * memory by primary key. This is the "Fixture Repository" box in the
 * tool architecture standard (§5.1). It is intentionally the *only*
 * module that touches the filesystem — every *.service.ts depends on
 * this repository, never on `fs` directly.
 *
 * Not a database: no writes, no mutation. Read-only source of truth for
 * the prototype, per design principle #6 (technical honesty).
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Counterparty,
  Invoice,
  PaymentHistoryRecord,
  Policy,
  Transaction,
} from "../domain/models.js";
import { InternalError } from "../domain/errors.js";

// This package is ESM-only ("type": "module" in package.json, module:
// ESNext in tsconfig), so `import.meta.url` is always available here —
// no CJS `__dirname` fallback is needed (and none would work, since this
// module is never loaded under CommonJS).
function resolveDataDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "data");
}

function loadJson<T>(filename: string): T {
  const dataDir = resolveDataDir();
  const path = join(dataDir, filename);
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new InternalError(`Failed to load fixture file "${filename}".`, {
      recoverable: false,
      details: { path, cause: err instanceof Error ? err.message : String(err) },
    });
  }
}

class FixtureRepository {
  private transactions: Map<string, Transaction> | null = null;
  private counterparties: Map<string, Counterparty> | null = null;
  private invoices: Map<string, Invoice> | null = null;
  private paymentHistory: Map<string, PaymentHistoryRecord> | null = null;
  private policies: Map<string, Policy> | null = null;

  private ensureLoaded() {
    if (this.transactions) return; // all five load together; check one as a sentinel

    const transactions = loadJson<Transaction[]>("transactions.json");
    const counterparties = loadJson<Counterparty[]>("counterparties.json");
    const invoices = loadJson<Invoice[]>("invoices.json");
    const paymentHistory = loadJson<PaymentHistoryRecord[]>("payment-history.json");
    const policies = loadJson<Policy[]>("policies.json");

    this.transactions = new Map(transactions.map((t) => [t.transactionId, t]));
    this.counterparties = new Map(counterparties.map((c) => [c.vendorId, c]));
    this.invoices = new Map(invoices.map((i) => [i.invoiceId, i]));
    this.paymentHistory = new Map(paymentHistory.map((h) => [h.vendorId, h]));
    this.policies = new Map(policies.map((p) => [p.policyId, p]));
  }

  getTransaction(transactionId: string): Transaction | null {
    this.ensureLoaded();
    return this.transactions!.get(transactionId) ?? null;
  }

  getCounterparty(vendorId: string): Counterparty | null {
    this.ensureLoaded();
    return this.counterparties!.get(vendorId) ?? null;
  }

  getInvoice(invoiceId: string): Invoice | null {
    this.ensureLoaded();
    return this.invoices!.get(invoiceId) ?? null;
  }

  getPaymentHistory(vendorId: string): PaymentHistoryRecord | null {
    this.ensureLoaded();
    return this.paymentHistory!.get(vendorId) ?? null;
  }

  getPolicy(policyId = "payment-policy"): Policy | null {
    this.ensureLoaded();
    return this.policies!.get(policyId) ?? null;
  }

  /** Readiness-probe helper for health checks (§13.7 — "fixtures loaded"). */
  isReady(): boolean {
    try {
      this.ensureLoaded();
      return true;
    } catch {
      return false;
    }
  }
}

/** Singleton — one process-wide, in-memory, read-only fixture index. */
export const fixtureRepository = new FixtureRepository();
