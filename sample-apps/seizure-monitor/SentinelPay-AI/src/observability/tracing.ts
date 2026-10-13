/**
 * SentinelPay AI — Tracing / Correlation IDs
 * Source: Technical Specification §13.4 (Tracing)
 *
 * "Use correlationId across: user request → agent → tool calls → risk →
 * approval. If NitroStack provides native tracing, use it. Otherwise
 * implement application-level correlation IDs." This module is that
 * application-level fallback — it is safe to keep even if NitroStack
 * later provides native tracing, since it only generates/threads an ID.
 */

import { randomUUID } from "node:crypto";

export function newCorrelationId(): string {
  return `corr-${randomUUID()}`;
}

export function newCaseId(transactionId: string): string {
  // Human-readable case IDs (e.g. CASE-827 for TX-827) mirror the
  // convention shown throughout §10/§35, falling back to a UUID suffix
  // for transaction IDs that don't have a trailing numeric segment.
  const match = /(\d+)$/.exec(transactionId);
  const suffix = match ? match[1] : randomUUID().slice(0, 8);
  return `CASE-${suffix}`;
}

/**
 * A minimal span-like wrapper: records start, tags, and elapsed time
 * without pulling in an OpenTelemetry dependency the scaffold may not
 * provide. `finish()` returns the duration so callers can log/metric it.
 */
export class Span {
  private readonly startedAt = Date.now();

  constructor(
    public readonly name: string,
    public readonly correlationId: string,
    public readonly tags: Record<string, unknown> = {}
  ) {}

  finish(): number {
    return Date.now() - this.startedAt;
  }
}

export function startSpan(
  name: string,
  correlationId: string,
  tags?: Record<string, unknown>
): Span {
  return new Span(name, correlationId, tags);
}
