import { performance } from 'node:perf_hooks';
import { ExecutionContext, Injectable, Interceptor, InterceptorInterface } from '@nitrostack/core';
import { MetricsService } from './metrics.service.js';

@Interceptor()
@Injectable({ deps: [MetricsService] })
export class MetricsInterceptor implements InterceptorInterface {
  constructor(private readonly metrics: MetricsService) {}

  async intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    const started = performance.now();
    let failed = true;
    let result: unknown;
    try {
      result = await next();
      failed = false;
      return result;
    } finally {
      try {
        this.metrics.record(context.toolName, performance.now() - started, failed, result);
      } catch {
        // Observability must never replace a tool result or its original error.
      }
    }
  }
}
