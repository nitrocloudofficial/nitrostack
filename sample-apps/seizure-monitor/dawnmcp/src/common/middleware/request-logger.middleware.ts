import { Injectable, ExecutionContext } from '@nitrostack/core';

/**
 * Request Logger & Connection Diagnostic Middleware
 *
 * Logs request execution telemetry and intercepts MCP connection initialization errors
 * (e.g. "Connection not found: <id>", invalid sessionId, transport mismatches).
 */
@Injectable()
export class RequestLoggerMiddleware {
  async log(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    const start = Date.now();
    const ctxAny = context as unknown as Record<string, unknown>;
    const action = (ctxAny.toolName as string) || (ctxAny.resourceUri as string) || 'mcp-request';

    context.logger.info(`[REQ] Executing ${action}`);

    try {
      const result = await next();
      const duration = Date.now() - start;
      context.logger.info(`[RES] Completed ${action} in ${duration}ms`);
      return result;
    } catch (err) {
      const duration = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes('Connection not found') || message.includes('sessionId')) {
        context.logger.error(
          `[MCP CONNECTION ERROR] ${message}\n` +
          `   Cause: Client tried to reuse a stale/expired SSE connection ID after server restart or transport mismatch.\n` +
          `   Fix: Clear client cached connection state (localStorage/client config) and negotiate a fresh /sse handshake.`,
        );
      } else {
        context.logger.error(`[ERR] Failed ${action} in ${duration}ms: ${message}`);
      }

      throw err;
    }
  }
}
