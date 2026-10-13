/**
 * SentinelPay AI — Shared Tool Adapter Runtime
 * Source: Technical Specification §5.1 (Tool architecture standard)
 *
 * Every MCP tool follows the same pipeline:
 *   MCP Adapter → Authentication → Authorization → Request Envelope Check
 *   → Input Schema Validation → Service Layer → Structured Output → Audit Event
 *
 * This module is that pipeline, written once, so every `*.tools.ts` file
 * only has to supply a tool name, a parser, and a service call — it
 * cannot accidentally skip auth, skip the envelope check, skip audit, or
 * reorder the sequence.
 *
 * NitroStack registration note (§16.2): the exact `@nitrostack/core` call
 * that wires a tool descriptor (name/description/inputSchema/handler)
 * into the running MCP server must be taken from the installed SDK
 * version's scaffold. This module and every `*.tools.ts` file are
 * deliberately framework-agnostic so they can be registered unchanged
 * once that exact call is confirmed — see `src/app.module.ts`.
 */

import { authenticate } from "../security/auth.js";
import { assertToolAuthorized } from "../security/authorization.js";
import { validateRequestEnvelope } from "../security/input-validation.js";
import { auditService } from "../services/audit.service.js";
import { metrics } from "../observability/metrics.js";
import { logger } from "../observability/logger.js";
import { toErrorResponse } from "../domain/errors.js";

export interface ToolInvocationContext {
  /** Threaded across user request → agent → tool calls → risk → approval (§13.4). */
  correlationId: string;
  /** Raw `Authorization` header value, e.g. `"Bearer <token>"`. */
  authorizationHeader?: string;
  /** Present once an investigation case exists; omitted for the first call in a chain. */
  caseId?: string;
}

/**
 * Runs one tool invocation through the full mandated pipeline. `parseInput`
 * must throw `InvalidInputError` (via `domain/schemas.ts`) on bad input —
 * it runs only after authentication, authorization, and the request
 * envelope check succeed. `rawInput` is the same unvalidated payload
 * `parseInput` will later parse; it is checked here first against the
 * generic envelope rules (size cap, no shell/SQL/script content) shared
 * by every tool (§12.7, §12.8), before any per-tool schema runs.
 */
export function runTool<TInput, TOutput>(
  toolName: string,
  ctx: ToolInvocationContext,
  rawInput: unknown,
  parseInput: () => TInput,
  execute: (input: TInput) => TOutput
): TOutput {
  const start = Date.now();
  const caseId = ctx.caseId ?? "UNSCOPED";

  // Authentication → Authorization (§5.1)
  authenticate(ctx.authorizationHeader);
  assertToolAuthorized(toolName);

  // Request Envelope Check (§5.1, §12.7, §12.8) — runs on the raw payload,
  // before any per-tool schema gets a chance to interpret it.
  validateRequestEnvelope(rawInput, `${toolName} input`);

  // Input Schema Validation (§5.1, §12.7)
  const input = parseInput();

  metrics.increment("tool_calls_total");

  try {
    // Service Layer → Structured Output (§5.1)
    const result = execute(input);
    const durationMs = Date.now() - start;

    metrics.observeLatency(toolName, durationMs);
    auditService.recordToolCall(caseId, ctx.correlationId, toolName, "SUCCESS");
    logger.info("tool.completed", {
      tool: toolName,
      correlationId: ctx.correlationId,
      caseId,
      durationMs,
      status: "SUCCESS",
    });

    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    const { code } = toErrorResponse(err);

    metrics.increment("tool_errors_total");
    metrics.observeLatency(toolName, durationMs);
    auditService.recordToolCall(caseId, ctx.correlationId, toolName, "FAILURE");
    logger.error("tool.failed", {
      tool: toolName,
      correlationId: ctx.correlationId,
      caseId,
      durationMs,
      status: "FAILURE",
      errorCode: code,
    });

    // Audit Event recorded above even on failure — never swallowed (§5.1, §12.5).
    throw err;
  }
}
