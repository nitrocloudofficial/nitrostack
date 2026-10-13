/**
 * SentinelPay AI — Test Fixture Builders
 *
 * Small, explicit object builders used by unit/security tests. These are
 * separate from the runtime `data/*.json` fixtures in the repo root:
 * `data/` is the application's evidence source of truth, this file is
 * scaffolding for constructing edge cases (missing/duplicate/mismatched)
 * that aren't necessarily represented in the demo dataset.
 */

import type { Counterparty, Evidence, Invoice, PaymentHistoryStats, Transaction } from "../src/domain/models";

export function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    transactionId: "TX-TEST",
    amount: 100000,
    currency: "INR",
    vendorId: "VENDOR-TEST",
    invoiceId: "INV-TEST",
    beneficiaryAccount: "XXXX0000",
    status: "PENDING",
    timestamp: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function buildVendor(overrides: Partial<Counterparty> = {}): Counterparty {
  return {
    vendorId: "VENDOR-TEST",
    vendorName: "Test Vendor Pvt. Ltd.",
    verified: true,
    verifiedBeneficiaryAccount: "XXXX0000",
    relationshipStatus: "ACTIVE",
    ...overrides,
  };
}

export function buildInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    invoiceId: "INV-TEST",
    vendorId: "VENDOR-TEST",
    amount: 100000,
    currency: "INR",
    beneficiaryAccount: "XXXX0000",
    duplicate: false,
    ...overrides,
  };
}

export function buildHistoryStats(overrides: Partial<PaymentHistoryStats> = {}): PaymentHistoryStats {
  return {
    vendorId: "VENDOR-TEST",
    transactions: [100000, 100000, 100000],
    averageAmount: 100000,
    maxAmount: 100000,
    transactionCount: 3,
    ...overrides,
  };
}

export function buildEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    evidenceId: "ev-test",
    caseId: "CASE-TEST",
    type: "BENEFICIARY_MISMATCH",
    severity: "HIGH",
    observations: {},
    sources: [],
    ...overrides,
  };
}

/** The locked reference case from §35 — used to assert the exact TX-827 numbers. */
export const TX_827_REFERENCE = {
  transaction: buildTransaction({
    transactionId: "TX-827",
    amount: 842000,
    vendorId: "VENDOR-032",
    invoiceId: "INV-5521",
    beneficiaryAccount: "XXXX8291",
    timestamp: "2026-07-25T09:41:02Z",
  }),
  vendor: buildVendor({
    vendorId: "VENDOR-032",
    vendorName: "ABC Components Ltd.",
    verifiedBeneficiaryAccount: "XXXX4412",
  }),
  historyPayments: [152000, 182000, 174000, 203000, 155000],
  expectedAverage: 173200,
  expectedMultiplier: 4.86,
  expectedRiskScore: 87,
  expectedRiskLevel: "HIGH" as const,
  expectedRecommendation: "HOLD" as const,
};
