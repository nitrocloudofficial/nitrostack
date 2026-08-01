import {
  emitEvent,
  Interceptor,
  InterceptorInterface,
  ExecutionContext,
  Injectable,
} from '@nitrostack/core';
import { AuditEntry } from './audit.store.js';
import * as crypto from 'node:crypto';
import { getExternalCalls } from './request-context.js';

@Interceptor()
@Injectable()
export class AuditLogInterceptor implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const startTime = Date.now();
    const requestId = context.requestId || crypto.randomUUID();
    (context as any).requestId = requestId;
    const tool = context.toolName ?? 'unknown_tool';
    const auth = (context as any).auth ?? { subject: 'anonymous', scopes: [] };
    const subject = typeof auth.subject === 'string' ? auth.subject : 'anonymous';
    const scopes = Array.isArray(auth.scopes)
      ? auth.scopes.filter((scope: unknown): scope is string => typeof scope === 'string')
      : [];

    let response: any;
    let status: 'ok' | 'error' = 'ok';
    let errorCode: string | null = null;

    try {
      response = await next();
      return response;
    } catch (error: any) {
      status = 'error';
      errorCode = error?.code ?? error?.name ?? 'UNKNOWN_ERROR';
      throw error;
    } finally {
      const latencyMs = Date.now() - startTime;
      const input = (context as any).input ?? (context as any).args?.[0] ?? {};
      const inputSummary = summarizeInput(input);
      const inputHash = canonicalInputHash(inputSummary);
      const emergencyDetected = ((context as any).emergency?.matched_terms?.length ?? 0) > 0;
      const urgencyTier = response?._safety?.urgency_tier ?? 'not_applicable';
      const externalCalls = normalizeExternalCalls(
        (context as any).external_calls ?? getExternalCalls(),
      );

      const entry: AuditEntry = {
        ts: new Date().toISOString(),
        request_id: requestId,
        tool,
        subject,
        scopes,
        input_summary: inputSummary,
        input_hash: inputHash,
        emergency_detected: emergencyDetected,
        urgency_tier: urgencyTier,
        cache_hit: (context as any).cache_hit === true,
        external_calls: externalCalls,
        latency_ms: latencyMs,
        status,
        error_code: errorCode,
      };

      // The event emitter dispatches asynchronously, keeping disk persistence
      // out of the request completion path while AuditStore retains the ring
      // buffer and JSONL durability behavior.
      emitEvent('audit.entry', entry);
      (context as any).audit_recorded = true;
    }
  }
}

export function normalizeExternalCalls(value: unknown): AuditEntry['external_calls'] {
  if (!Array.isArray(value)) return [];
  return value.filter(isExternalCall).map((call) => ({ ...call }));
}

function isExternalCall(value: unknown): value is AuditEntry['external_calls'][number] {
  if (!value || typeof value !== 'object') return false;
  const call = value as Record<string, unknown>;
  return (
    typeof call.api === 'string' &&
    typeof call.path === 'string' &&
    typeof call.status === 'number' &&
    typeof call.latency_ms === 'number'
  );
}

/**
 * Produces an audit-safe input summary. Free text is bounded recursively so
 * arrays such as symptoms and medication lists cannot bypass the redaction
 * limit by nesting inside an object.
 */
const SENSITIVE_INPUT_KEYS = new Set([
  '_meta',
  'authorization',
  'x-api-key',
  'apiKey',
  'api_key',
  'token',
  'access_token',
  'jwt',
]);

export function summarizeInput(value: unknown, depth = 0): any {
  if (depth > 4) return '[truncated]';
  if (typeof value === 'string') {
    return value.length > 80 ? `${value.slice(0, 80)}...` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => summarizeInput(item, depth + 1));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SENSITIVE_INPUT_KEYS.has(key.toLowerCase()))
        .slice(0, 50)
        .map(([key, item]) => [key, summarizeInput(item, depth + 1)]),
    );
  }
  return value;
}

export function canonicalInputHash(value: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex')
    .substring(0, 16);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}
