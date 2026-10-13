/**
 * SentinelPay AI — Runtime Input/Output Validation
 * Source: Technical Specification §12.7 (Input validation), §5.2–5.8 (per-tool I/O)
 *
 * Deliberately dependency-free (no zod/yup/etc.) so this file works
 * unchanged no matter what validation library ships in the eventual
 * NitroStack `typescript-starter` scaffold. If the scaffold already
 * includes a schema library, these functions can be thinned to thin
 * wrappers around it without changing their call sites in *.tools.ts.
 */

import { InvalidInputError } from "./errors.js";
import type { Evidence, EvidenceSeverity, EvidenceType } from "./models.js";

// ---------------------------------------------------------------------------
// Primitive validators
// ---------------------------------------------------------------------------

const ID_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,31}$/;

export function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidInputError(`Field "${field}" must be a non-empty string.`, {
      field,
      received: typeof value,
    });
  }
  return value;
}

export function assertId(value: unknown, field: string): string {
  const str = assertNonEmptyString(value, field);
  if (!ID_PATTERN.test(str)) {
    throw new InvalidInputError(
      `Field "${field}" must match the canonical ID pattern (e.g. "TX-827").`,
      { field, received: str }
    );
  }
  return str;
}

export function assertPositiveNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new InvalidInputError(`Field "${field}" must be a positive finite number.`, {
      field,
      received: value,
    });
  }
  return value;
}

export function assertEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new InvalidInputError(
      `Field "${field}" must be one of: ${allowed.join(", ")}.`,
      { field, received: value }
    );
  }
  return value as T;
}

export function assertCurrency(value: unknown, field = "currency"): "INR" {
  return assertEnum(value, ["INR"] as const, field);
}

const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export function assertIsoTimestamp(value: unknown, field: string): string {
  const str = assertNonEmptyString(value, field);
  if (!ISO_8601_PATTERN.test(str)) {
    throw new InvalidInputError(`Field "${field}" must be an ISO-8601 UTC timestamp.`, {
      field,
      received: str,
    });
  }
  return str;
}

/**
 * Rejects unexpected fields on an input object (§12.7: "Reject unknown or
 * unexpected fields where appropriate."). Use for tool inputs, which come
 * from an untrusted model-driven caller.
 */
export function assertNoUnknownFields(
  value: Record<string, unknown>,
  allowedFields: readonly string[],
  context: string
): void {
  const unknown = Object.keys(value).filter((k) => !allowedFields.includes(k));
  if (unknown.length > 0) {
    throw new InvalidInputError(
      `Unexpected field(s) in ${context}: ${unknown.join(", ")}.`,
      { context, unknownFields: unknown }
    );
  }
}

function assertPlainObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidInputError(`Field "${field}" must be an object.`, {
      field,
      received: value === null ? "null" : typeof value,
    });
  }
  return value as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Per-tool input schemas (§5.2–5.8)
// ---------------------------------------------------------------------------

export interface GetTransactionInput {
  transactionId: string;
}

/** §5.2 getTransaction input: { transactionId } */
export function parseGetTransactionInput(raw: unknown): GetTransactionInput {
  const obj = assertPlainObject(raw, "getTransaction input");
  assertNoUnknownFields(obj, ["transactionId"], "getTransaction input");
  return { transactionId: assertId(obj.transactionId, "transactionId") };
}

export interface VerifyVendorInput {
  vendorId: string;
}

/** §5.3 verifyVendor input: { vendorId } */
export function parseVerifyVendorInput(raw: unknown): VerifyVendorInput {
  const obj = assertPlainObject(raw, "verifyVendor input");
  assertNoUnknownFields(obj, ["vendorId"], "verifyVendor input");
  return { vendorId: assertId(obj.vendorId, "vendorId") };
}

export interface AnalyzeInvoiceInput {
  invoiceId: string;
}

/** §5.4 analyzeInvoice input: { invoiceId } */
export function parseAnalyzeInvoiceInput(raw: unknown): AnalyzeInvoiceInput {
  const obj = assertPlainObject(raw, "analyzeInvoice input");
  assertNoUnknownFields(obj, ["invoiceId"], "analyzeInvoice input");
  return { invoiceId: assertId(obj.invoiceId, "invoiceId") };
}

export interface GetPaymentHistoryInput {
  vendorId: string;
}

/** §5.5 getPaymentHistory input: { vendorId } */
export function parseGetPaymentHistoryInput(raw: unknown): GetPaymentHistoryInput {
  const obj = assertPlainObject(raw, "getPaymentHistory input");
  assertNoUnknownFields(obj, ["vendorId"], "getPaymentHistory input");
  return { vendorId: assertId(obj.vendorId, "vendorId") };
}

export interface RiskIndicatorsInput {
  beneficiaryMismatch: boolean;
  amountAnomaly: boolean;
  policyViolation: boolean;
}

