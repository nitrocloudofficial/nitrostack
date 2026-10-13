import {
  ExceptionFilterInterface,
  ExecutionContext,
  Injectable,
} from '@nitrostack/core';

/**
 * Ingestion-scoped exception filter.
 *
 * Catches any Error thrown inside an ingestion tool handler and returns a
 * structured JSON payload instead of letting the raw stack trace bubble up to
 * the MCP client.
 */
@Injectable()
export class IngestionExceptionFilter implements ExceptionFilterInterface {
  catch(exception: unknown, context: ExecutionContext) {
    const message =
      exception instanceof Error ? exception.message : String(exception);

    context.logger?.error(`[IngestionExceptionFilter] ${message}`);

    return {
      success: false,
      error: 'ingestion_error',
      message,
      timestamp: new Date().toISOString(),
    };
  }
}
