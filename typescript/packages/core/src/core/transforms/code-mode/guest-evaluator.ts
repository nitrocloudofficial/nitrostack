import { getQuickJS, QuickJSContext, QuickJSRuntime, QuickJSHandle } from 'quickjs-emscripten';
import { ExecutionLimits, SandboxExecutionResult, SandboxLogEntry } from './types.js';

/**
 * Converts a JavaScript value to a QuickJS handle using JSON parsing in the context.
 */
function jsonToHandle(context: QuickJSContext, value: unknown): QuickJSHandle {
  const jsonGlobal = context.getProp(context.global, 'JSON');
  const parseFn = context.getProp(jsonGlobal, 'parse');
  let serialized: string;
  try {
    serialized = JSON.stringify(value === undefined ? null : value);
  } catch {
    serialized = JSON.stringify(String(value));
  }
  const jsonStr = context.newString(serialized);
  try {
    const res = context.callFunction(parseFn, jsonGlobal, jsonStr);
    return context.unwrapResult(res);
  } finally {
    jsonStr.dispose();
    parseFn.dispose();
    jsonGlobal.dispose();
  }
}

/**
 * Executes all pending microtask jobs in the QuickJS runtime.
 */
function pumpMicrotasks(runtime: QuickJSRuntime): void {
  while (runtime.hasPendingJob()) {
    const res = runtime.executePendingJobs();
    if (res && 'error' in res && res.error) {
      res.error.dispose();
    }
  }
}

/**
 * Formats error details into a clean, human- and model-legible message.
 */
function extractErrorMessage(dumped: unknown, limits: ExecutionLimits): string {
  if (dumped && typeof dumped === 'object') {
    const d = dumped as Record<string, unknown>;
    if (d.name === 'InternalError' && d.message === 'interrupted') {
      return `Execution interrupted: timeout exceeded (${limits.timeoutMs}ms)`;
    }
    if (d.name === 'InternalError' && d.message === 'out of memory') {
      return `out of memory: exceeded heap limit of ${limits.memoryLimitMb}MB`;
    }
    if (typeof d.message === 'string' && d.message.length > 0) {
      return d.message;
    }
  }
  return String(dumped);
}

