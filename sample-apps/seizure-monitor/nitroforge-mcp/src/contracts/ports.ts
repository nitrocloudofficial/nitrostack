import type { EndpointGraph } from './endpoint-graph.schema.js';
import type { ToolSurfaceIR } from './ir.schema.js';
import type { GeneratedProject } from './generated-project.schema.js';
import type { VerificationReport } from './verification-report.schema.js';
import type { ArtifactStore } from './store.contract.js';

/**
 * ports.ts — W3 orchestrates against these. FROZEN AT H0.
 *
 * Ports & adapters (decision #12): W3 writes forge.service.ts against these
 * interfaces from hour one, using stub implementations that return fixtures.
 * W1 and W2 swap in real implementations later. Nobody blocks anybody.
 */

export type PlanHints = {
  /** Optional human nudges for the planner, e.g. preferred module grouping. */
  preferredModules?: string[];
  maxTools?: number;
};

export interface IngestPort {
  /** ① PARSE — deterministic, no model. */
  parse(specUrlOrBody: string): Promise<EndpointGraph>;
  /** ② PLAN — the only LLM call in the entire system. */
  plan(graph: EndpointGraph, hints?: PlanHints): Promise<ToolSurfaceIR>;
}

export interface EmitPort {
  /** ③ EMIT — deterministic template expansion. */
  emit(ir: ToolSurfaceIR, graph: EndpointGraph): Promise<GeneratedProject>;
  /** ④ VERIFY — build / boot / replay / repair, machine oracle only. */
  verify(project: GeneratedProject): Promise<VerificationReport>;
}

export type MountHandle = {
  id: string;
  pid: number;
  toolNames: string[];
  mountedAt: string;
};

export interface RuntimePort {
  /** ⑤ MOUNT — child process + proxy + tools/list_changed. */
  mount(project: GeneratedProject): Promise<MountHandle>;
  unmount(id: string): Promise<void>;
}

export type { ArtifactStore };
