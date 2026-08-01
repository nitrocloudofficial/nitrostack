import { Interceptor, Injectable, type InterceptorInterface, type ExecutionContext } from '@nitrostack/core';
import { ActivityService } from './activity.service.js';

/**
 * ActivityInterceptor — wraps @Tool calls into ActivityEvents.
 *
 * CONFIRMED LIMITATION, not an oversight: `buildResource`/`buildPrompt` in
 * node_modules/@nitrostack/core/dist/core/builders.js never call
 * `getInterceptorMetadata` at all — only `buildTool` does. There is no
 * `@UseInterceptors` equivalent for resources or prompts in this framework
 * version, and no global/app-level interceptor registration hook either
 * (`Interceptor()`/`UseInterceptors()` are the only two exports, and
 * `UseInterceptors` is typed as a `MethodDecorator` applied per @Tool
 * method). Resource and prompt activity logging is therefore done by
 * calling `ActivityService.record()` directly inside each handler in
 * catalog.resources.ts / catalog.prompts.ts — there's no decorator path
 * for it.
 *
 * Apply with `@UseInterceptors(ActivityInterceptor)` on each @Tool method.
 * I can only apply this to forge.tools.ts (mine). I can't add it to
 * ingest.tools.ts without violating "don't edit ingest" — flagging that
 * parse_spec/plan_tool_surface won't appear in the activity log/console
 * until someone adds two `@UseInterceptors(ActivityInterceptor)` lines
 * there themselves.
 */
@Interceptor()
@Injectable({ deps: [ActivityService] })
export class ActivityInterceptor implements InterceptorInterface {
  constructor(private readonly activity: ActivityService) {}

  async intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    const start = Date.now();
    const name = context.toolName ?? 'unknown';
    try {
      const result = await next();
      await this.activity.record({
        ts: new Date().toISOString(),
        kind: 'tool',
        method: 'tools/call',
        name,
        durationMs: Date.now() - start,
        status: 'ok',
        detail: this.summarize(result),
      });
      return result;
    } catch (err) {
      await this.activity.record({
        ts: new Date().toISOString(),
        kind: 'tool',
        method: 'tools/call',
        name,
        durationMs: Date.now() - start,
        status: 'error',
        detail: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  private summarize(result: unknown): string | null {
    if (result == null) return null;
    try {
      const json = JSON.stringify(result);
      return json.length > 200 ? json.slice(0, 200) + '…' : json;
    } catch {
      return null;
    }
  }
}
