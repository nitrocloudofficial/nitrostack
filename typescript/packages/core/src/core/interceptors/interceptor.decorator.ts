import 'reflect-metadata';
import { InterceptorType } from './interceptor.interface.js';

export const INTERCEPTOR_KEY = 'nitrostack:interceptor';
export const IS_INTERCEPTOR_KEY = 'nitrostack:is_interceptor';

/**
 * Marks a class as an interceptor
 * 
 * @example
 * ```typescript
 * @Interceptor()
 * export class TransformInterceptor implements InterceptorInterface {
 *   async intercept(context: ExecutionContext, next: () => Promise<unknown>) {
 *     const result = await next();
 *     return { success: true, data: result, timestamp: Date.now() };
 *   }
 * }
 * ```
 */
export function Interceptor(): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(IS_INTERCEPTOR_KEY, true, target);
  };
}

/**
 * Apply interceptors to a tool method or to an entire controller class.
 * Supports both class constructors and pre-configured instances.
 *
 * @example
 * ```typescript
 * // Method-level with instance
 * @Tool({ name: 'large_query' })
 * @UseInterceptors(new DataSpilloverInterceptor({ maxPayloadBytes: 10240 }))
 * async getLargeData() { ... }
 *
 * // Class-level with factory
 * @Controller()
 * @UseInterceptors(DataSpilloverInterceptor.configure({ maxPayloadBytes: 20480 }))
 * export class EnterpriseDataController { ... }
 * ```
 */
export function UseInterceptors(...interceptors: InterceptorType[]) {
  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    if (descriptor && propertyKey) {
      // Method-level decorator
      const existing: InterceptorType[] = Reflect.getMetadata(INTERCEPTOR_KEY, target, propertyKey) || [];
      Reflect.defineMetadata(INTERCEPTOR_KEY, [...existing, ...interceptors], target, propertyKey);
      return descriptor;
    } else {
      // Class-level decorator (target is constructor)
      const existing: InterceptorType[] = Reflect.getMetadata(INTERCEPTOR_KEY, target) || [];
      Reflect.defineMetadata(INTERCEPTOR_KEY, [...existing, ...interceptors], target);
      return target;
    }
  };
}

/**
 * Retrieves interceptors for a method, combining class-level and method-level metadata.
 */
export function getInterceptorMetadata(target: object, propertyKey?: string | symbol): InterceptorType[] {
  const methodInterceptors: InterceptorType[] = propertyKey
    ? Reflect.getMetadata(INTERCEPTOR_KEY, target, propertyKey) || []
    : [];

  // Class constructor metadata
  const ctor = typeof target === 'function' ? target : (target as any)?.constructor;
  const classInterceptors: InterceptorType[] = ctor
    ? Reflect.getMetadata(INTERCEPTOR_KEY, ctor) || []
    : [];

  return [...classInterceptors, ...methodInterceptors];
}

/**
 * Check if a class is marked as an interceptor
 */
export function isInterceptor(target: object): boolean {
  return Reflect.getMetadata(IS_INTERCEPTOR_KEY, target) === true;
}
