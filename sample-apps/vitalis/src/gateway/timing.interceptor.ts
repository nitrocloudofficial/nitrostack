/**
 * TimingInterceptor — Appends _meta.durationMs performance metadata and feeds
 * MetricsStore with request, cache, latency percentile, and upstream telemetry.
 */
import { Interceptor, InterceptorInterface, ExecutionContext, Injectable } from '@nitrostack/core';
import { MetricsStore } from './metrics.store.js';
import { getExternalCalls } from './request-context.js';

@Interceptor()
@Injectable({ deps: [MetricsStore] })
export class TimingInterceptor implements InterceptorInterface {
  constructor(private readonly metricsStore: MetricsStore) {}

  async intercept(context: ExecutionContext, next: () => Promise<any>): Promise<any> {
    const startTime = Date.now();
    let telemetryRecorded = false;

    const recordTelemetry = () => {
      if (telemetryRecorded) return;
      telemetryRecorded = true;

      const cacheHit = (context as any).cache_hit;
      if (typeof cacheHit === 'boolean') {
        this.metricsStore.recordCache(context.toolName ?? 'unknown', cacheHit);
      }

      const externalCalls = (context as any).external_calls ?? getExternalCalls();
      if (Array.isArray(externalCalls)) {
        this.metricsStore.recordExternalCalls(externalCalls);
      }
    };

    try {
      const result = await next();
      const durationMs = Date.now() - startTime;
      this.metricsStore.recordRequest(context.toolName ?? 'unknown', durationMs, false);
      recordTelemetry();

      if (result && typeof result === 'object') {
        result._meta = {
          ...(result._meta ?? {}),
          durationMs,
        };
      }

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.metricsStore.recordRequest(context.toolName ?? 'unknown', durationMs, true);
      recordTelemetry();
      throw error;
    }
  }
}
