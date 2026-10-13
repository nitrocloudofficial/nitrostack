/**
 * ============================================================================
 * ExecutionContext bridge — Backend B server infrastructure
 * ============================================================================
 *
 * Closes two gaps between what the PassportIQ build docs tell us to write and
 * what @nitrostack/core@1.0.14 actually provides. Both were found by reading
 * the installed package, not the documentation.
 *
 * GAP 1 — `ctx.emit(...)` does not exist.
 *   Every build doc, and NitroStack's own events guide, ends a tool with
 *   `ctx.emit('pipeline.stage_completed', ...)`. But `ExecutionContext` declares
 *   no `emit` (dist/core/types.d.ts:268) and `createContext()` never adds one
 *   (dist/core/server.js:479). The working API is the standalone `emitEvent`
 *   export. Un-bridged, every stage in the pipeline throws
 *   "ctx.emit is not a function" the first time it completes — i.e. the live
 *   dashboard never receives a single event.
 *
 * GAP 2 — guards cannot see tool input.
 *   Guards are invoked as `guard.canActivate(context)` (dist/core/tool.js:59).
 *   The input is never passed. PipelineCompleteGuard has to know WHICH
 *   application it is gating, and `applicationId` only exists in the input.
 *
 * Both are fixed by wrapping each registered tool's `execute` once at boot, so
 * the context every guard and handler receives has `emit` and `input` attached.
 * Nothing in the rest of the codebase needs to know this happened — teammates
 * keep writing `ctx.emit(...)` exactly as their build docs specify.
 *
 * The type side of this lives in ./nitrostack-augmentation.d.ts.
 *
 * If a future @nitrostack/core ships a native `emit`, this whole file can be
 * deleted: the wrapper deliberately does not overwrite an existing `emit`.
 */
import { emitEvent } from '@nitrostack/core';
import type { ExecutionContext, Logger } from '@nitrostack/core';

/** Minimal structural view of the internals we reach into. */
interface RegisteredTool {
  name?: string;
  execute(input: unknown, context: ExecutionContext): Promise<unknown>;
}

interface ServerInternals {
  tools: Map<string, RegisteredTool>;
}

/** Marker so a double bootstrap cannot double-wrap a tool. */
const BRIDGED = Symbol.for('passportiq.contextBridged');

type Bridgeable = RegisteredTool & { [BRIDGED]?: boolean };

/**
 * Attach `emit` and `input` to a context object in place.
 *
 * Exported so unit tests can build a bare context and exercise guards/tools
 * without booting a server.
 */
export function bridgeContext(
  context: ExecutionContext | undefined,
  input: unknown
): ExecutionContext | undefined {
  if (!context || typeof context !== 'object') return context;

  const mutable = context as ExecutionContext & {
    emit?: (event: string, payload: unknown) => void;
    input?: Record<string, unknown>;
  };

  // Never clobber a native implementation if @nitrostack/core gains one.
  if (typeof mutable.emit !== 'function') {
    mutable.emit = (event: string, payload: unknown): void => {
      // emitEvent is fire-and-forget: it calls EventEmitter.emit() and swallows
      // handler rejections into console.error. That asymmetry is deliberate —
      // a failing dashboard listener must never fail a verification stage.
      emitEvent(event, payload);
    };
  }

  if (input && typeof input === 'object') {
    mutable.input = input as Record<string, unknown>;
  }

  return mutable;
}

/**
 * Wrap every tool registered on the server so its context is bridged.
 *
 * Call AFTER `McpApplicationFactory.create(...)` (all tools registered) and
 * BEFORE `app.start()` (no requests served yet).
 *
 * @returns number of tools bridged — logged at boot so a silent no-op (e.g. the
 *          private `tools` map being renamed by a core upgrade) is visible
 *          immediately instead of at demo time.
 */
export function installExecutionContextBridge(server: unknown, logger?: Logger): number {
  const internals = server as ServerInternals | undefined;
  const tools = internals?.tools;

  if (!(tools instanceof Map)) {
    // `tools` is typed private on NitroStackServer but is a plain enumerable
    // property at runtime. If that ever stops being true, fail loudly: silently
    // skipping the bridge would mean no dashboard events and an
    // always-denying decision guard, both of which look like "the demo is
    // broken" rather than "an internal changed".
    throw new Error(
      'installExecutionContextBridge: could not find the server tool registry. ' +
        '@nitrostack/core internals have changed — ctx.emit and PipelineCompleteGuard ' +
        'both depend on this bridge. See src/bootstrap/execution-context.bridge.ts.'
    );
  }

  let bridged = 0;

  for (const tool of tools.values()) {
    const candidate = tool as Bridgeable;
    if (candidate[BRIDGED]) continue;

    const originalExecute = candidate.execute.bind(candidate);

    candidate.execute = async (input: unknown, context: ExecutionContext): Promise<unknown> => {
      bridgeContext(context, input);
      return originalExecute(input, context);
    };

    candidate[BRIDGED] = true;
    bridged += 1;
  }

  logger?.info(`✓ ExecutionContext bridge installed (ctx.emit + ctx.input) on ${bridged} tool(s)`);

  return bridged;
}
