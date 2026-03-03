import 'reflect-metadata';
import { ExecutionContext } from '../types.js';

/**
 * Exception with optional status code
 */
export interface ExceptionWithStatus extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

/**
 * Exception Filter Interface
 * 
 * Exception filters handle errors thrown during tool execution.
 * They can transform errors into user-friendly responses.
 * 
 * @example
 * ```typescript
 * @ExceptionFilter()
 * export class HttpExceptionFilter implements ExceptionFilterInterface {
 *   catch(exception: unknown, context: ExecutionContext) {
 *     const err = exception as ExceptionWithStatus;
 *     return {
 *       statusCode: err.status || 500,
 *       message: err.message,
 *       timestamp: new Date().toISOString(),
 *     };
 *   }
 * }
 * ```
 */
export interface ExceptionFilterInterface {
  catch(exception: unknown, context: ExecutionContext): unknown | Promise<unknown>;
}

/**
 * Exception filter constructor type
 */
export type ExceptionFilterConstructor = new (...args: unknown[]) => ExceptionFilterInterface;

