import {
  UseFilters,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nitrostack/core';
import { ApiKeyGuard } from './api-key.guard.js';
import { ScopeGuard } from './scope.guard.js';
import { EmergencyDetectionGuard } from './emergency-detection.guard.js';
import { ClinicalSafetyInterceptor } from './clinical-safety.interceptor.js';
import { AuditLogInterceptor } from './audit-log.interceptor.js';
import { TimingInterceptor } from './timing.interceptor.js';
import { ClinicalExceptionFilter } from './clinical-exception.filter.js';
import { TrimPipe } from './trim.pipe.js';
import { getExternalCalls, runWithExternalCallContext } from './request-context.js';

/**
 * Applies Vitalis' common clinical request pipeline to a tool method.
 *
 * NitroStack currently exposes method-level pipeline decorators, so keeping the
 * composition here prevents the six modules from drifting apart. The wrapper
 * also records the input on the execution context for post-handler safety and
 * audit processing; the framework itself does not pass tool arguments to guards
 * or interceptors.
 */
export function UseClinicalGateway(): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    UseGuards(EmergencyDetectionGuard, ApiKeyGuard, ScopeGuard)(
      target,
      propertyKey as string,
      descriptor,
    );
    UsePipes(TrimPipe)(target, propertyKey as string, descriptor);
    // Audit wraps timing and safety so it observes the final sanitized response
    // and the duration metadata rather than the pre-interceptor tool result.
    UseInterceptors(
      AuditLogInterceptor as any,
      TimingInterceptor as any,
      ClinicalSafetyInterceptor,
    )(target, propertyKey, descriptor);
    UseFilters(ClinicalExceptionFilter as any)(
      target,
      propertyKey as string,
      descriptor,
    );

    const methodDescriptor = descriptor as PropertyDescriptor & {
      value?: (...args: any[]) => any;
    };
    const original = methodDescriptor?.value;
    if (typeof original === 'function') {
      methodDescriptor.value = function (this: unknown, input: unknown, context: any, ...args: unknown[]) {
        if (context && typeof context === 'object') {
          context.input = input;
          context.args = [input, ...args];
        }
        return runWithExternalCallContext(async () => {
          try {
            const result = await original.apply(this, [input, context, ...args]);
            context.external_calls = getExternalCalls();
            return result;
          } catch (error) {
            context.external_calls = getExternalCalls();
            throw error;
          }
        });
      };
    }

    return descriptor;
  };
}
