import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { CatalogTransform } from '../catalog.transform.js';
import { Tool } from '../../tool.js';
import { ExecutionContext } from '../../types.js';
import { HostToWorkerMessage, WorkerToHostMessage } from './ipc-messages.js';
import { ExecutionLimits, SandboxExecutionResult } from './types.js';
import { formatLegibleToolError } from './legible-error.js';
import { assertToolAllowed } from './destructive-guard.js';
import { validateToolArguments } from '../validate-tool-arguments.js';


interface QueuedTask {
  taskId: string;
  code: string;
  limits: ExecutionLimits;
  context?: ExecutionContext;
  resolve: (res: SandboxExecutionResult) => void;
  reject: (err: Error) => void;
}

interface ActiveTask {
  task: QueuedTask;
  watchdogTimer: NodeJS.Timeout;
}

interface InflightCall {
  taskId: string;
  controller: AbortController;
}

/**
 * Resolves a tool name for a guest `callTool`. Implementations must walk the full
 * transform chain so authorization transforms (e.g. session visibility) still apply
 * to tools invoked from inside the sandbox.
 */
export type SandboxToolResolver = (
  name: string,
  context?: ExecutionContext
) => Promise<Tool | undefined>;

export class WorkerPool {
  /** Respawn attempts tolerated before the pool disables itself. */
  private static readonly MAX_CONSECUTIVE_CRASHES = 5;

  private workers: Worker[] = [];
  private idleWorkers: Worker[] = [];
  private activeTasks: Map<Worker, ActiveTask> = new Map();
  private taskQueue: QueuedTask[] = [];
  /** Host-side tool calls still running for a sandbox task. Aborted when that task ends. */
  private inflightCalls: Map<string, InflightCall> = new Map();
  /** Calls whose guest is already gone; abort the handler without posting TOOL_RESPONSE. */
  private silentCalls: Set<string> = new Set();
  private isDisposed = false;
  private consecutiveCrashes = 0;
  /** Set when the crash ceiling is breached; the pool stops respawning permanently. */
  private disabledReason: Error | null = null;
  private readonly resolvedScriptPath: string;

  constructor(
    private readonly poolSize: number = 4,
    private readonly toolResolver: SandboxToolResolver,
    workerScriptPath?: string
  ) {
    this.resolvedScriptPath = this.resolveWorkerScriptPath(workerScriptPath);
  }

  private resolveWorkerScriptPath(customPath?: string): string {
    if (customPath && fs.existsSync(customPath)) {
      return customPath;
    }

    // 1. Check relative to compiled module (e.g. dist/core/transforms/code-mode/sandbox.worker.js)
    try {
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      const localJs = path.join(currentDir, 'sandbox.worker.js');
      if (fs.existsSync(localJs)) {
        return localJs;
      }
    } catch {
      // ignore import.meta.url failure in some bundlers
    }

    // 2. Check process.cwd() dist path
    const cwdDist = path.resolve(process.cwd(), 'dist/core/transforms/code-mode/sandbox.worker.js');
    if (fs.existsSync(cwdDist)) {
      return cwdDist;
    }

    // 3. Fallback to package root dist path
    const packageDist = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../../dist/core/transforms/code-mode/sandbox.worker.js'
    );
    if (fs.existsSync(packageDist)) {
      return packageDist;
    }