function byteCount(computed: unknown): number | undefined {
  if (typeof computed === 'number' && Number.isFinite(computed)) return computed;
  if (!computed || typeof computed !== 'object') return undefined;
  const record = computed as Record<string, unknown>;
  for (const key of ['memory_used_size', 'malloc_size', 'bytes']) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

/**
 * Memory used by a QuickJS runtime, in megabytes.
 * Prefers a numeric reading. The text dump is the fallback, and a format
 * change or a missing API reports 0 rather than failing the script.
 */
export function memoryUsedMb(runtime: {
  computeMemoryUsage?: () => unknown;
  dumpMemoryUsage?: () => string;
}): number {
  try {
    if (typeof runtime.computeMemoryUsage === 'function') {
      const computed = runtime.computeMemoryUsage();
      const bytes = byteCount(computed);
      const dispose = (computed as { dispose?: () => void } | null)?.dispose;
      if (typeof dispose === 'function') {
        try {
          dispose.call(computed);
        } catch {
          // Handle was already released.
        }
      }
      if (bytes !== undefined) return bytes / (1024 * 1024);
    }
  } catch {
    // Fall through to the text dump.
  }

  try {
    const dump = runtime.dumpMemoryUsage?.() ?? '';
    const match = dump.match(/memory used\s+\d+\s+(\d+)/);
    if (match?.[1]) return parseInt(match[1], 10) / (1024 * 1024);
  } catch {
    // Telemetry only.
  }
  return 0;
}



/**
 * Evaluates JavaScript guest code inside an isolated QuickJS WebAssembly sandbox.
 * Supports async callTool bridging across IPC/host dispatcher, microtask pumping,
 * console capturing, circuit breaker enforcement, and 2-tier timeout protection.
 */
export async function evaluateGuestScript(
  code: string,
  limits: ExecutionLimits,
  ipcToolDispatcher: (name: string, args: Record<string, unknown>) => Promise<unknown>
): Promise<SandboxExecutionResult> {
  const QuickJS = await getQuickJS();
  const runtime = QuickJS.newRuntime();
  const context = runtime.newContext();

  const logs: SandboxLogEntry[] = [];
  const pendingDeferreds = new Set<{ dispose: () => void }>();
  let toolCallCount = 0;
  const startTime = Date.now();
  const deadline = startTime + limits.timeoutMs;

  try {
    // 1. Enforce memory constraints
    runtime.setMemoryLimit(limits.memoryLimitMb * 1024 * 1024);
    runtime.setMaxStackSize(1024 * 1024);

    // 2. Tier 1: Soft Interrupt Handler
    runtime.setInterruptHandler(() => Date.now() > deadline);

    // 3. Inject sandboxed console
    const consoleHandle = context.newObject();
    const createLogFn = (level: 'log' | 'warn' | 'error') => {
      return context.newFunction(level, (...args) => {
        if (logs.length >= 100) return;
        const msg = args
          .map((a) => {
            const d = context.dump(a);
            return typeof d === 'string' ? d : JSON.stringify(d);
          })
          .join(' ');
        logs.push({
          level,
          message: msg.length > 2000 ? `${msg.slice(0, 2000)}…` : msg,
          timestamp: Date.now(),
        });
      });
    };

    const logFn = createLogFn('log');
    const warnFn = createLogFn('warn');
    const errorFn = createLogFn('error');

    context.setProp(consoleHandle, 'log', logFn);
    context.setProp(consoleHandle, 'warn', warnFn);
    context.setProp(consoleHandle, 'error', errorFn);
    context.setProp(context.global, 'console', consoleHandle);

    consoleHandle.dispose();
    logFn.dispose();
    warnFn.dispose();
    errorFn.dispose();

    // 4. Inject callTool() with Promise bridging
    const callToolFn = context.newFunction('callTool', (nameHandle, argsHandle) => {
      toolCallCount++;
      if (toolCallCount > limits.maxToolCalls) {
        throw new Error(`Circuit breaker: exceeded maximum allowed tool calls (${limits.maxToolCalls})`);
      }

      let toolName = '';
      try {
        toolName = context.getString(nameHandle);
      } catch {
        toolName = String(context.dump(nameHandle));
      }

      const toolArgs = (context.dump(argsHandle) || {}) as Record<string, unknown>;
      const deferred = context.newPromise();
      pendingDeferreds.add(deferred);

      // Dispatch async call across IPC boundary
      ipcToolDispatcher(toolName, toolArgs)
        .then((result) => {
          if (!context.alive) return;
          const valHandle = jsonToHandle(context, result);
          deferred.resolve(valHandle);
          valHandle.dispose();
        })
        .catch((err) => {
          if (!context.alive) return;
          const errMsg = err instanceof Error ? err.message : String(err);
          const errHandle = context.newError(errMsg);
          deferred.reject(errHandle);
          errHandle.dispose();
        })
        .finally(() => {
          pendingDeferreds.delete(deferred);
          if (!context.alive) return;
          // The deferred owns resolve/reject handles distinct from the one returned
          // below; without this they accumulate against the guest heap limit.
          deferred.dispose();
          pumpMicrotasks(runtime);
        });

      return deferred.handle;
    });

    context.setProp(context.global, 'callTool', callToolFn);
    callToolFn.dispose();

    // 5. Wrap guest code in an async IIFE and evaluate
    const wrappedCode = `(async () => {\n${code}\n})()`;
    const evalResult = context.evalCode(wrappedCode);

    if (evalResult.error) {
      const errorMsg = extractErrorMessage(context.dump(evalResult.error), limits);
      evalResult.error.dispose();
      return {
        success: false,
        error: errorMsg,
        logs,
        toolCallCount,
        durationMs: Date.now() - startTime,
        memoryUsedMb: memoryUsedMb(runtime),
      };
    }

    // 6. Await promise resolution with microtask event-loop pumping
    const promiseHandle = evalResult.value;
    let success = false;
    let resultValue: unknown = undefined;
    let errorMessage: string | undefined = undefined;

    try {
      while (true) {
        pumpMicrotasks(runtime);

        const state = context.getPromiseState(promiseHandle);
        if (state.type === 'fulfilled') {
          resultValue = context.dump(state.value);
          state.value.dispose();
          success = true;
          break;
        } else if (state.type === 'rejected') {
          const dumped = context.dump(state.error);
          state.error.dispose();
          success = false;
          errorMessage = extractErrorMessage(dumped, limits);
          break;
        }

        if (Date.now() > deadline) {
          success = false;
          errorMessage = `Execution interrupted: timeout exceeded (${limits.timeoutMs}ms)`;
          break;
        }

        // Yield to Node event loop for IPC message delivery and promise settling
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
    } finally {
      promiseHandle.dispose();
    }

    const usedMb = memoryUsedMb(runtime);

    return {
      success,
      value: success ? resultValue : undefined,
      error: success ? undefined : errorMessage,
      logs,
      toolCallCount,
      durationMs: Date.now() - startTime,
      memoryUsedMb: usedMb,
    };
  } finally {
    // A timed-out script can still own callTool deferreds. Free them before the
    // runtime or QuickJS aborts in JS_FreeRuntime.
    for (const deferred of pendingDeferreds) {
      try {
        deferred.dispose();
      } catch {
        // Already released by the tool-call settlement path.
      }
    }
    pendingDeferreds.clear();
    context.dispose();
    runtime.dispose();
  }
}
