import {
  emitEvent,
  ExceptionFilter,
  ExceptionFilterInterface,
  ExecutionContext,
  Injectable,
} from '@nitrostack/core';
import { AuditEntry } from './audit.store.js';
import { MetricsStore } from './metrics.store.js';
import * as crypto from 'node:crypto';
import { getExternalCalls } from './request-context.js';
import {
  canonicalInputHash,
  normalizeExternalCalls,
  summarizeInput,
} from './audit-log.interceptor.js';

@ExceptionFilter()
@Injectable({ deps: [MetricsStore] })
export class ClinicalExceptionFilter implements ExceptionFilterInterface {
  constructor(private readonly metricsStore: MetricsStore) {}

  async catch(error: any, context: ExecutionContext): Promise<any> {
    const rawMessage = error?.message ?? String(error);

    let code = 'INTERNAL_ERROR';
    let safeMessage = 'An unexpected internal error occurred. Please try again later.';

    if (rawMessage.startsWith('AUTH_DENIED:')) {
      code = 'AUTH_DENIED';
      safeMessage = rawMessage.replace('AUTH_DENIED:', '').trim();
    } else if (rawMessage.startsWith('SCOPE_DENIED:')) {
      code = 'SCOPE_DENIED';
      safeMessage = rawMessage.replace('SCOPE_DENIED:', '').trim();
    } else if (rawMessage.startsWith('PATIENT_NOT_FOUND:')) {
      code = 'PATIENT_NOT_FOUND';
      safeMessage = rawMessage.replace('PATIENT_NOT_FOUND:', '').trim();
    } else if (rawMessage.includes('UPSTREAM') || error?.name === 'UpstreamError') {
      code = 'UPSTREAM_UNAVAILABLE';
      safeMessage = 'An external clinical data service is temporarily unavailable or timed out.';
    } else if (error?.name === 'ZodError' || rawMessage.toLowerCase().includes('validation')) {
      code = 'VALIDATION_ERROR';
      safeMessage = 'The request parameters did not match the required tool input schema.';
    }

    context.logger?.error('Tool execution exception caught', {
      tool: context.toolName,
      code,
      error: rawMessage,
    });

    if (!(context as any).audit_recorded) {
      const auth = (context as any).auth ?? { subject: 'anonymous', scopes: [] };
      const input = (context as any).input ?? (context as any).args?.[0] ?? {};
      const inputSummary = summarizeInput(input);
      const requestId = context.requestId ?? crypto.randomUUID();
      const entry: AuditEntry = {
        ts: new Date().toISOString(),
        request_id: requestId,
        tool: context.toolName ?? 'unknown_tool',
        subject: typeof auth.subject === 'string' ? auth.subject : 'anonymous',
        scopes: Array.isArray(auth.scopes)
          ? auth.scopes.filter((scope: unknown): scope is string => typeof scope === 'string')
          : [],
        input_summary: inputSummary,
        input_hash: canonicalInputHash(inputSummary),
        emergency_detected: ((context as any).emergency?.matched_terms?.length ?? 0) > 0,
        urgency_tier: 'not_applicable',
        cache_hit: (context as any).cache_hit === true,
        external_calls: normalizeExternalCalls(
          (context as any).external_calls ?? getExternalCalls(),
        ),
        latency_ms: 0,
        status: 'error',
        error_code: code,
      };
      emitEvent('audit.entry', entry);
      this.metricsStore.recordRequest(context.toolName ?? 'unknown', 0, true);
      (context as any).audit_recorded = true;
    }

    return {
      error: true,
      code,
      message: safeMessage,
      _safety: {
        disclaimer: 'For informational purposes only. Not medical advice.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }
}
