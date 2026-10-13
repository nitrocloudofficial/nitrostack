import {
  Middleware,
  MiddlewareInterface,
  Pipe,
  PipeInterface,
  ArgumentMetadata,
  ExecutionContext
} from '@nitrostack/core';

/**
 * Request logging & validation pipeline for ProjectPilot AI tools.
 *
 * - LoggingMiddleware wraps every tool call with start/end/error logs and
 *   timing (applied via @UseMiddleware).
 * - ValidationPipe runs against the full input object before the handler
 *   executes, rejecting blank strings / empty required arrays that a zod
 *   schema alone won't catch (applied via @UsePipes).
 */

@Middleware()
export class LoggingMiddleware implements MiddlewareInterface {
  async use(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    const toolName = context.toolName ?? 'unknown_tool';
    const startedAt = Date.now();

    context.logger.info(`-> ${toolName} started`, { requestId: context.requestId });

    try {
      const result = await next();
      context.logger.info(`<- ${toolName} completed`, {
        requestId: context.requestId,
        durationMs: Date.now() - startedAt
      });
      return result;
    } catch (error) {
      context.logger.error(`x ${toolName} failed`, {
        requestId: context.requestId,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

const ALLOWED_EMPTY_ARRAY_FIELDS = new Set(['installation_steps', 'attendees', 'team_members']);

@Pipe()
export class ValidationPipe implements PipeInterface<Record<string, unknown>, Record<string, unknown>> {
  transform(value: Record<string, unknown>, _metadata: ArgumentMetadata): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return value;
    }

    for (const [key, fieldValue] of Object.entries(value)) {
      if (typeof fieldValue === 'string' && fieldValue.trim().length === 0) {
        throw new Error(`Validation failed: "${key}" must not be an empty string`);
      }
      if (Array.isArray(fieldValue) && fieldValue.length === 0 && !ALLOWED_EMPTY_ARRAY_FIELDS.has(key)) {
        throw new Error(`Validation failed: "${key}" must not be an empty array`);
      }
    }

    return value;
  }
}
