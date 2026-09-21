import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';

export interface MemoryEntry {
  id: string;
  key: string;
  value: unknown;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  accessCount: number;
  expiresAt?: string;
}

export class MemoryService {
  private storePath: string;
  private memory = new Map<string, MemoryEntry>();

  constructor() {
    this.storePath = process.env.MEMORY_STORE_PATH || path.join(process.cwd(), '.aeios-memory');
    this.ensureStoreDir();
    this.loadFromDisk();
  }

  private ensureStoreDir(): void {
    if (!fs.existsSync(this.storePath)) {
      fs.mkdirSync(this.storePath, { recursive: true });
    }
  }

  private loadFromDisk(): void {
    try {
      const indexFile = path.join(this.storePath, 'index.json');
      if (fs.existsSync(indexFile)) {
        const data = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
        if (Array.isArray(data)) {
          data.forEach((entry: MemoryEntry) => {
            if (!entry.expiresAt || new Date(entry.expiresAt) > new Date()) {
              this.memory.set(entry.key, entry);
            }
          });
        }
      }
    } catch {
      // start fresh on corrupt data
    }
  }

  private saveToDisk(): void {
    try {
      const indexFile = path.join(this.storePath, 'index.json');
      const entries = Array.from(this.memory.values());
      fs.writeFileSync(indexFile, JSON.stringify(entries, null, 2));
    } catch {
      // silently fail disk writes
    }
  }

  store(key: string, value: unknown, category = 'general', tags: string[] = [], ttlMinutes?: number): MemoryEntry {
    const existing = this.memory.get(key);
    const entry: MemoryEntry = {
      id: existing?.id || uuid(),
      key,
      value,
      category,
      tags,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      accessCount: existing?.accessCount || 0,
      expiresAt: ttlMinutes ? new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString() : undefined,
    };
    this.memory.set(key, entry);
    this.saveToDisk();
    return entry;
  }

  retrieve(key: string): MemoryEntry | null {
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      this.memory.delete(key);
      this.saveToDisk();
      return null;
    }
    entry.accessCount++;
    entry.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return entry;
  }

  search(query: string): MemoryEntry[] {
    const lower = query.toLowerCase();
    return Array.from(this.memory.values()).filter(entry => {
      if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) return false;
      return (
        entry.key.toLowerCase().includes(lower) ||
        entry.category.toLowerCase().includes(lower) ||
        entry.tags.some(t => t.toLowerCase().includes(lower)) ||
        JSON.stringify(entry.value).toLowerCase().includes(lower)
      );
    });
  }

  byCategory(category: string): MemoryEntry[] {
    return Array.from(this.memory.values()).filter(e =>
      e.category === category && (!e.expiresAt || new Date(e.expiresAt) > new Date())
    );
  }

  byTags(tags: string[]): MemoryEntry[] {
    return Array.from(this.memory.values()).filter(e =>
      tags.some(t => e.tags.includes(t)) && (!e.expiresAt || new Date(e.expiresAt) > new Date())
    );
  }

  remove(key: string): boolean {
    const existed = this.memory.delete(key);
    if (existed) this.saveToDisk();
    return existed;
  }

  clear(category?: string): number {
    let count = 0;
    if (category) {
      for (const [key, entry] of this.memory) {
        if (entry.category === category) {
          this.memory.delete(key);
          count++;
        }
      }
    } else {
      count = this.memory.size;
      this.memory.clear();
    }
    this.saveToDisk();
    return count;
  }

  stats(): { totalEntries: number; categories: Record<string, number>; totalAccesses: number; oldestEntry?: string; newestEntry?: string } {
    const entries = Array.from(this.memory.values());
    const categories: Record<string, number> = {};
    let totalAccesses = 0;

    entries.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + 1;
      totalAccesses += e.accessCount;
    });

    const sorted = entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return {
      totalEntries: entries.length,
      categories,
      totalAccesses,
      oldestEntry: sorted[0]?.createdAt,
      newestEntry: sorted[sorted.length - 1]?.createdAt,
    };
  }

  listAll(): MemoryEntry[] {
    return Array.from(this.memory.values()).filter(e =>
      !e.expiresAt || new Date(e.expiresAt) > new Date()
    );
  }
}
