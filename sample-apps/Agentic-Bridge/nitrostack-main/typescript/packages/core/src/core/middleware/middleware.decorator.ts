import 'reflect-metadata';
import { MiddlewareConstructor } from './middleware.interface.js';

const MIDDLEWARE_KEY = 'nitrostack:middleware';
const IS_MIDDLEWARE_KEY = 'nitrostack:is_middleware';

/**
 * Marks a class as a middleware
 * 
 * @example
 * ```typescript
 * @Middleware()
 * export class LoggingMiddleware implements MiddlewareInterface {
 *   async use(context: ExecutionContext, next: () => Promise<unknown>) {
 *     console.log('Before');
 *     const result = await next();
 *     console.log('After');
 *     return result;
 *   }
 * }
 * ```
 */
export function Middleware(): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(IS_MIDDLEWARE_KEY, true, target);
  };
}

/**
 * Apply middleware to a tool method
 * 
 * @example
 * ```typescript
 * @Tool({ name: 'my_tool', ... })
 * @UseMiddleware(LoggingMiddleware, AuthMiddleware)
 * async myTool(input: Record<string, unknown>, context: ExecutionContext) { }
 * ```
 */
export function UseMiddleware(...middlewares: MiddlewareConstructor[]): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const existingMiddlewares = Reflect.getMetadata(MIDDLEWARE_KEY, target, propertyKey) || [];
    Reflect.defineMetadata(
      MIDDLEWARE_KEY,
      [...existingMiddlewares, ...middlewares],
      target,
      propertyKey
    );
  };
}

/**
 * Get middlewares for a method
 */
export function getMiddlewareMetadata(target: object, propertyKey: string | symbol): MiddlewareConstructor[] {
  return Reflect.getMetadata(MIDDLEWARE_KEY, target, propertyKey) || [];
}

/**
 * Check if a class is marked as middleware
 */
export function isMiddleware(target: object): boolean {
  return Reflect.getMetadata(IS_MIDDLEWARE_KEY, target) === true;
}

