import { ExecutionContext } from '../types.js';

/**
 * Guard interface for protecting tool execution
 * Guards can perform authentication, authorization, validation, etc.
 */
export interface Guard {
  /**
   * Determines if the current execution context is allowed to proceed
   * @param context Execution context with request metadata
   * @returns true if allowed, false if denied, or throws an error
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

/**
 * Type for guard constructor
 */
export type GuardConstructor = new (...args: unknown[]) => Guard;

