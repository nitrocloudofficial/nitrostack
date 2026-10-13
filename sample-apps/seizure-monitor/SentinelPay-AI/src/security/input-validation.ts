/**
 * SentinelPay AI — Generic Request Validation
 * Source: Technical Specification §12.7 (Input validation), §12.8 (Sandbox strategy)
 *
 * `domain/schemas.ts` validates the *shape* of each tool's typed input.
 * This module validates the *envelope* every MCP call arrives in, before
 * any per-tool schema runs: is the payload a plain object, is it within a
 * sane size bound, and does it avoid the categories of content a tool
 * must never accept (shell commands, SQL, arbitrary code, arbitrary URLs)
 * per §12.8. Nothing here inspects business meaning — that is the job of
 * `domain/schemas.ts` and the service layer.
 */

import { InvalidInputError } from "../domain/errors.js";

/** Defensive ceiling on raw request size (bytes, as JSON-stringified). */
const MAX_PAYLOAD_BYTES = 32_000;

/** §12.8 — a tool input must never smuggle shell/SQL/code as a string value. */
const DANGEROUS_CONTENT_PATTERNS: RegExp[] = [
  /\$\([^)]*\)/, // shell command substitution
  /`[^`]*`/, // backtick shell execution
  /\bDROP\s+TABLE\b/i,
  /\bUNION\s+SELECT\b/i,
  /<script\b/i,
];

export function assertPlainRequestObject(raw: unknown, context: string): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new InvalidInputError(`${context} must be a JSON object.`, {
      context,
      received: raw === null ? "null" : typeof raw,
    });
  }
  return raw as Record<string, unknown>;
}

export function assertBoundedPayloadSize(raw: unknown, context: string): void {
  const size = Buffer.byteLength(JSON.stringify(raw ?? {}), "utf-8");
  if (size > MAX_PAYLOAD_BYTES) {
    throw new InvalidInputError(`${context} exceeds the maximum allowed payload size.`, {
      context,
      maxBytes: MAX_PAYLOAD_BYTES,
      receivedBytes: size,
    });
  }
}

function containsDangerousContent(value: unknown): boolean {
  if (typeof value === "string") {
    return DANGEROUS_CONTENT_PATTERNS.some((pattern) => pattern.test(value));
  }
  if (Array.isArray(value)) {
    return value.some(containsDangerousContent);
  }
  if (value && typeof value === "object") {
    return Object.values(value).some(containsDangerousContent);
  }
  return false;
}

/** §12.8 — reject a request outright if any string field looks like an execution payload. */
export function assertNoDangerousContent(raw: unknown, context: string): void {
  if (containsDangerousContent(raw)) {
    throw new InvalidInputError(
      `${context} contains content that resembles executable code or a database command, which is never accepted.`,
      { context }
    );
  }
}

/** Runs the full envelope check used before any per-tool schema (§5.1 pipeline). */
export function validateRequestEnvelope(raw: unknown, context: string): Record<string, unknown> {
  assertBoundedPayloadSize(raw, context);
  const obj = assertPlainRequestObject(raw, context);
  assertNoDangerousContent(obj, context);
  return obj;
}
