/**
 * SEP-414 W3C Trace Context propagation.
 *
 * On the 2026-07-28 revision, distributed-tracing keys travel in the per-request
 * `_meta` envelope under fixed names: `traceparent`, `tracestate`, `baggage`.
 * NitroStack lifts them into `ExecutionContext.trace` so guards, interceptors,
 * and loggers can correlate a tool call across the host, this server, and any
 * downstream call — without NitroStack introducing its own tracing backend.
 *
 * @module
 */

/**
 * W3C Trace Context extracted from a request `_meta` envelope.
 */
export interface TraceContext {
  /** `traceparent` header value (W3C Trace Context). */
  traceparent?: string;
  /** `tracestate` header value. */
  tracestate?: string;
  /** `baggage` header value (W3C Baggage). */
  baggage?: string;
}

const TRACEPARENT_KEY = 'io.modelcontextprotocol/traceparent';
const TRACESTATE_KEY = 'io.modelcontextprotocol/tracestate';
const BAGGAGE_KEY = 'io.modelcontextprotocol/baggage';

/**
 * Extract a `TraceContext` from an envelope/meta object, or `undefined` when no
 * trace keys are present. Accepts either the lifted `_meta` envelope
 * (`ctx.mcpReq.envelope`) or a raw `_meta` record; both the bare
 * (`traceparent`) and reverse-DNS (`io.modelcontextprotocol/traceparent`)
 * forms are recognized.
 */
export function extractTraceContext(
  source: Record<string, unknown> | undefined | null,
): TraceContext | undefined {
  if (!source || typeof source !== 'object') {
    return undefined;
  }
  const pick = (bare: string, prefixed: string): string | undefined => {
    const v = source[prefixed] ?? source[bare];
    return typeof v === 'string' && v.length > 0 ? v : undefined;
  };

  const traceparent = pick('traceparent', TRACEPARENT_KEY);
  const tracestate = pick('tracestate', TRACESTATE_KEY);
  const baggage = pick('baggage', BAGGAGE_KEY);

  if (!traceparent && !tracestate && !baggage) {
    return undefined;
  }
  const trace: TraceContext = {};
  if (traceparent) trace.traceparent = traceparent;
  if (tracestate) trace.tracestate = tracestate;
  if (baggage) trace.baggage = baggage;
  return trace;
}