    // Fail here rather than returning an unverified path: every spawn would fail
    // asynchronously, and each failure triggers a replacement spawn.
    throw new Error(
      `Code Mode sandbox worker script not found (looked for sandbox.worker.js next to the ` +
        `compiled module, under ${process.cwd()}/dist, and at ${packageDist}). ` +
        `Build @nitrostack/core or pass an explicit workerScriptPath.`
    );
  }

  /**
   * Pre-spawns worker threads up to poolSize.
   */
  async initialize(): Promise<void> {
    while (this.workers.length < this.poolSize) {
      this.spawnWorker();
    }
  }

  /**
   * Submits a JavaScript script for sandboxed execution in an isolated worker thread.
   */
  async executeScript(
    code: string,
    limits: ExecutionLimits,
    context?: ExecutionContext
  ): Promise<SandboxExecutionResult> {
    if (this.isDisposed) {
      throw new Error('WorkerPool is already disposed');
    }
    if (this.disabledReason) {
      throw this.disabledReason;
    }

    return new Promise((resolve, reject) => {
      const taskId = crypto.randomUUID();
      this.taskQueue.push({ taskId, code, limits, context, resolve, reject });
      this.dispatchNext();
    });
  }

  private spawnWorker(): Worker {
    const execArgv = process.execArgv.filter(
      (arg, i, arr) =>
        arg !== '-e' &&
        arg !== '--eval' &&
        arg !== '-p' &&
        arg !== '--print' &&
        arr[i - 1] !== '-e' &&
        arr[i - 1] !== '--eval' &&
        arr[i - 1] !== '-p' &&
        arr[i - 1] !== '--print'
    );

    const worker = new Worker(this.resolvedScriptPath, {
      execArgv,
    });

    this.workers.push(worker);
    this.idleWorkers.push(worker);

    worker.on('message', (msg: WorkerToHostMessage) => {
      this.handleWorkerMessage(worker, msg);
    });

    // A failing worker emits both 'error' and 'exit'. Without this latch each crash
    // would be handled twice and spawn two replacements, growing the pool unbounded.
    let crashHandled = false;
    const onCrash = (err: Error) => {
      if (crashHandled) return;
      crashHandled = true;
      this.handleWorkerCrash(worker, err);
    };

    worker.on('error', onCrash);

    worker.on('exit', (code: number) => {
      if (!this.isDisposed) {
        onCrash(new Error(`Worker stopped with exit code ${code}`));
      }
    });

    return worker;
  }

  private handleWorkerMessage(worker: Worker, msg: WorkerToHostMessage): void {
    const active = this.activeTasks.get(worker);
    if (!active) return;

    if (msg.type === 'TOOL_REQUEST') {
      this.handleToolRequest(worker, msg, active.task.limits, active.task.context);
      return;
    }

    if (msg.type === 'EXECUTION_COMPLETE') {
      clearTimeout(active.watchdogTimer);
      this.abortInflight(active.task.taskId);
      this.activeTasks.delete(worker);
      this.idleWorkers.push(worker);
      this.consecutiveCrashes = 0;
      active.task.resolve(msg.result);
      this.dispatchNext();
      return;
    }

    if (msg.type === 'EXECUTION_FAILED') {
      clearTimeout(active.watchdogTimer);
      this.abortInflight(active.task.taskId);
      this.activeTasks.delete(worker);
      this.idleWorkers.push(worker);
      active.task.resolve({
        success: false,
        error: msg.error,
        logs: [],
        toolCallCount: 0,
        durationMs: 0,
        memoryUsedMb: 0,
      });
      this.dispatchNext();
    }
  }

  private handleToolRequest(
    worker: Worker,
    msg: Extract<WorkerToHostMessage, { type: 'TOOL_REQUEST' }>,
    limits: ExecutionLimits,
    context?: ExecutionContext
  ): void {
    const respond = (payload: { result?: unknown; error?: string }) => {
      if (this.silentCalls.delete(msg.callId)) return;
      worker.postMessage({
        type: 'TOOL_RESPONSE',
        taskId: msg.taskId,
        callId: msg.callId,
        ...payload,
      } as HostToWorkerMessage);
    };

    void this.dispatchToolRequest(msg, limits, context).then(respond, (err: unknown) =>
      respond({ error: err instanceof Error ? err.message : String(err) })
    );
  }

  private abortInflight(taskId: string): void {
    for (const [callId, inflight] of this.inflightCalls) {
      if (inflight.taskId !== taskId) continue;
      this.inflightCalls.delete(callId);
      this.silentCalls.add(callId);
      inflight.controller.abort();
    }
  }

  private async dispatchToolRequest(
    msg: Extract<WorkerToHostMessage, { type: 'TOOL_REQUEST' }>,
    limits: ExecutionLimits,
    context?: ExecutionContext
  ): Promise<{ result?: unknown; error?: string }> {
    // Resolution runs OUTSIDE withBypass so authorization transforms (session
    // visibility) still gate tools reached from inside the sandbox. A guest script
    // must not be able to call what its session is not allowed to call.
    let tool: Tool | undefined;
    try {
      tool = await this.toolResolver(msg.toolName, context);
    } catch (err: unknown) {
      // A transform denied resolution (e.g. VisibilityResolutionError). Surface it to
      // the guest as a rejected callTool rather than failing the whole script.
      return { error: err instanceof Error ? err.message : String(err) };
    }

    if (!tool) {
      return {
        error: `Tool '${msg.toolName}' not found. Use search to discover valid tools.`,
      };
    }

    try {
      assertToolAllowed(tool, limits.allowDestructive);
      validateToolArguments(tool, msg.args ?? {});
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }

    const controller = new AbortController();
    this.inflightCalls.set(msg.callId, { taskId: msg.taskId, controller });
    const signals = [controller.signal];
    if (context?.abortSignal) signals.push(context.abortSignal);
    const abortSignal = signals.length === 1 ? signals[0] : AbortSignal.any(signals);
    const execContext = {
      ...(context ?? ({ metadata: {} } as ExecutionContext)),
      abortSignal,
    } as ExecutionContext;

    const interrupted = 'callTool interrupted: script execution ended';
    return new Promise((resolve) => {
      let finished = false;
      const finish = (payload: { result?: unknown; error?: string }) => {
        if (finished) return;
        finished = true;
        this.inflightCalls.delete(msg.callId);
        resolve(payload);
      };

      if (abortSignal.aborted) {
        finish({ error: interrupted });
        return;
      }
      abortSignal.addEventListener('abort', () => finish({ error: interrupted }), { once: true });

      void (async () => {
        try {
          // withBypass covers catalog listing inside the handler so it does not
          // re-enter the pipeline. Authorization transforms still run: they do not
          // treat the bypass flag as permission to skip resolveTool.
          const result = await CatalogTransform.withBypass(() => tool!.execute(msg.args, execContext));
          finish({ result });
        } catch (err: unknown) {
          finish({ error: await formatLegibleToolError(tool, err) });
        }
      })();
    });
  }

  private handleWorkerCrash(worker: Worker, err: Error): void {
    const active = this.activeTasks.get(worker);
    if (active) {
      clearTimeout(active.watchdogTimer);
      this.abortInflight(active.task.taskId);
      this.activeTasks.delete(worker);
      active.task.reject(err);
    }

    this.removeWorker(worker);

    if (this.isDisposed || this.disabledReason) {
      return;
    }

    // A worker that cannot start (bad script path, unsupported runtime) crashes on
    // every respawn. Give up rather than spin.
    if (++this.consecutiveCrashes > WorkerPool.MAX_CONSECUTIVE_CRASHES) {
      this.disabledReason = new Error(
        `Code Mode sandbox disabled after ${WorkerPool.MAX_CONSECUTIVE_CRASHES} consecutive ` +
          `worker failures. Last error: ${err.message}`
      );
      for (const task of this.taskQueue) {
        task.reject(this.disabledReason);
      }
      this.taskQueue = [];
      return;
    }

    this.spawnWorker();
    this.dispatchNext();
  }

  private removeWorker(worker: Worker): void {
    const idx = this.workers.indexOf(worker);
    if (idx !== -1) {
      this.workers.splice(idx, 1);
    }
    const idleIdx = this.idleWorkers.indexOf(worker);
    if (idleIdx !== -1) {
      this.idleWorkers.splice(idleIdx, 1);
    }
  }

  private dispatchNext(): void {
    if (this.isDisposed || this.taskQueue.length === 0) {
      return;
    }

    // If no idle worker available, check if we can spawn up to poolSize
    if (this.idleWorkers.length === 0) {
      if (this.workers.length < this.poolSize) {
        this.spawnWorker();
      } else {
        return; // All workers are busy; wait for a task to finish
      }
    }

    const worker = this.idleWorkers.shift();
    const task = this.taskQueue.shift();

    if (!worker || !task) {
      return;
    }

    // Tier 2 Timeout Watchdog: host deadline is limits.timeoutMs + 2000
    const watchdogTimeoutMs = task.limits.timeoutMs + 2000;
    const watchdogTimer = setTimeout(async () => {
      this.abortInflight(task.taskId);
      this.activeTasks.delete(worker);
      this.removeWorker(worker);

      try {
        await worker.terminate();
      } catch {
        // Ignore termination failure
      }

      task.reject(
        new Error('Worker timed out and was terminated (Watchdog deadline exceeded)')
      );

      if (!this.isDisposed) {
        this.spawnWorker();
        this.dispatchNext();
      }
    }, watchdogTimeoutMs);

    this.activeTasks.set(worker, { task, watchdogTimer });

    worker.postMessage({
      type: 'EXECUTE',
      taskId: task.taskId,
      code: task.code,
      limits: task.limits,
    } as HostToWorkerMessage);
  }

  /**
   * Diagnostic pool statistics.
   */
  getStats() {
    return {
      totalWorkers: this.workers.length,
      idleWorkers: this.idleWorkers.length,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
    };
  }

  /**
   * Gracefully drains task queue and terminates all worker threads.
   */
  async dispose(): Promise<void> {
    this.isDisposed = true;

    for (const task of this.taskQueue) {
      task.reject(new Error('WorkerPool disposed'));
    }
    this.taskQueue = [];

    for (const active of this.activeTasks.values()) {
      clearTimeout(active.watchdogTimer);
      this.abortInflight(active.task.taskId);
      active.task.reject(new Error('WorkerPool disposed'));
    }
    for (const inflight of this.inflightCalls.values()) {
      inflight.controller.abort();
    }
    this.inflightCalls.clear();
    this.activeTasks.clear();

    const terminations = this.workers.map(async (w) => {
      try {
        w.postMessage({ type: 'SHUTDOWN' } as HostToWorkerMessage);
        await w.terminate();
      } catch {
        // Ignore termination errors during disposal
      }
    });

    this.workers = [];
    this.idleWorkers = [];
    await Promise.all(terminations);
  }
}
