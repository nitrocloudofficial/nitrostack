/**
 * StoreService — durable, crash-safe state for the bridge.
 *
 * This is what replaces Restate in the architecture. The value Restate provides
 * for this workload is that a long-running swarm run, and a pause waiting on a
 * human decision, survive a process restart. We get that from an append-safe
 * JSON store on disk: every mutation is written to a temp file and atomically
 * renamed, so a crash mid-write can never leave a half-parsed document behind.
 *
 * State layout (all under `.bridge/`):
 *   runs.json        swarm runs, agent status, conflict links
 *   knowledge.json   the unified knowledge base
 *   conflicts.json   detected conflicts + administrator resolutions
 *   pipelines.json   saved pipeline graphs
 *   skills.json      registry of dynamically generated skills
 *   documents.json   manually ingested context
 */
import { Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceService } from './workspace.service.js';
import type {
  Conflict,
  GeneratedSkill,
  KnowledgeFact,
  PipelineGraph,
  SwarmRun,
} from '../schemas/index.js';

export interface IngestedDocument {
  id: string;
  name: string;
  mimeType: string;
  chars: number;
  chunks: { id: string; text: string }[];
  ingestedAt: string;
}

interface Collections {
  runs: SwarmRun[];
  knowledge: KnowledgeFact[];
  conflicts: Conflict[];
  pipelines: PipelineGraph[];
  skills: GeneratedSkill[];
  documents: IngestedDocument[];
}

type CollectionName = keyof Collections;

const EMPTY: Collections = {
  runs: [],
  knowledge: [],
  conflicts: [],
  pipelines: [],
  skills: [],
  documents: [],
};

@Injectable({ deps: [WorkspaceService] })
export class StoreService {
  private cache = new Map<CollectionName, unknown[]>();

  constructor(private workspace: WorkspaceService) {}

  private file(name: CollectionName): string {
    return path.join(this.workspace.stateRoot, `${name}.json`);
  }

  private load<K extends CollectionName>(name: K): Collections[K] {
    const cached = this.cache.get(name);
    if (cached) return cached as Collections[K];

    let value: unknown[] = [...(EMPTY[name] as unknown[])];
    const file = this.file(name);
    if (fs.existsSync(file)) {
      try {
        const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (Array.isArray(parsed)) value = parsed;
      } catch {
        // A corrupt state file must not take the server down. Quarantine it and
        // start clean — the swarm can always be re-run to rebuild state.
        try {
          fs.renameSync(file, `${file}.corrupt-${Date.now()}`);
        } catch {
          /* best effort */
        }
      }
    }
    this.cache.set(name, value);
    return value as Collections[K];
  }

  /** Atomic write: temp file + rename, so readers never observe a partial document. */
  private persist(name: CollectionName, value: unknown[]): void {
    this.cache.set(name, value);
    const file = this.file(name);
    const tmp = `${file}.tmp-${process.pid}`;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  }

  /* ------------------------- generic helpers ------------------------- */

  all<K extends CollectionName>(name: K): Collections[K] {
    return this.load(name);
  }

  replace<K extends CollectionName>(name: K, value: Collections[K]): void {
    this.persist(name, value as unknown[]);
  }

  /** Insert, or replace the existing entry with the same `id`. */
  upsert<K extends CollectionName>(name: K, item: Collections[K][number]): Collections[K][number] {
    const list = [...this.load(name)] as { id: string }[];
    const idx = list.findIndex((x) => x.id === (item as { id: string }).id);
    if (idx >= 0) list[idx] = item as { id: string };
    else list.push(item as { id: string });
    this.persist(name, list);
    return item;
  }

  find<K extends CollectionName>(name: K, id: string): Collections[K][number] | undefined {
    return (this.load(name) as { id: string }[]).find((x) => x.id === id) as
      | Collections[K][number]
      | undefined;
  }

  /* --------------------------- runs --------------------------- */

  latestRun(): SwarmRun | undefined {
    const runs = this.all('runs');
    return runs.length ? runs[runs.length - 1] : undefined;
  }

  /** Resolve a run by id, defaulting to the most recent one. */
  requireRun(runId?: string): SwarmRun {
    const run = runId ? this.find('runs', runId) : this.latestRun();
    if (!run) {
      throw new Error(
        runId
          ? `No swarm run with id "${runId}".`
          : 'No swarm run has been executed yet. Call run_swarm first.'
      );
    }
    return run;
  }

  /* ------------------------- knowledge ------------------------- */

  /** Drop every fact produced by a given agent (used when an agent re-runs). */
  clearAgentFacts(agent: string): void {
    const kept = this.all('knowledge').filter((f) => f.agent !== agent);
    this.replace('knowledge', kept);
  }

  addFacts(facts: KnowledgeFact[]): void {
    const merged = [...this.all('knowledge')];
    for (const fact of facts) {
      const idx = merged.findIndex((f) => f.id === fact.id);
      if (idx >= 0) merged[idx] = fact;
      else merged.push(fact);
    }
    this.replace('knowledge', merged);
  }

  factsByCategory(category: KnowledgeFact['category']): KnowledgeFact[] {
    return this.all('knowledge').filter((f) => f.category === category);
  }

  /* ------------------------- pipelines ------------------------- */

  savePipeline(graph: PipelineGraph): void {
    const list = this.all('pipelines').filter((p) => p.name !== graph.name);
    this.replace('pipelines', [...list, graph]);
  }

  getPipeline(name?: string): PipelineGraph | undefined {
    const list = this.all('pipelines');
    if (!list.length) return undefined;
    if (!name) return list[list.length - 1];
    return list.find((p) => p.name === name);
  }

  /** Wipe all derived state. Used by reset_bridge for a clean demo run. */
  reset(): void {
    for (const name of Object.keys(EMPTY) as CollectionName[]) {
      this.persist(name, []);
    }
  }
}
