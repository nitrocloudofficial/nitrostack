import { randomUUID } from 'crypto';

export class ShortId {
  static create(prefix = 'req'): string {
    return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }
}

export class AnalysisCache {
  private store: Map<string, { value: unknown; expiresAt: number }> = new Map();
  private ttlMs: number;

  constructor(ttlSeconds = 300) {
    this.ttlMs = ttlSeconds * 1000;
  }

  set(key: string, value: unknown, ttlOverride?: number): void {
    const expiresAt = Date.now() + (ttlOverride ? ttlOverride * 1000 : this.ttlMs);
    this.store.set(key, { value, expiresAt });
    this.gc();
  }

  get<T = unknown>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    this.gc();
    return this.store.size;
  }

  private gc(): void {
    const now = Date.now();
    for (const [k, v] of this.store.entries()) {
      if (now > v.expiresAt) this.store.delete(k);
    }
  }
}

export const analysisCache = new AnalysisCache(
  Number(process.env.CACHE_TTL_SECONDS || 300)
);
