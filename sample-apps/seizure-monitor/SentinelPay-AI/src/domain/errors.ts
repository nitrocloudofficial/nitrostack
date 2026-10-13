/**
 * SentinelPay AI — Typed Application Errors
 * Source: Technical Specification §11.5 (Error codes), §14.1 (Error classes)
 *
 * One class per logical error code. Every error carries a stable `code`
 * that maps 1:1 to the table in §11.5, plus non-sensitive `details` for
 * structured logging (never account numbers, tokens, or raw fixture
 * payloads — see observability/logger.ts redaction).
 *
 * `recoverable` distinguishes errors that are safe to retry (§11.6 —
 * transient platform/storage failures only) from everything else, which
 * must never be retried automatically (invalid input, auth failures,
 * not-found, data conflicts, policy violations).
 */

export type ErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INCOMPLETE_EVIDENCE"
  | "DATA_CONFLICT"
  | "POLICY_ERROR"
  | "RISK_ENGINE_ERROR"
  | "APPROVAL_ERROR"
  | "INTERNAL_ERROR";

export type ErrorDetails = Record<string, unknown>;

/** Base class for every application error. Never thrown directly. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details: ErrorDetails;
  readonly recoverable: boolean;

  constructor(code: ErrorCode, message: string, details: ErrorDetails = {}, recoverable = false) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = details;
    this.recoverable = recoverable;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** §12.7 — input failed schema/shape validation. Never retried. */
export class InvalidInputError extends AppError {
  constructor(message: string, details: ErrorDetails = {}) {
    super("INVALID_INPUT", message, details, false);
  }
}

/** §11.3, §12.1 — authentication failed or is unconfigured (fails closed). Never retried. */
export class UnauthorizedError extends AppError {
  constructor(message: string, details: ErrorDetails = {}) {
    super("UNAUTHORIZED", message, details, false);
  }
}

/** §11.4, §12.2 — caller lacks the required least-privilege capability. Never retried. */
export class ForbiddenError extends AppError {
  constructor(message: string, details: ErrorDetails = {}) {
    super("FORBIDDEN", message, details, false);
  }
}

/** Requested entity (transaction/vendor/invoice) does not exist. Never retried. */
export class NotFoundError extends AppError {
  constructor(message: string, details: ErrorDetails = {}) {
    super("NOT_FOUND", message, details, false);
  }
}

/** §8.7 — required evidence is unavailable. Must never be silently treated as safe. */
export class IncompleteEvidenceError extends AppError {
  constructor(message: string, details: ErrorDetails = {}) {
    super("INCOMPLETE_EVIDENCE", message, details, false);
  }
}

/** §8.8 — two trusted sources disagree. Never resolved by guessing. */
export class DataConflictError extends AppError {
  constructor(message: string, details: ErrorDetails = {}) {
    super("DATA_CONFLICT", message, details, false);
  }
}

/** §5.6 — deterministic policy evaluation failed (e.g. policy config missing). */
export class PolicyError extends AppError {
  constructor(message: string, details: ErrorDetails = {}) {
    super("POLICY_ERROR", message, details, false);
  }
}

/** §5.7 — deterministic risk calculation failed (e.g. malformed indicators). */
export class RiskEngineError extends AppError {
  constructor(message: string, details: ErrorDetails = {}) {
    super("RISK_ENGINE_ERROR", message, details, false);
  }
}

/** §5.8 — human-review request could not be created. */
export class ApprovalError extends AppError {
  constructor(message: string, details: ErrorDetails = {}) {
    super("APPROVAL_ERROR", message, details, false);
  }
}

/**
 * Unexpected failure (e.g. fixture file missing/corrupt). May be marked
 * `recoverable` for a single bounded retry per §11.6/§14.2 — pass
 * `{ recoverable: true }` in details to opt in.
 */
export class InternalError extends AppError {
  constructor(message: string, details: ErrorDetails & { recoverable?: boolean } = {}) {
    const { recoverable = false, ...rest } = details;
    super("INTERNAL_ERROR", message, rest, recoverable);
  }
}

/** Structured, log/response-safe projection of any error (§11.5, §12.5). */
export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: ErrorDetails;
}

export function toErrorResponse(err: unknown): ErrorResponse {
  if (err instanceof AppError) {
    return { code: err.code, message: err.message, details: err.details };
  }
  return {
    code: "INTERNAL_ERROR",
    message: err instanceof Error ? err.message : "Unknown error.",
  };
}

export function isRetryable(err: unknown): boolean {
  return err instanceof AppError && err.recoverable;
}
