/**
 * `Accept` handling shared by the legacy (SDK 1.x) and modern (SDK 2.x) HTTP paths.
 *
 * Both SDKs reject a 2025-era POST with 406 unless `Accept` lists both
 * `application/json` and `text/event-stream`. Clients such as curl, Postman and
 * some connectors send only `application/json`, a wildcard, or nothing. Those
 * requests are served in JSON response mode, and the header is rewritten to the
 * value below only so that the SDK's check passes.
 */

/** The `Accept` value both SDK transports require on a POST. */
export const SDK_POST_ACCEPT = 'application/json, text/event-stream';

/** Logs requests that do not accept SSE, and every 406, when set to a non-empty value. */
export const ACCEPT_DEBUG_ENV_VAR = 'NITRO_DEBUG_ACCEPT';

export function acceptsEventStream(accept: string | null | undefined): boolean {
  return typeof accept === 'string' && accept.toLowerCase().includes('text/event-stream');
}

export interface AcceptDebugEntry {
  engine: 'legacy' | 'modern';
  httpMethod: string;
  accept: string | null | undefined;
  contentType: string | null | undefined;
  protocolVersion: string | null | undefined;
  rpcMethod: string | undefined;
  status: number;
  servedAsJson: boolean;
}

/**
 * Temporary diagnostics for clients whose `Accept` header the SDK rejects.
 * Written to stderr so stdio deployments are unaffected.
 */
export function logAcceptDebug(entry: AcceptDebugEntry): void {
  if (!process.env[ACCEPT_DEBUG_ENV_VAR]) return;
  if (entry.status !== 406 && acceptsEventStream(entry.accept)) return;
  console.error(`[${ACCEPT_DEBUG_ENV_VAR}] ${JSON.stringify(entry)}`);
}
