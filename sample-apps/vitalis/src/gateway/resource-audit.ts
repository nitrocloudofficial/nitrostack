import { emitEvent, ExecutionContext } from '@nitrostack/core';
import * as crypto from 'node:crypto';
import { AuditEntry } from './audit.store.js';
import {
  canonicalInputHash,
  normalizeExternalCalls,
  summarizeInput,
} from './audit-log.interceptor.js';
import { getExternalCalls } from './request-context.js';

/** Records resource reads with the same bounded audit contract as tool calls. */
export async function withResourceAudit<T>(
  uri: string,
  context: ExecutionContext,
  handler: () => Promise<T> | T,
): Promise<T> {
  const startedAt = Date.now();
  const requestId = context.requestId || crypto.randomUUID();
  (context as any).requestId = requestId;
  const auth = (context as any).auth ?? { subject: 'anonymous', scopes: [] };
  const inputSummary = summarizeInput({ uri });
  let status: 'ok' | 'error' = 'ok';
  let errorCode: string | null = null;
  try {
    return await handler();
  } catch (error: any) {
    status = 'error';
    errorCode = error?.code ?? error?.name ?? 'UNKNOWN_ERROR';
    throw error;
  } finally {
    const entry: AuditEntry = {
      ts: new Date().toISOString(),
      request_id: requestId,
      tool: `resource:${uri}`,
      subject: typeof auth.subject === 'string' ? auth.subject : 'anonymous',
      scopes: Array.isArray(auth.scopes)
        ? auth.scopes.filter((scope: unknown): scope is string => typeof scope === 'string')
        : [],
      input_summary: inputSummary,
      input_hash: canonicalInputHash(inputSummary),
      emergency_detected: false,
      urgency_tier: 'not_applicable',
      cache_hit: false,
      external_calls: normalizeExternalCalls(
        (context as any).external_calls ?? getExternalCalls(),
      ),
      latency_ms: Date.now() - startedAt,
      status,
      error_code: errorCode,
    };
    emitEvent('audit.entry', entry);
  }
}
