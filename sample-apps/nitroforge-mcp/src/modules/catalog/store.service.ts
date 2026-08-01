import { Injectable } from '@nitrostack/core';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EndpointGraph } from '../../contracts/endpoint-graph.schema.js';
import type { ToolSurfaceIR } from '../../contracts/ir.schema.js';
import type { GeneratedProject } from '../../contracts/generated-project.schema.js';
import type { VerificationReport } from '../../contracts/verification-report.schema.js';
import type { ArtifactStore, ServerRecord } from '../../contracts/store.contract.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// src/modules/catalog/ -> repo root -> .forge/
const FORGE_DIR = join(__dirname, '..', '..', '..', '.forge');

/**
 * store.service.ts — the real ArtifactStore, replacing
 * testing/in-memory-artifact-store.ts at runtime (same interface, so this
 * is a drop-in provider swap, not a code change anywhere that injects
 * ARTIFACT_STORE).
 *
 * Map + write-through to .forge/{graphs,irs,projects,reports,servers}/<id>.json.
 * Disk write-through matters for two reasons: it survives a process
 * restart, and the Forge Console (a deliberately separate process — see
 * console/) reads .forge/ directly off disk with no import of this class
 * and no IPC.
 *
 * DI note: this binds to the same ARTIFACT_STORE token that
 * ingest.module.ts and forge.module.ts each already register locally
 * (temporarily) to InMemoryArtifactStore. DIContainer is a flat global
 * singleton keyed by token (verified against
 * node_modules/@nitrostack/core/dist/core/di/container.js), and
 * app-decorator.js registers a module's own providers before walking its
 * `imports` array in order — so as long as CatalogModule is the LAST entry
 * in AppModule's `imports`, its registration for ARTIFACT_STORE is the one
 * still in the container's providers map when tools/resources/prompts
 * actually get resolved, and every controller ends up sharing this single
 * StoreService instance. Verified empirically, not just reasoned about —
 * see the boot-test note in docs/W3-STATUS.md.
 */
@Injectable()
export class StoreService implements ArtifactStore {
  private graphs = new Map<string, EndpointGraph>();
  private irs = new Map<string, ToolSurfaceIR>();
  private projects = new Map<string, GeneratedProject>();
  private reports = new Map<string, VerificationReport>();
  private servers = new Map<string, ServerRecord>();
  private loaded = false;

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    await Promise.all([
      this.loadKind('graphs', this.graphs),
      this.loadKind('irs', this.irs),
      this.loadKind('projects', this.projects),
      this.loadKind('reports', this.reports),
      this.loadKind('servers', this.servers),
    ]);
  }

  private async loadKind<T>(subdir: string, into: Map<string, T>): Promise<void> {
    const dir = join(FORGE_DIR, subdir);
    if (!existsSync(dir)) return;
    const files = await readdir(dir).catch(() => [] as string[]);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const id = file.slice(0, -'.json'.length);
      try {
        const raw = await readFile(join(dir, file), 'utf-8');
        into.set(id, JSON.parse(raw) as T);
      } catch {
        // Corrupt or partially-written file — skip rather than crash boot.
      }
    }
  }

  private async writeThrough(subdir: string, id: string, record: unknown): Promise<void> {
    const dir = join(FORGE_DIR, subdir);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${id}.json`), JSON.stringify(record, null, 2), 'utf-8');
  }

  async putGraph(graph: EndpointGraph): Promise<string> {
    await this.ensureLoaded();
    const id = `graph_${randomUUID()}`;
    this.graphs.set(id, graph);
    await this.writeThrough('graphs', id, graph);
    return id;
  }
  async getGraph(graphId: string): Promise<EndpointGraph | null> {
    await this.ensureLoaded();
    return this.graphs.get(graphId) ?? null;
  }

  async putIR(ir: ToolSurfaceIR): Promise<string> {
    await this.ensureLoaded();
    const id = `ir_${randomUUID()}`;
    this.irs.set(id, ir);
    await this.writeThrough('irs', id, ir);
    return id;
  }
  async getIR(irId: string): Promise<ToolSurfaceIR | null> {
    await this.ensureLoaded();
    return this.irs.get(irId) ?? null;
  }

  async putProject(project: GeneratedProject): Promise<string> {
    await this.ensureLoaded();
    const id = `project_${randomUUID()}`;
    this.projects.set(id, project);
    await this.writeThrough('projects', id, project);
    return id;
  }
  async getProject(projectId: string): Promise<GeneratedProject | null> {
    await this.ensureLoaded();
    return this.projects.get(projectId) ?? null;
  }

  async putReport(report: VerificationReport): Promise<string> {
    await this.ensureLoaded();
    const id = `report_${randomUUID()}`;
    this.reports.set(id, report);
    await this.writeThrough('reports', id, report);
    return id;
  }
  async getReport(reportId: string): Promise<VerificationReport | null> {
    await this.ensureLoaded();
    return this.reports.get(reportId) ?? null;
  }

  async putServer(record: Omit<ServerRecord, 'id' | 'createdAt'>): Promise<string> {
    await this.ensureLoaded();
    const id = `server_${randomUUID()}`;
    const full: ServerRecord = { ...record, id, createdAt: new Date().toISOString() };
    this.servers.set(id, full);
    await this.writeThrough('servers', id, full);
    return id;
  }
  async getServer(serverId: string): Promise<ServerRecord | null> {
    await this.ensureLoaded();
    return this.servers.get(serverId) ?? null;
  }

  /** Non-contract helper for the catalog resources/console — lists everything currently known. */
  async listAll(): Promise<{
    graphs: Array<{ id: string; graph: EndpointGraph }>;
    irs: Array<{ id: string; ir: ToolSurfaceIR }>;
    servers: Array<{ id: string; record: ServerRecord }>;
  }> {
    await this.ensureLoaded();
    return {
      graphs: [...this.graphs.entries()].map(([id, graph]) => ({ id, graph })),
      irs: [...this.irs.entries()].map(([id, ir]) => ({ id, ir })),
      servers: [...this.servers.entries()].map(([id, record]) => ({ id, record })),
    };
  }
}
