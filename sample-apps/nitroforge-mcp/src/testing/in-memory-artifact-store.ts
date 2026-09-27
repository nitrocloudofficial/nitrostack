import { randomUUID } from 'node:crypto';
import { Injectable } from '@nitrostack/core';
import type { EndpointGraph } from '../contracts/endpoint-graph.schema.js';
import type { ToolSurfaceIR } from '../contracts/ir.schema.js';
import type { GeneratedProject } from '../contracts/generated-project.schema.js';
import type { VerificationReport } from '../contracts/verification-report.schema.js';
import type { ArtifactStore, ServerRecord } from '../contracts/store.contract.js';

/**
 * in-memory-artifact-store.ts — TEMPORARY. Owned by W1 only until W3 ships
 * the real store.service.ts (Map + write-through to .forge/), per WORKFLOW.md.
 *
 * Satisfies the ArtifactStore contract exactly so swapping this out at
 * SYNC 4 is a one-line provider change in ingest.module.ts / app.module.ts,
 * not a code change anywhere that calls the store.
 *
 * Do NOT add persistence, activity logging, or write-through here — that's
 * W3's job and belongs in store.service.ts, not this stand-in.
 */
@Injectable()
export class InMemoryArtifactStore implements ArtifactStore {
  private readonly graphs = new Map<string, EndpointGraph>();
  private readonly irs = new Map<string, ToolSurfaceIR>();
  private readonly projects = new Map<string, GeneratedProject>();
  private readonly reports = new Map<string, VerificationReport>();
  private readonly servers = new Map<string, ServerRecord>();

  async putGraph(graph: EndpointGraph): Promise<string> {
    const id = `graph_${randomUUID()}`;
    this.graphs.set(id, graph);
    return id;
  }
  async getGraph(graphId: string): Promise<EndpointGraph | null> {
    return this.graphs.get(graphId) ?? null;
  }

  async putIR(ir: ToolSurfaceIR): Promise<string> {
    const id = `ir_${randomUUID()}`;
    this.irs.set(id, ir);
    return id;
  }
  async getIR(irId: string): Promise<ToolSurfaceIR | null> {
    return this.irs.get(irId) ?? null;
  }

  async putProject(project: GeneratedProject): Promise<string> {
    const id = `project_${randomUUID()}`;
    this.projects.set(id, project);
    return id;
  }
  async getProject(projectId: string): Promise<GeneratedProject | null> {
    return this.projects.get(projectId) ?? null;
  }

  async putReport(report: VerificationReport): Promise<string> {
    const id = `report_${randomUUID()}`;
    this.reports.set(id, report);
    return id;
  }
  async getReport(reportId: string): Promise<VerificationReport | null> {
    return this.reports.get(reportId) ?? null;
  }

  async putServer(record: Omit<ServerRecord, 'id' | 'createdAt'>): Promise<string> {
    const id = `server_${randomUUID()}`;
    this.servers.set(id, { ...record, id, createdAt: new Date().toISOString() });
    return id;
  }
  async getServer(serverId: string): Promise<ServerRecord | null> {
    return this.servers.get(serverId) ?? null;
  }
}
