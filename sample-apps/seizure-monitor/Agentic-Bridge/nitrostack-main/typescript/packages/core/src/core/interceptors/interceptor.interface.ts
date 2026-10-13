import 'reflect-metadata';
import { ExecutionContext } from '../types.js';

/**
 * Interceptor Interface
 * 
 * Interceptors can transform the input or output of a tool execution.
 * They're executed after guards but before the actual tool handler.
 * 
 * @example
 * ```typescript
 * @Interceptor()
 * export class TransformInterceptor implements InterceptorInterface {
 *   async intercept(context: ExecutionContext, next: () => Promise<unknown>) {
 *     const result = await next();
 *     return {
 *       success: true,
 *       data: result,
 *       timestamp: new Date().toISOString()
 *     };
 *   }
 * }
 * ```
 */
export interface InterceptorInterface {
  intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown>;
}

/**
 * Interceptor constructor type
 */
export type InterceptorConstructor = new (...args: unknown[]) => InterceptorInterface;

