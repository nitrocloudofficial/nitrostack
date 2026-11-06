/** Completed values are LRU/TTL bounded; pending loads are shared independently. */
export class TtlCache<T> {
  private readonly entries = new Map<string, { value: T; expires: number; bytes: number }>();
  private readonly pending = new Map<string, Promise<T>>();
  private bytes = 0;
  private sweep?: ReturnType<typeof setInterval>;

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
    private readonly budget?: { maxBytes: number; sizeOf: (value: T) => number },
  ) {}

  get(key: string, load: () => Promise<T>): Promise<T> {
    this.releaseExpired();
    const hit = this.entries.get(key);
    if (hit) {
      this.entries.delete(key);
      this.entries.set(key, hit);
      return Promise.resolve(hit.value);
    }
    const pending = this.pending.get(key);
    if (pending) return pending;

    const value = Promise.resolve().then(load).then(result => {
      if (this.pending.get(key) !== value) return result;
      const bytes = this.budget?.sizeOf(result) ?? 0;
      if (this.maxEntries > 0 && Number.isFinite(bytes) && bytes >= 0
        && bytes <= (this.budget?.maxBytes ?? Infinity)) {
        this.releaseExpired();
        this.entries.set(key, { value: result, expires: Date.now() + this.ttlMs, bytes });
        this.bytes += bytes;
        while (this.entries.size > this.maxEntries || this.bytes > (this.budget?.maxBytes ?? Infinity)) {
          this.remove(this.entries.keys().next().value!);
        }
        if (!this.sweep && this.entries.size) {
          this.sweep = setInterval(() => this.releaseExpired(), Math.min(Math.max(this.ttlMs, 1), 30_000));
          this.sweep.unref();
        }
      }
      return result;
    }).finally(() => {
      if (this.pending.get(key) === value) this.pending.delete(key);
    });
    this.pending.set(key, value);
    return value;
  }

  private remove(key: string): void {
    const entry = this.entries.get(key);
    if (entry) this.bytes -= entry.bytes;
    this.entries.delete(key);
  }

  private releaseExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expires <= now) this.remove(key);
    }
    if (!this.entries.size && this.sweep) {
      clearInterval(this.sweep);
      this.sweep = undefined;
    }
  }

  clear(): void {
    this.entries.clear();
    this.pending.clear();
    this.bytes = 0;
    if (this.sweep) clearInterval(this.sweep);
    this.sweep = undefined;
  }
}
