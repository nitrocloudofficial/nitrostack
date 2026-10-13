import { Module } from '@nitrostack/core';
import { runWithRequestHeaders } from './request-context.js';

/**
 * Bridges HTTP request headers into NitroStack's tool ExecutionContext.
 *
 * The current NitroStack transport does not copy HTTP headers into the MCP
 * request context. This module installs a small Express middleware before the
 * MCP routes so guards can still honor x-api-key/Authorization headers without
 * putting credentials in tool arguments.
 */
@Module({
  name: 'http-context',
  description: 'HTTP request context bridge for authenticated MCP calls',
})
export class HttpContextModule {
  private static server: any;

  static forRoot() {
    return {
      module: HttpContextModule,
      providers: [],
    };
  }

  static attachServer(server: unknown): void {
    HttpContextModule.server = server;
  }

  async start(): Promise<void> {
    const transport = HttpContextModule.server?.getHttpTransport?.();
    const app = transport?.getApp?.();
    const stack = app?._router?.stack;
    if (!app || !Array.isArray(stack)) return;

    const marker = 'vitalis-request-context';
    if (stack.some((layer: any) => layer?.handle?.[marker])) return;

    const middleware = (req: any, _res: any, next: () => void) => {
      return runWithRequestHeaders(req.headers ?? {}, next);
    };
    (middleware as any)[marker] = true;

    app.use(middleware);
    const layer = stack.pop();
    if (!layer) return;

    // Express registers routes before module.start() runs. Move the newly
    // registered middleware ahead of the first /mcp route while leaving body
    // parsers and CORS middleware in their original order.
    const routeIndex = stack.findIndex((item: any) => item?.route?.path === '/mcp');
    stack.splice(routeIndex >= 0 ? routeIndex : stack.length, 0, layer);
  }
}
