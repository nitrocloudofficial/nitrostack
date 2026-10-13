import { Cache as NitroCache } from '@nitrostack/core';

type CacheOptions = {
  ttl: number;
  key?: (input: unknown, context: unknown) => string;
  storage?: CacheStorage;
};

type CacheStorage = {
  get(key: string): Promise<unknown> | unknown;
  set(key: string, value: unknown, ttl: number): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  clear(): Promise<void> | void;
};
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Cache decorator with request-local hit/miss telemetry.
 * NitroStack's built-in cache does not expose hit state to the request context,
 * so this adapter preserves its behavior while allowing the audit/metrics
 * pipeline to report cache outcomes.
 */
const cacheContextStorage = new AsyncLocalStorage<Record<string, any>>();

class InMemoryCacheStorage implements CacheStorage {
  private readonly values = new Map<string, { value: unknown; expiresAt: number }>();

  get(key: string): unknown {
    const cached = this.values.get(key);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
      this.values.delete(key);
      return null;
    }
    return cached.value;
  }

  set(key: string, value: unknown, ttl: number): void {
    this.values.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
  }

  delete(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

class ObservableCacheStorage implements CacheStorage {
  constructor(private readonly delegate: CacheStorage) {}

  async get(key: string): Promise<unknown> {
    const value = await this.delegate.get(key);
    const context = cacheContextStorage.getStore();
    if (context) context.cache_hit = value !== null && value !== undefined;
    return value;
  }

  set(key: string, value: unknown, ttl: number): Promise<void> | void {
    return this.delegate.set(key, value, ttl);
  }

  delete(key: string): Promise<void> | void {
    return this.delegate.delete(key);
  }

  clear(): Promise<void> | void {
    return this.delegate.clear();
  }
}

export function Cache(options: CacheOptions): MethodDecorator {
  const storage = new ObservableCacheStorage(options.storage ?? new InMemoryCacheStorage());
  const applyNitroCache = NitroCache({ ...options, storage });

  return (target, propertyKey, descriptor) => {
    applyNitroCache(target, propertyKey, descriptor);

    const cachedMethod = descriptor?.value;
    if (typeof cachedMethod !== 'function') return descriptor;

    const methodDescriptor = descriptor as PropertyDescriptor;
    methodDescriptor.value = async function (this: unknown, ...args: unknown[]) {
      const context = args[1] as Record<string, any> | undefined;
      if (!context) return cachedMethod.apply(this, args);

      context.cache_hit = false;
      return cacheContextStorage.run(context, () => cachedMethod.apply(this, args));
    };

    return descriptor;
  };
}
