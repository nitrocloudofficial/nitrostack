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

export class WorkerPool {
  private workers: Worker[] = [];
  private idleWorkers: Worker[] = [];
  private activeTasks: Map<Worker, ActiveTask> = new Map();
  private taskQueue: QueuedTask[] = [];
  private isDisposed = false;
  private readonly resolvedScriptPath: string;

  constructor(
    private readonly poolSize: number = 4,
    private readonly toolResolver: (name: string) => Tool | undefined,
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
    return path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../../dist/core/transforms/code-mode/sandbox.worker.js'
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

    return new Promise((resolve, reject) => {
      const taskId = crypto.randomUUID();
      this.taskQueue.push({ taskId, code, limits, context, resolve, reject });
      this.dispatchNext();
    });
  }

  private spawnWorker(): Worker {
    const worker = new Worker(this.resolvedScriptPath, {
      execArgv: process.execArgv,
    });

    this.workers.push(worker);
    this.idleWorkers.push(worker);

    worker.on('message', (msg: WorkerToHostMessage) => {
      this.handleWorkerMessage(worker, msg);
    });

    worker.on('error', (err: Error) => {
      this.handleWorkerCrash(worker, err);
    });

    worker.on('exit', (code: number) => {
      if (!this.isDisposed && code !== 0) {
        this.handleWorkerCrash(worker, new Error(`Worker stopped with exit code ${code}`));
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
      this.activeTasks.delete(worker);
      this.idleWorkers.push(worker);
      active.task.resolve(msg.result);
      this.dispatchNext();
      return;
    }

    if (msg.type === 'EXECUTION_FAILED') {
      clearTimeout(active.watchdogTimer);
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
    // Execute tool on the host thread inside CatalogTransform.withBypass to prevent transform re-entrancy
    CatalogTransform.withBypass(async () => {
      const tool = this.toolResolver(msg.toolName);
      if (!tool) {
        worker.postMessage({
          type: 'TOOL_RESPONSE',
          taskId: msg.taskId,
          callId: msg.callId,
          error: `Tool '${msg.toolName}' not found. Use search to discover valid tools.`,
        } as HostToWorkerMessage);
        return;
      }

      // Check destructive guard
      if (tool.annotations?.destructiveHint === true && !limits.allowDestructive) {
        worker.postMessage({
          type: 'TOOL_RESPONSE',
          taskId: msg.taskId,
          callId: msg.callId,
          error: `callTool('${tool.name}') rejected: destructive operations are disabled in Code Mode scripts.`,
        } as HostToWorkerMessage);
        return;
      }

      try {
        // Execute target tool through full NitroStack pipeline
        const result = await tool.execute(msg.args, context ?? ({} as any));
        worker.postMessage({
          type: 'TOOL_RESPONSE',
          taskId: msg.taskId,
          callId: msg.callId,
          result,
        } as HostToWorkerMessage);
      } catch (err: unknown) {
        const legibleError = await formatLegibleToolError(tool, err);
        worker.postMessage({
          type: 'TOOL_RESPONSE',
          taskId: msg.taskId,
          callId: msg.callId,
          error: legibleError,
        } as HostToWorkerMessage);
      }
    });
  }

  private handleWorkerCrash(worker: Worker, err: Error): void {
    const active = this.activeTasks.get(worker);
    if (active) {
      clearTimeout(active.watchdogTimer);
      this.activeTasks.delete(worker);
      active.task.reject(err);
    }

    this.removeWorker(worker);

    if (!this.isDisposed) {
      this.spawnWorker();
      this.dispatchNext();
    }
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
      active.task.reject(new Error('WorkerPool disposed'));
    }
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
