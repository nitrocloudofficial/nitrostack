import { type ExecutionContext, type MiddlewareInterface, Middleware as MiddlewareDecorator } from '@nitrostack/core';
import { randomUUID } from 'crypto';

@MiddlewareDecorator()
export class RequestIdMiddleware implements MiddlewareInterface {
  async use(context: ExecutionContext, next: () => Promise<void>): Promise<unknown> {
    context.metadata = context.metadata || {};
    (context.metadata as Record<string, unknown>).requestId = randomUUID();
    return await next();
  }
}
