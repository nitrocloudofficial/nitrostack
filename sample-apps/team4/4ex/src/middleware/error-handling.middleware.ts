import { Middleware, MiddlewareInterface, ExecutionContext } from '@nitrostack/core';
import { KnowledgeInputError, KnowledgeDataError } from '../services/data-loader.service.js';

/**
 * Global error handling middleware for the Knowledge Integrity MCP server.
 *
 * Catches known domain errors (KnowledgeInputError, KnowledgeDataError) and
 * formats them into user-friendly JSON payloads. Unknown errors are wrapped
 * with a generic message to avoid leaking internal details.
 *
 * Applied via `@UseMiddleware(ErrorHandlingMiddleware)` on individual tools,
 * or registered at the module level for blanket coverage.
 */
@Middleware()
export class ErrorHandlingMiddleware implements MiddlewareInterface {
  async use(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    try {
      return await next();
    } catch (error) {
      return formatError(error, context);
    }
  }
}

function formatError(error: unknown, context: ExecutionContext): {
  success: false;
  error: {
    type: string;
    message: string;
    tool?: string;
    timestamp: string;
  };
} {
  const timestamp = new Date().toISOString();
  const toolName = (context as unknown as Record<string, unknown>).toolName as string | undefined;

  if (error instanceof KnowledgeInputError) {
    context.logger.warn(`Input validation error in ${toolName ?? 'unknown'}: ${error.message}`);
    return {
      success: false,
      error: {
        type: 'INPUT_VALIDATION_ERROR',
        message: error.message,
        ...(toolName ? { tool: toolName } : {}),
        timestamp,
      },
    };
  }

  if (error instanceof KnowledgeDataError) {
    context.logger.error(`Data integrity error in ${toolName ?? 'unknown'}: ${error.message}`);
    return {
      success: false,
      error: {
        type: 'DATA_INTEGRITY_ERROR',
        message: `Knowledge base data error: ${error.message}`,
        ...(toolName ? { tool: toolName } : {}),
        timestamp,
      },
    };
  }

  if (error instanceof Error) {
    context.logger.error(`Unexpected error in ${toolName ?? 'unknown'}: ${error.message}`);
    return {
      success: false,
      error: {
        type: 'INTERNAL_ERROR',
        message: `An unexpected error occurred: ${error.message}`,
        ...(toolName ? { tool: toolName } : {}),
        timestamp,
      },
    };
  }

  context.logger.error(`Unknown error in ${toolName ?? 'unknown'}: ${String(error)}`);
  return {
    success: false,
    error: {
      type: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      ...(toolName ? { tool: toolName } : {}),
      timestamp,
    },
  };
}
