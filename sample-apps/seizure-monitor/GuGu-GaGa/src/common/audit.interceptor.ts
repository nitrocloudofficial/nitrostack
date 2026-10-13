/**
 * CREED-Lite — Audit Interceptor
 *
 * Wraps every tool invocation with execution timing and audit metadata.
 * Applied via @UseInterceptors(AuditInterceptor) on controller methods.
 */

import { Interceptor, ExecutionContext } from '@nitrostack/core';
import type { InterceptorInterface } from '@nitrostack/core';

@Interceptor()
export class AuditInterceptor implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    const start = Date.now();

    try {
      const result = await next();
      const durationMs = Date.now() - start;

      // Attach audit metadata to every successful response
      if (result && typeof result === 'object') {
        return {
          ...(result as Record<string, unknown>),
          _audit: {
            timestamp: new Date().toISOString(),
            durationMs,
            serverVersion: '2.0.0',
          },
        };
      }

      return result;
    } catch (error) {
      const durationMs = Date.now() - start;
      // Re-throw but log the duration
      const err = error as Error;
      err.message = `[${durationMs}ms] ${err.message}`;
      throw err;
    }
  }
}
