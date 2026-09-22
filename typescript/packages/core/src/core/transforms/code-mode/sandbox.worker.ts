import { parentPort } from 'node:worker_threads';
import { HostToWorkerMessage, WorkerToHostMessage } from './ipc-messages.js';
import { SandboxExecutionResult } from './types.js';
import { evaluateGuestScript } from './guest-evaluator.js';

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
      try {
        const result = await evaluateGuestScript(
          msg.code,
          msg.limits,
          (toolName: string, args: Record<string, unknown>) => {
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
          }
        );

        parentPort!.postMessage({
          type: 'EXECUTION_COMPLETE',
          taskId: msg.taskId,
          result,
        } as WorkerToHostMessage);
      } catch (err: unknown) {
        const result: SandboxExecutionResult = {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          logs: [],
          toolCallCount: 0,
          durationMs: 0,
          memoryUsedMb: 0,
        };

        parentPort!.postMessage({
          type: 'EXECUTION_COMPLETE',
          taskId: msg.taskId,
          result,
        } as WorkerToHostMessage);
      } finally {
        // A script that ended (timeout, throw, or return) must not leave callTool
        // promises pending for the life of the worker.
        for (const pending of pendingToolCalls.values()) {
          pending.reject(new Error('callTool interrupted: script execution ended'));
        }
        pendingToolCalls.clear();
      }
    }
  });
}

