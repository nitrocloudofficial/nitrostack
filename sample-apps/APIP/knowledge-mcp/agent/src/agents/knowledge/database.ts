/**
 * Knowledge Graph Agent — Database Layer (Pure TypeScript JSON Store)
 * 
 * Zero native dependencies. Uses in-memory Maps with JSON file persistence.
 * Provides typed CRUD operations for all knowledge graph tables.
 * 
 * Drop-in replaceable with PostgreSQL or SQLite later — all consumers
 * use the exported helper functions, not raw SQL.
 */

import path from 'path';
import fs from 'fs';
import {
  Project,
  Exploration,
  KnowledgeNode,
  KnowledgeEdge,
  Workflow,
  WorkflowStep,
} from './models';

// ============================================================================
// JSON FILE STORE
// ============================================================================

interface StoreData {
  projects: Record<string, Project>;
  explorations: Record<string, Exploration>;
  knowledge_nodes: Record<string, KnowledgeNode>;
  knowledge_edges: Record<string, KnowledgeEdge>;
  workflows: Record<string, Workflow>;
  workflow_steps: Record<string, WorkflowStep>;
}

const EMPTY_STORE: StoreData = {
  projects: {},
  explorations: {},
  knowledge_nodes: {},
  knowledge_edges: {},
  workflows: {},
  workflow_steps: {},
};

class JsonStore {
  private data: StoreData;
  private dbPath: string;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(dbPath: string) {
    this.dbPath = dbPath;

    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Load existing data or create empty store
    if (fs.existsSync(dbPath)) {
      try {
        const raw = fs.readFileSync(dbPath, 'utf-8');
        this.data = { ...EMPTY_STORE, ...JSON.parse(raw) };
        console.log(`[Database] Loaded from ${dbPath}`);
      } catch {
        this.data = { ...EMPTY_STORE };
        console.log(`[Database] Fresh store at ${dbPath}`);
      }
    } else {
      this.data = { ...EMPTY_STORE };
      console.log(`[Database] Created new store at ${dbPath}`);
    }
  }

  // ── Generic CRUD ──────────────────────────────────────────────────────

  insert<T extends keyof StoreData>(table: T, id: string, record: StoreData[T][string]): void {
    (this.data[table] as Record<string, unknown>)[id] = record;
    this.debouncedSave();
  }

  findById<T extends keyof StoreData>(table: T, id: string): StoreData[T][string] | undefined {
    return (this.data[table] as Record<string, unknown>)[id] as StoreData[T][string] | undefined;
  }

  findAll<T extends keyof StoreData>(table: T): Array<StoreData[T][string]> {
    return Object.values(this.data[table]) as Array<StoreData[T][string]>;
  }

  findBy<T extends keyof StoreData>(
    table: T,
    predicate: (record: StoreData[T][string]) => boolean
  ): Array<StoreData[T][string]> {
    return (Object.values(this.data[table]) as Array<StoreData[T][string]>).filter(predicate);
  }

  findOneBy<T extends keyof StoreData>(
    table: T,
    predicate: (record: StoreData[T][string]) => boolean
  ): StoreData[T][string] | undefined {
    return (Object.values(this.data[table]) as Array<StoreData[T][string]>).find(predicate);
  }

  update<T extends keyof StoreData>(
    table: T,
    id: string,
    updates: Partial<StoreData[T][string]>
  ): boolean {
    const existing = (this.data[table] as Record<string, unknown>)[id];
    if (!existing) return false;

    (this.data[table] as Record<string, unknown>)[id] = { ...existing, ...updates };
    this.debouncedSave();
    return true;
  }

  delete<T extends keyof StoreData>(table: T, id: string): boolean {
    if (!(id in (this.data[table] as Record<string, unknown>))) return false;
    delete (this.data[table] as Record<string, unknown>)[id];
    this.debouncedSave();
    return true;
  }

  deleteBy<T extends keyof StoreData>(
    table: T,
    predicate: (record: StoreData[T][string]) => boolean
  ): number {
    let count = 0;
    const entries = Object.entries(this.data[table] as Record<string, unknown>);
    for (const [id, record] of entries) {
      if (predicate(record as StoreData[T][string])) {
        delete (this.data[table] as Record<string, unknown>)[id];
        count++;
      }
    }
    if (count > 0) this.debouncedSave();
    return count;
  }

  count<T extends keyof StoreData>(table: T, predicate?: (record: StoreData[T][string]) => boolean): number {
    if (!predicate) return Object.keys(this.data[table]).length;
    return this.findBy(table, predicate).length;
  }

  // ── Persistence ───────────────────────────────────────────────────────

  /** Debounced save — writes to disk at most once every 100ms */
  private debouncedSave(): void {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveToDisk();
      this.saveTimeout = null;
    }, 100);
  }

  /** Force immediate save to disk */
  saveToDisk(): void {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Database] Failed to save:', err);
    }
  }

  /** Close the store and flush to disk */
  close(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.saveToDisk();
    console.log('[Database] Store closed and saved');
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let store: JsonStore | null = null;

/**
 * Get or create the database store singleton.
 */
export function getStore(dbPath?: string): JsonStore {
  if (store) return store;

  const resolvedPath = dbPath || process.env.DB_PATH || './data/knowledge_graph.json';
  store = new JsonStore(resolvedPath);
  return store;
}

/**
 * Close the database store cleanly.
 */
export function closeDatabase(): void {
  if (store) {
    store.close();
    store = null;
  }
}

/**
 * Run a function as an atomic operation (saves to disk after completion).
 * In a real DB this would be a transaction — here it ensures flush.
 */
export function runTransaction<T>(fn: () => T): T {
  const result = fn();
  getStore().saveToDisk();
  return result;
}

export { JsonStore };
