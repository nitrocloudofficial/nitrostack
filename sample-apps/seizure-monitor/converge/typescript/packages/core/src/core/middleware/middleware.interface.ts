import 'reflect-metadata';
import { ExecutionContext } from '../types.js';

/**
 * Middleware Interface
 * 
 * Middleware can intercept tool execution for cross-cutting concerns
 * like logging, authentication, validation, etc.
 * 
 * @example
 * ```typescript
 * @Middleware()
 * export class LoggingMiddleware implements MiddlewareInterface {
 *   async use(context: ExecutionContext, next: () => Promise<unknown>) {
 *     console.log('Before:', context.toolName);
 *     const result = await next();
 *     console.log('After:', context.toolName);
 *     return result;
 *   }
 * }
 * ```
 */
export interface MiddlewareInterface {
  use(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown>;
}

/**
 * Middleware constructor type
 */
export type MiddlewareConstructor = new (...args: unknown[]) => MiddlewareInterface;

