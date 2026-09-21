import type { EndpointGraph } from './endpoint-graph.schema.js';
import type { ToolSurfaceIR } from './ir.schema.js';
import type { GeneratedProject } from './generated-project.schema.js';
import type { VerificationReport } from './verification-report.schema.js';

/**
 * store.contract.ts — W3 owns the real implementation (store.service.ts).
 * FROZEN AT H0 alongside the rest of src/contracts/.
 *
 * W1 and W2 both depend on this at H0, per WORKFLOW.md ("W3: store.contract.ts
 * + activity.contract.ts at H0, ahead of your own work"). This file defines
 * the shape; src/testing/in-memory-artifact-store.ts is a temporary stand-in
 * so W1 isn't blocked — swap for the real store.service.ts at SYNC 4.
 *
 * putServer/getServer added after BUILD-W2.md was written against them
 * directly ("store.putServer(...)") — represents the combined manifest
 * served at the `forge://server/{id}` resource (README-team.md): the
 * GeneratedProject plus its VerificationReport as one record, since that's
 * the unit W2's `forge_server` tool actually produces and W3's Resource
 * actually serves. putProject/getProject and putReport/getReport still exist
 * separately in case W2 needs to store either independently mid-pipeline.
 */

export const ARTIFACT_STORE = 'ARTIFACT_STORE';

export type ServerRecord = {
  id: string;
  project: GeneratedProject;
  report: VerificationReport;
  irId: string; // the IR this server was forged from, for traceability
  createdAt: string;
};

export interface ArtifactStore {
  putGraph(graph: EndpointGraph): Promise<string>; // returns graphId
  getGraph(graphId: string): Promise<EndpointGraph | null>;

  putIR(ir: ToolSurfaceIR): Promise<string>; // returns irId
  getIR(irId: string): Promise<ToolSurfaceIR | null>;

  putProject(project: GeneratedProject): Promise<string>; // returns projectId
  getProject(projectId: string): Promise<GeneratedProject | null>;

  putReport(report: VerificationReport): Promise<string>; // returns reportId
  getReport(reportId: string): Promise<VerificationReport | null>;

  /** Combined manifest for forge://server/{id} — what forge_server produces. */
  putServer(record: Omit<ServerRecord, 'id' | 'createdAt'>): Promise<string>; // returns serverId
  getServer(serverId: string): Promise<ServerRecord | null>;
}
