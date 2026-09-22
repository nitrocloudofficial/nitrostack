import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SpilloverRecord, SpilloverStore } from './spillover-store.interface.js';

export interface FsSpilloverOptions {
  storageDir?: string;
  sweepIntervalSeconds?: number;
}

export class FsSpilloverStore implements SpilloverStore {
  private readonly storageDir: string;
  private readonly sweepTimer: NodeJS.Timeout;
  private initialized = false;

  constructor(options: FsSpilloverOptions = {}) {
    this.storageDir = options.storageDir ?? path.join(os.tmpdir(), 'nitrostack-spillover');
    const sweepIntervalMs = (options.sweepIntervalSeconds ?? 120) * 1000;

    this.sweepTimer = setInterval(() => {
      this.cleanup().catch(() => {});
    }, sweepIntervalMs);

    if (typeof this.sweepTimer.unref === 'function') {
      this.sweepTimer.unref();
    }
  }

  private async ensureDir(): Promise<void> {
    if (!this.initialized) {
      await fs.mkdir(this.storageDir, { recursive: true });
      this.initialized = true;
    }
  }

  private sanitizeId(id: string): string {
    // Defend against directory traversal attacks (e.g. ../../)
    const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    return sanitized.length > 0 ? sanitized : 'spillover_id';
  }

  private getFilePath(id: string): string {
    return path.join(this.storageDir, `${this.sanitizeId(id)}.json`);
  }

  getStorageDir(): string {
    return this.storageDir;
  }

  async save(id: string, data: string, mimeType: string, ttlSeconds: number): Promise<SpilloverRecord> {
    await this.ensureDir();
    const sizeBytes = Buffer.byteLength(data, 'utf8');
    const now = Date.now();

    const record: SpilloverRecord = {
      id,
      data,
      mimeType,
      sizeBytes,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
    };

    const filePath = this.getFilePath(id);
    const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
    await fs.writeFile(tempPath, JSON.stringify(record), 'utf8');
    await fs.rename(tempPath, filePath);

    return record;
  }

  async get(id: string): Promise<SpilloverRecord | undefined> {
    await this.ensureDir();
    const filePath = this.getFilePath(id);

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const record = JSON.parse(content) as SpilloverRecord;

      if (Date.now() > record.expiresAt) {
        await this.delete(id);
        return undefined;
      }
      return record;
    } catch {
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await fs.unlink(this.getFilePath(id));
      return true;
    } catch {
      return false;
    }
  }

  async cleanup(): Promise<number> {
    await this.ensureDir();
    let pruned = 0;
    const now = Date.now();

    try {
      const files = await fs.readdir(this.storageDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = path.join(this.storageDir, file);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const record = JSON.parse(content) as SpilloverRecord;
          if (now > record.expiresAt) {
            await fs.unlink(filePath);
            pruned++;
          }
        } catch {
          // Bad/partial file, remove
          await fs.unlink(filePath).catch(() => {});
        }
      }
    } catch {
      /* ignore read errors during cleanup */
    }
    return pruned;
  }

  async dispose(): Promise<void> {
    clearInterval(this.sweepTimer);
  }
}
