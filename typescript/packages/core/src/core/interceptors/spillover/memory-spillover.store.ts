import { SpilloverRecord, SpilloverStore } from './spillover-store.interface.js';

export interface MemorySpilloverOptions {
  maxSizeBytes?: number; // default: 100MB (100 * 1024 * 1024)
  sweepIntervalSeconds?: number; // default: 60s
}

export class MemorySpilloverStore implements SpilloverStore {
  private readonly records = new Map<string, SpilloverRecord>();
  private currentSizeBytes = 0;
  private readonly maxSizeBytes: number;
  private readonly sweepTimer: NodeJS.Timeout;

  constructor(options: MemorySpilloverOptions = {}) {
    this.maxSizeBytes = options.maxSizeBytes ?? 100 * 1024 * 1024;
    const sweepIntervalMs = (options.sweepIntervalSeconds ?? 60) * 1000;

    this.sweepTimer = setInterval(() => {
      this.cleanup().catch(() => {});
    }, sweepIntervalMs);

    if (typeof this.sweepTimer.unref === 'function') {
      this.sweepTimer.unref();
    }
  }

  async save(id: string, data: string, mimeType: string, ttlSeconds: number, sessionId?: string): Promise<SpilloverRecord> {
    const sizeBytes = Buffer.byteLength(data, 'utf8');
    const now = Date.now();

    // Reject before evicting: a record larger than the cap would otherwise clear the
    // entire store and still be admitted, leaving usage above the configured limit.
    if (sizeBytes > this.maxSizeBytes) {
      throw new Error(
        `Spillover payload of ${sizeBytes} bytes exceeds the store limit of ${this.maxSizeBytes} bytes. ` +
          `Raise maxSizeBytes or use the filesystem spillover driver.`
      );
    }

    // If updating an existing id, subtract prior size first
    const existing = this.records.get(id);
    if (existing) {
      this.currentSizeBytes -= existing.sizeBytes;
      this.records.delete(id);
    }

    // Evict oldest if adding this record exceeds max memory capacity
    while (this.currentSizeBytes + sizeBytes > this.maxSizeBytes && this.records.size > 0) {
      this.evictOldest();
    }

    const record: SpilloverRecord = {
      expiresAt: now + ttlSeconds * 1000,
      id,
      mimeType,
      sizeBytes,
      createdAt: now,
      sessionId,
      data,
    };

    this.records.set(id, record);
    this.currentSizeBytes += sizeBytes;
    return record;
  }

  async get(id: string): Promise<SpilloverRecord | undefined> {
    const record = this.records.get(id);
    if (!record) return undefined;

    if (Date.now() > record.expiresAt) {
      await this.delete(id);
      return undefined;
    }

    // Refresh Map insertion order for LRU
    this.records.delete(id);
    this.records.set(id, record);
    return record;
  }

  async delete(id: string): Promise<boolean> {
    const record = this.records.get(id);
    if (!record) return false;

    this.currentSizeBytes -= record.sizeBytes;
    return this.records.delete(id);
  }

  async cleanup(): Promise<number> {
    const now = Date.now();
    let pruned = 0;
    for (const [id, record] of this.records.entries()) {
      if (now > record.expiresAt) {
        this.currentSizeBytes -= record.sizeBytes;
        this.records.delete(id);
        pruned++;
      }
    }
    return pruned;
  }

  private evictOldest(): void {
    const oldestKey = this.records.keys().next().value;
    if (oldestKey !== undefined) {
      const rec = this.records.get(oldestKey);
      if (rec) {
        this.currentSizeBytes -= rec.sizeBytes;
      }
      this.records.delete(oldestKey);
    }
  }

  getMaxSizeBytes(): number {
    return this.maxSizeBytes;
  }

  getCurrentSizeBytes(): number {
    return this.currentSizeBytes;
  }

  getRecordCount(): number {
    return this.records.size;
  }

  async dispose(): Promise<void> {
    clearInterval(this.sweepTimer);
    this.records.clear();
    this.currentSizeBytes = 0;
  }
}
