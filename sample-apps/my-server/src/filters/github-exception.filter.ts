import {
  ExceptionFilter,
  ExceptionFilterInterface,
  ExecutionContext,
  Injectable,
  JsonValue,
  McpError,
} from '@nitrostack/core';

/**
 * Maps internal and GitHub API errors into stable MCP-friendly JSON errors.
 */
@ExceptionFilter()
@Injectable()
export class GitHubExceptionFilter implements ExceptionFilterInterface {
  catch(exception: unknown, context: ExecutionContext) {
    const timestamp = new Date().toISOString();

    if (exception instanceof McpError) {
      context.logger.error(exception.message, {
        code: exception.code,
        details: this.normalizeDetails(exception.details),
      });

      return {
        success: false,
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
        },
        meta: {
          requestId: context.requestId,
          timestamp,
          source: 'github-deploy-agent',
        },
      };
    }

    if (exception instanceof Error) {
      context.logger.error(exception.message, { stack: exception.stack });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: exception.message,
        },
        meta: {
          requestId: context.requestId,
          timestamp,
          source: 'github-deploy-agent',
        },
      };
    }

    context.logger.error('Unknown exception in GitHub tool', {
      details: this.normalizeDetails(exception),
    });
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred while executing the GitHub tool.',
        details: exception,
      },
      meta: {
        requestId: context.requestId,
        timestamp,
        source: 'github-deploy-agent',
      },
    };
  }

  private normalizeDetails(value: unknown): JsonValue {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (value instanceof Error) {
      return { message: value.message, stack: value.stack };
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeDetails(item));
    }

    if (value && typeof value === 'object') {
      const objectValue = value as Record<string, unknown>;
      const normalized: Record<string, JsonValue> = {};
      for (const [key, entry] of Object.entries(objectValue)) {
        normalized[key] = this.normalizeDetails(entry);
      }
      return normalized;
    }

    return String(value);
  }
}
