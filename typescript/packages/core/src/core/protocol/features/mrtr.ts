/**
 * SEP-2322 Multi Round-Trip Requests (MRTR).
 *
 * On 2026-07-28 a handler can pause and ask the client for more input without a
 * persistent connection: it returns an `input_required` result carrying
 * `inputRequests` and an opaque `requestState`; the client re-invokes the same
 * request with `inputResponses` (plus the echoed `requestState`).
 *
 * NitroStack has no elicitation/sampling handlers today, so this is a net-new,
 * additive API. Handlers are written **once**: they call `inputRequired(...)`
 * and read prior answers with `acceptedContent(...)`. These helpers produce an
 * era-agnostic marker object; the modern adapter translates it into the real
 * v2 `InputRequiredResult`, while the legacy adapter surfaces it via the
 * session stream (or treats it as an error result if the client cannot elicit).
 *
 * @module
 */

import type { JsonValue } from '../../types.js';

/** Marker symbol identifying a NitroStack input-required result. */
export const NITRO_INPUT_REQUIRED = Symbol.for('nitrostack.inputRequired');

/**
 * A single request for client-provided input (elicitation-style).
 */
export interface NitroInputRequest {
  /** Identifier the client echoes back in `inputResponses`. */
  id: string;
  /** Human-facing message describing what is being asked. */
  message?: string;
  /** JSON Schema describing the expected response shape. */
  schema?: Record<string, JsonValue>;
  /** Optional request kind (defaults to form elicitation). */
  kind?: 'form' | 'url';
  /** For `url` elicitations, the URL the user must visit. */
  url?: string;
}

/**
 * The era-agnostic input-required marker returned by `inputRequired()`.
 */
export interface NitroInputRequiredResult {
  [NITRO_INPUT_REQUIRED]: true;
  inputRequests: NitroInputRequest[];
  /** Opaque state echoed to the client and returned on retry. */
  requestState?: JsonValue;
  /** Optional message shown alongside the requests. */
  message?: string;
}

/**
 * Signal that a handler needs more input from the client before it can finish.
 *
 * @example
 * ```ts
 * if (!acceptedContent(ctx.inputResponses, 'confirm')) {
 *   return inputRequired({
 *     requests: [{ id: 'confirm', message: 'Delete all rows?', schema: { type: 'boolean' } }],
 *     requestState: { pendingDelete: table },
 *   });
 * }
 * ```
 */
export function inputRequired(spec: {
  requests: NitroInputRequest[];
  requestState?: JsonValue;
  message?: string;
}): NitroInputRequiredResult {
  return {
    [NITRO_INPUT_REQUIRED]: true,
    inputRequests: spec.requests,
    requestState: spec.requestState,
    message: spec.message,
  };
}

/**
 * Type guard for the input-required marker.
 */
export function isInputRequired(value: unknown): value is NitroInputRequiredResult {
  return !!value && typeof value === 'object' && (value as Record<symbol, unknown>)[NITRO_INPUT_REQUIRED] === true;
}

/**
 * Read a previously-supplied input response by id from `ctx.inputResponses`.
 * Returns `undefined` when the client has not answered that request yet, which
 * is the signal to return `inputRequired(...)`.
 */
export function acceptedContent<T = JsonValue>(
  inputResponses: Record<string, unknown> | undefined,
  id: string,
): T | undefined {
  if (!inputResponses || typeof inputResponses !== 'object') {
    return undefined;
  }
  const entry = inputResponses[id];
  if (entry === undefined || entry === null) {
    return undefined;
  }
  // Responses may be bare values or `{ content: ... }` wrappers.
  if (typeof entry === 'object' && entry !== null && 'content' in (entry as object)) {
    return (entry as { content: T }).content;
  }
  return entry as T;
}
