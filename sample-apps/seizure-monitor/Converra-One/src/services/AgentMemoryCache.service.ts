interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

export class AgentMemoryCacheService {
  private static instance: AgentMemoryCacheService;
  private cache: Map<string, CacheItem<unknown>>;

  constructor() {
    this.cache = new Map();
  }

  public static getInstance(): AgentMemoryCacheService {
    if (!AgentMemoryCacheService.instance) {
      AgentMemoryCacheService.instance = new AgentMemoryCacheService();
    }
    return AgentMemoryCacheService.instance;
  }

  public set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  public get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }
}
