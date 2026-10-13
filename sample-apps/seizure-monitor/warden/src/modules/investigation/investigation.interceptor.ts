/**
 * Auto-appends every tool call to whichever investigation is currently
 * active (set when the investigate_threat prompt is fetched), so the audit
 * trace is complete without requiring the agent to log tool use itself —
 * only its decisions (via note_decision) are its responsibility.
 *
 * NitroStack's InterceptorInterface only exposes (context, next) — it has
 * no access to the tool's raw input — so unlike v1's hand-rolled server,
 * this can't record an args_summary. The outcome text (which every tool
 * here echoes its key inputs into, e.g. source_url) carries that instead.
 */

import { Interceptor, type InterceptorInterface, type ExecutionContext } from "@nitrostack/core";
import { investigationStore } from "./store.js";

function summarize(value: unknown, max = 300): string {
  const json = JSON.stringify(value);
  if (json === undefined) return String(value);
  return json.length > max ? json.slice(0, max) + "…" : json;
}

@Interceptor()
export class InvestigationTraceInterceptor implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    const currentId = investigationStore.getCurrentId();
    const toolName = context.toolName ?? "unknown_tool";
    try {
      const result = await next();
      if (currentId) investigationStore.addToolStep(currentId, toolName, summarize(result));
      return result;
    } catch (error) {
      if (currentId) {
        const message = error instanceof Error ? error.message : String(error);
        investigationStore.addToolStep(currentId, toolName, `ERROR: ${message}`);
      }
      throw error;
    }
  }
}
