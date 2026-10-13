import 'reflect-metadata';
import { InterceptorConstructor } from './interceptor.interface.js';

const INTERCEPTOR_KEY = 'nitrostack:interceptor';
const IS_INTERCEPTOR_KEY = 'nitrostack:is_interceptor';

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
 * Apply interceptors to a tool method
 * 
 * @example
 * ```typescript
 * @Tool({ name: 'get_user', ... })
 * @UseInterceptors(TransformInterceptor, CacheInterceptor)
 * async getUser(input: Record<string, unknown>) { }
 * ```
 */
export function UseInterceptors(...interceptors: InterceptorConstructor[]): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const existingInterceptors = Reflect.getMetadata(INTERCEPTOR_KEY, target, propertyKey) || [];
    Reflect.defineMetadata(
      INTERCEPTOR_KEY,
      [...existingInterceptors, ...interceptors],
      target,
      propertyKey
    );
  };
}

/**
 * Get interceptors for a method
 */
export function getInterceptorMetadata(target: object, propertyKey: string | symbol): InterceptorConstructor[] {
  return Reflect.getMetadata(INTERCEPTOR_KEY, target, propertyKey) || [];
}

/**
 * Check if a class is marked as an interceptor
 */
export function isInterceptor(target: object): boolean {
  return Reflect.getMetadata(IS_INTERCEPTOR_KEY, target) === true;
}

