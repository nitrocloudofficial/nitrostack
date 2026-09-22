import { parentPort } from 'node:worker_threads';
import { HostToWorkerMessage, WorkerToHostMessage } from './ipc-messages.js';
import { SandboxExecutionResult, SandboxLogEntry } from './types.js';

if (parentPort) {
  const pendingToolCalls = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (err: Error) => void }
  >();

  parentPort.on('message', async (msg: HostToWorkerMessage) => {
    if (msg.type === 'SHUTDOWN') {
      process.exit(0);
    }

    if (msg.type === 'TOOL_RESPONSE') {
      const pending = pendingToolCalls.get(msg.callId);
      if (pending) {
        pendingToolCalls.delete(msg.callId);
        if (msg.error) {
          pending.reject(new Error(msg.error));
        } else {
          pending.resolve(msg.result);
        }
      }
      return;
    }

    if (msg.type === 'EXECUTE') {
      const startTime = Date.now();
      const logs: SandboxLogEntry[] = [];
      let toolCallCount = 0;

      // Injected callTool function bridging calls across the IPC boundary to the host
      const callTool = (toolName: string, args: Record<string, unknown> = {}): Promise<unknown> => {
        toolCallCount++;
        if (toolCallCount > msg.limits.maxToolCalls) {
          return Promise.reject(
            new Error(`Circuit breaker: exceeded maximum allowed tool calls (${msg.limits.maxToolCalls})`)
          );
        }

        const callId = crypto.randomUUID();
        return new Promise((resolve, reject) => {
          pendingToolCalls.set(callId, { resolve, reject });
          parentPort!.postMessage({
            type: 'TOOL_REQUEST',
            taskId: msg.taskId,
            callId,
            toolName,
            args: args || {},
          } as WorkerToHostMessage);
        });
      };

      // Injected sandboxed console
      const customConsole = {
        log: (...args: any[]) => {
          logs.push({ level: 'log', message: args.map(String).join(' '), timestamp: Date.now() });
        },
        warn: (...args: any[]) => {
          logs.push({ level: 'warn', message: args.map(String).join(' '), timestamp: Date.now() });
        },
        error: (...args: any[]) => {
          logs.push({ level: 'error', message: args.map(String).join(' '), timestamp: Date.now() });
        },
      };

      try {
        // Evaluate guest code inside an isolated async scope with callTool and console
        const fn = new Function('callTool', 'console', `return (async () => {\n${msg.code}\n})();`);
        const value = await fn(callTool, customConsole);

        const result: SandboxExecutionResult = {
          success: true,
          value,
          logs,
          toolCallCount,
          durationMs: Date.now() - startTime,
          memoryUsedMb: process.memoryUsage().heapUsed / (1024 * 1024),
        };

        parentPort!.postMessage({
          type: 'EXECUTION_COMPLETE',
          taskId: msg.taskId,
          result,
        } as WorkerToHostMessage);
      } catch (err: any) {
        const result: SandboxExecutionResult = {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          logs,
          toolCallCount,
          durationMs: Date.now() - startTime,
          memoryUsedMb: process.memoryUsage().heapUsed / (1024 * 1024),
        };

        parentPort!.postMessage({
          type: 'EXECUTION_COMPLETE',
          taskId: msg.taskId,
          result,
        } as WorkerToHostMessage);
      } finally {
        pendingToolCalls.clear();
      }
    }
  });
}
