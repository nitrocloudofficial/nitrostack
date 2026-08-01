import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { ExecutionContext, Logger } from '@nitrostack/core';
import { ForgeTools } from './forge.tools.js';
import { EmitterService } from './emitter.service.js';
import { VerifierService } from './verifier.service.js';
import { InMemoryArtifactStore } from '../../testing/in-memory-artifact-store.js';
import type { EndpointGraph } from '../../contracts/endpoint-graph.schema.js';
import type { ToolSurfaceIR } from '../../contracts/ir.schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../../../fixtures');

function readFixtureJSON<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(FIXTURES, rel), 'utf-8')) as T;
}

const fakeLogger: Logger = { debug() {}, info() {}, warn() {}, error() {} };

// Minimal fake TaskContext so forgeServer's ctx.task?.updateProgress(...) /
// throwIfCancelled() calls exercise the same branches a real task-augmented
// call would, without needing a real MCP task lifecycle.
function fakeTask() {
  const progress: string[] = [];
  return {
    taskId: 'task_test',
    isCancelled: false,
    updateProgress(msg: string) {
      progress.push(msg);
    },
    throwIfCancelled() {
      /* never cancelled in tests */
    },
    requestInput() {},
    getTaskData() {
      return {} as any;
    },
    _progress: progress,
  };
}

describe('ForgeTools — forge_server (Phase 1B stub)', () => {
  let tools: ForgeTools;
  let store: InMemoryArtifactStore;
  let graph: EndpointGraph;
  let ir: ToolSurfaceIR;

  beforeEach(() => {
    store = new InMemoryArtifactStore();
    tools = new ForgeTools(new EmitterService(), new VerifierService(), store);
    graph = readFixtureJSON<EndpointGraph>('graphs/demo.graph.json');
    ir = readFixtureJSON<ToolSurfaceIR>('irs/demo.ir.json');
  });

  it('forges a server from a stored IR + graph and returns the fixture green report', async () => {
    const graphId = await store.putGraph(graph);
    const irId = await store.putIR(ir);

    const task = fakeTask();
    const ctx: ExecutionContext = { requestId: 'test-req', logger: fakeLogger, task: task as any };

    const result = await tools.forgeServer({ irId, graphId }, ctx);

    expect(result.status).toBe('green');
    expect(result.toolCount).toBe(6);
    expect(result.toolResults).toHaveLength(6);
    expect(result.toolResults.every((r) => r.passed)).toBe(true);
    expect(typeof result.serverId).toBe('string');

    // Task progress narration actually streamed (BUILD-W2's "read aloud" requirement)
    expect(task._progress.length).toBeGreaterThan(0);
    expect(task._progress.some((m) => m.includes('Reading tool surface plan'))).toBe(true);
    expect(task._progress.some((m) => m.includes('Emitting'))).toBe(true);

    // Result is actually persisted, retrievable via getServer — this is what
    // forge://server/{id} (W3's resource) will serve.
    const stored = await store.getServer(result.serverId);
    expect(stored?.irId).toBe(irId);
    expect(stored?.report.status).toBe('green');

    // Real EmitterService writes to .forge/servers/<id> on disk — clean up
    // rather than accumulating ~100MB of generated projects per test run.
    if (stored?.project.rootPath) {
      const { rmSync } = await import('node:fs');
      rmSync(stored.project.rootPath, { recursive: true, force: true });
    }
  }, 90000);

  it('throws a clear error for an unknown irId rather than emitting anything', async () => {
    const graphId = await store.putGraph(graph);
    const ctx: ExecutionContext = { requestId: 'test-req', logger: fakeLogger };

    await expect(
      tools.forgeServer({ irId: 'ir_does_not_exist', graphId }, ctx),
    ).rejects.toThrow(/No ToolSurfaceIR found/);
  });

  it('throws a clear error for an unknown graphId rather than emitting anything', async () => {
    const irId = await store.putIR(ir);
    const ctx: ExecutionContext = { requestId: 'test-req', logger: fakeLogger };

    await expect(
      tools.forgeServer({ irId, graphId: 'graph_does_not_exist' }, ctx),
    ).rejects.toThrow(/No EndpointGraph found/);
  });

  it('works without a task context (taskSupport is required by the tool decorator, but the handler stays defensive)', async () => {
    const graphId = await store.putGraph(graph);
    const irId = await store.putIR(ir);
    const ctx: ExecutionContext = { requestId: 'test-req', logger: fakeLogger }; // no .task

    const result = await tools.forgeServer({ irId, graphId }, ctx);
    expect(result.status).toBe('green');

    const stored = await store.getServer(result.serverId);
    if (stored?.project.rootPath) {
      const { rmSync } = await import('node:fs');
      rmSync(stored.project.rootPath, { recursive: true, force: true });
    }
  }, 90000);
});
