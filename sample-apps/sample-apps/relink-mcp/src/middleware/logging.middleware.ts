import { type ExecutionContext, type MiddlewareInterface, Middleware as MiddlewareDecorator } from '@nitrostack/core';

@MiddlewareDecorator()
export class LoggingMiddleware implements MiddlewareInterface {
  async use(context: ExecutionContext, next: () => Promise<void>): Promise<unknown> {
    const start = Date.now();
    const toolName = context.toolName || 'unknown';

    context.logger.info(`[${toolName}] Started`);

    try {
      const result = await next();
      const duration = Date.now() - start;
      context.logger.info(`[${toolName}] Completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      context.logger.error(`[${toolName}] Failed after ${duration}ms`, {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