/** §5.7 calculateRisk input */
export function parseRiskIndicatorsInput(raw: unknown): RiskIndicatorsInput {
  const obj = assertPlainObject(raw, "calculateRisk input");
  assertNoUnknownFields(
    obj,
    ["beneficiaryMismatch", "amountAnomaly", "policyViolation"],
    "calculateRisk input"
  );
  for (const field of ["beneficiaryMismatch", "amountAnomaly", "policyViolation"] as const) {
    if (typeof obj[field] !== "boolean") {
      throw new InvalidInputError(`Field "${field}" must be a boolean.`, {
        field,
        received: obj[field],
      });
    }
  }
  return {
    beneficiaryMismatch: obj.beneficiaryMismatch as boolean,
    amountAnomaly: obj.amountAnomaly as boolean,
    policyViolation: obj.policyViolation as boolean,
  };
}

export interface PrepareApprovalInput {
  caseId: string;
  transactionId: string;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  recommendation: "RELEASE" | "HOLD";
}

/** §5.8 prepareApproval input */
export function parsePrepareApprovalInput(raw: unknown): PrepareApprovalInput {
  const obj = assertPlainObject(raw, "prepareApproval input");
  assertNoUnknownFields(
    obj,
    ["caseId", "transactionId", "riskScore", "riskLevel", "recommendation"],
    "prepareApproval input"
  );
  const riskScore = obj.riskScore;
  if (typeof riskScore !== "number" || riskScore < 0 || riskScore > 100) {
    throw new InvalidInputError('Field "riskScore" must be a number between 0 and 100.', {
      field: "riskScore",
      received: riskScore,
    });
  }
  return {
    caseId: assertId(obj.caseId, "caseId"),
    transactionId: assertId(obj.transactionId, "transactionId"),
    riskScore,
    riskLevel: assertEnum(obj.riskLevel, ["LOW", "MEDIUM", "HIGH"] as const, "riskLevel"),
    recommendation: assertEnum(obj.recommendation, ["RELEASE", "HOLD"] as const, "recommendation"),
  };
}

// ---------------------------------------------------------------------------
// §5.6 evaluatePolicy input — a normalized transaction/evidence object.
// ---------------------------------------------------------------------------

const EVIDENCE_TYPES: readonly EvidenceType[] = [
  "BENEFICIARY_MISMATCH",
  "AMOUNT_ANOMALY",
  "DUPLICATE_INVOICE",
  "POLICY_VIOLATION",
  "INCOMPLETE_EVIDENCE",
  "DATA_CONFLICT",
];

const EVIDENCE_SEVERITIES: readonly EvidenceSeverity[] = ["LOW", "MEDIUM", "HIGH"];

/**
 * Validates one Evidence item as carried in an evaluatePolicy request. The
 * caller (the agent) supplies evidence it already collected from earlier
 * tool calls in this investigation — this function never fabricates or
 * infers evidence, it only checks shape.
 */
function parseEvidenceItem(raw: unknown, index: number): Evidence {
  const obj = assertPlainObject(raw, `evidence[${index}]`);
  assertNoUnknownFields(
    obj,
    ["evidenceId", "caseId", "type", "severity", "observations", "sources"],
    `evidence[${index}]`
  );

  const observations = obj.observations;
  if (typeof observations !== "object" || observations === null || Array.isArray(observations)) {
    throw new InvalidInputError(`Field "evidence[${index}].observations" must be an object.`, {
      field: `evidence[${index}].observations`,
    });
  }

  const sources = obj.sources;
  if (!Array.isArray(sources) || !sources.every((s) => typeof s === "string")) {
    throw new InvalidInputError(`Field "evidence[${index}].sources" must be an array of strings.`, {
      field: `evidence[${index}].sources`,
    });
  }

  return {
    evidenceId: assertNonEmptyString(obj.evidenceId, `evidence[${index}].evidenceId`),
    caseId: assertNonEmptyString(obj.caseId, `evidence[${index}].caseId`),
    type: assertEnum(obj.type, EVIDENCE_TYPES, `evidence[${index}].type`),
    severity: assertEnum(obj.severity, EVIDENCE_SEVERITIES, `evidence[${index}].severity`),
    observations: observations as Record<string, unknown>,
    sources,
  };
}

export interface EvaluatePolicyInput {
  caseId: string;
  transactionAmount: number;
  evidence: Evidence[];
}

/** §5.6 evaluatePolicy input: { caseId, transactionAmount, evidence[] } */
export function parseEvaluatePolicyInput(raw: unknown): EvaluatePolicyInput {
  const obj = assertPlainObject(raw, "evaluatePolicy input");
  assertNoUnknownFields(
    obj,
    ["caseId", "transactionAmount", "evidence"],
    "evaluatePolicy input"
  );

  const evidenceRaw = obj.evidence;
  if (!Array.isArray(evidenceRaw)) {
    throw new InvalidInputError('Field "evidence" must be an array.', {
      field: "evidence",
      received: typeof evidenceRaw,
    });
  }

  return {
    caseId: assertId(obj.caseId, "caseId"),
    transactionAmount: assertPositiveNumber(obj.transactionAmount, "transactionAmount"),
    evidence: evidenceRaw.map((item, index) => parseEvidenceItem(item, index)),
  };
}
