import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SpilloverRecord, SpilloverStore } from './spillover-store.interface.js';

export interface FsSpilloverOptions {
  storageDir?: string;
  sweepIntervalSeconds?: number;
}

/** Grace period before a leftover temp file is treated as abandoned. */
const ORPHAN_TEMP_FILE_MAX_AGE_MS = 5 * 60 * 1000;

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
      // Owner-only: spilled payloads are the largest tool outputs (query dumps,
      // customer records) and the default location is a shared temp directory.
      await fs.mkdir(this.storageDir, { recursive: true, mode: 0o700 });
      await fs.chmod(this.storageDir, 0o700).catch(() => {});
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
    await fs.writeFile(tempPath, JSON.stringify(record), { encoding: 'utf8', mode: 0o600 });
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
        const filePath = path.join(this.storageDir, file);

        // Sweep leftovers from writes interrupted between writeFile and rename;
        // these never carry the plain `.json` suffix and would otherwise accumulate.
        if (file.includes('.json.tmp.')) {
          const stat = await fs.stat(filePath).catch(() => undefined);
          if (stat && now - stat.mtimeMs > ORPHAN_TEMP_FILE_MAX_AGE_MS) {
            await fs.unlink(filePath).catch(() => {});
            pruned++;
          }
          continue;
        }

        if (!file.endsWith('.json')) continue;
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
