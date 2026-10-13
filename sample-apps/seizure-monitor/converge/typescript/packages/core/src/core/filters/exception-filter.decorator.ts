import 'reflect-metadata';
import { ExceptionFilterConstructor } from './exception-filter.interface.js';

const EXCEPTION_FILTER_KEY = 'nitrostack:exception_filter';
const IS_EXCEPTION_FILTER_KEY = 'nitrostack:is_exception_filter';

/**
 * Marks a class as an exception filter
 * 
 * @example
 * ```typescript
 * @ExceptionFilter()
 * export class GlobalExceptionFilter implements ExceptionFilterInterface {
 *   catch(exception: unknown, context: ExecutionContext) {
 *     context.logger.error('Exception caught:', exception);
 *     return {
 *       error: exception instanceof Error ? exception.message : String(exception),
 *       timestamp: new Date().toISOString(),
 *     };
 *   }
 * }
 * ```
 */
export function ExceptionFilter(): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(IS_EXCEPTION_FILTER_KEY, true, target);
  };
}

/**
 * Apply exception filters to a tool method
 * 
 * @example
 * ```typescript
 * @Tool({ name: 'create_user', ... })
 * @UseFilters(ValidationExceptionFilter, HttpExceptionFilter)
 * async createUser(input: Record<string, unknown>) { }
 * ```
 */
export function UseFilters(...filters: ExceptionFilterConstructor[]): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const existingFilters = Reflect.getMetadata(EXCEPTION_FILTER_KEY, target, propertyKey) || [];
    Reflect.defineMetadata(
      EXCEPTION_FILTER_KEY,
      [...existingFilters, ...filters],
      target,
      propertyKey
    );
  };
}

/**
 * Get exception filters for a method
 */
export function getExceptionFilterMetadata(target: object, propertyKey: string | symbol): ExceptionFilterConstructor[] {
  return Reflect.getMetadata(EXCEPTION_FILTER_KEY, target, propertyKey) || [];
}

/**
 * Check if a class is marked as an exception filter
 */
export function isExceptionFilter(target: object): boolean {
  return Reflect.getMetadata(IS_EXCEPTION_FILTER_KEY, target) === true;
}

