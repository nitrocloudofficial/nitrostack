import { ExceptionFilter, ExceptionFilterInterface, ExecutionContext } from '@nitrostack/core';

/**
 * Global exception filter — the backstop for any error thrown during tool
 * execution (e.g. an upstream API changing shape). Returns a clean, user-facing
 * message and logs the details internally; never leaks stack traces.
 */
@ExceptionFilter()
export class GlobalExceptionFilter implements ExceptionFilterInterface {
    catch(exception: unknown, context: ExecutionContext) {
        const err = exception as { message?: string; code?: string; status?: number };
        const message = err?.message ?? String(exception);

        context.logger?.error?.('Tool execution failed', {
            tool: context.toolName,
            requestId: context.requestId,
            code: err?.code,
            message,
        });

        return {
            isError: true,
            error: message,
            tool: context.toolName,
            timestamp: new Date().toISOString(),
        };
    }
}
