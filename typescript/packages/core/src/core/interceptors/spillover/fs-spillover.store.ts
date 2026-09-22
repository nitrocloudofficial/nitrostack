import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SpilloverRecord, SpilloverStore } from './spillover-store.interface.js';

export interface FsSpilloverOptions {
  storageDir?: string;
  sweepIntervalSeconds?: number;
  /** Total bytes retained on disk (default: 512MB). A single record larger than this is refused. */
  maxSizeBytes?: number;
}

/** Grace period before a leftover temp file is treated as abandoned. */
const ORPHAN_TEMP_FILE_MAX_AGE_MS = 5 * 60 * 1000;

export class FsSpilloverStore implements SpilloverStore {
  private readonly storageDir: string;
  private readonly maxSizeBytes: number;
  private readonly sweepTimer: NodeJS.Timeout;
  private initialized = false;
  private usageReady = false;
  private currentSizeBytes = 0;

  constructor(options: FsSpilloverOptions = {}) {
    this.storageDir = options.storageDir ?? path.join(os.tmpdir(), 'nitrostack-spillover');
    this.maxSizeBytes = options.maxSizeBytes ?? 512 * 1024 * 1024;
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

  getMaxSizeBytes(): number {
    return this.maxSizeBytes;
  }

  async save(id: string, data: string, mimeType: string, ttlSeconds: number, sessionId?: string): Promise<SpilloverRecord> {
    await this.ensureDir();
    await this.ensureUsage();
    const sizeBytes = Buffer.byteLength(data, 'utf8');
    if (sizeBytes > this.maxSizeBytes) {
      throw new Error(
        `Spillover payload of ${sizeBytes} bytes exceeds the store limit of ${this.maxSizeBytes} bytes.`
      );
    }

    const filePath = this.getFilePath(id);
    const existingBytes = await this.fileSize(filePath);
    if (existingBytes > 0) this.currentSizeBytes -= existingBytes;

    try {
      while (this.currentSizeBytes + sizeBytes > this.maxSizeBytes) {
        const evicted = await this.evictOldestFile(filePath);
        if (!evicted) break;
      }
      if (this.currentSizeBytes + sizeBytes > this.maxSizeBytes) {
        throw new Error(
          `Spillover store is at capacity (${this.maxSizeBytes} bytes). ` +
            `Raise maxSizeBytes or remove expired payloads.`
        );
      }
    } catch (err) {
      this.currentSizeBytes += existingBytes;
      throw err;
    }

    const now = Date.now();

    const record: SpilloverRecord = {
      // expiresAt is first so cleanup can read it from the file prefix
      // without loading the spilled payload.
      expiresAt: now + ttlSeconds * 1000,
      id,
      mimeType,
      sizeBytes,
      createdAt: now,
      sessionId,
      data,
    };

    const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
    await fs.writeFile(tempPath, JSON.stringify(record), { encoding: 'utf8', mode: 0o600 });
    await fs.rename(tempPath, filePath);
    this.currentSizeBytes += await this.fileSize(filePath);

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
    const filePath = this.getFilePath(id);
    const size = await this.fileSize(filePath);
    try {
      await fs.unlink(filePath);
      if (this.usageReady) this.currentSizeBytes = Math.max(0, this.currentSizeBytes - size);
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
            if (this.usageReady) this.currentSizeBytes = Math.max(0, this.currentSizeBytes - stat.size);
            pruned++;
          }
          continue;
        }

        if (!file.endsWith('.json')) continue;
        try {
          const expiresAt = await this.readExpiresAt(filePath);
          if (expiresAt === undefined || now > expiresAt) {
            const size = await this.fileSize(filePath);
            await fs.unlink(filePath);
            if (this.usageReady) this.currentSizeBytes = Math.max(0, this.currentSizeBytes - size);
            pruned++;
          }
        } catch {
          // Bad/partial file, remove
          const size = await this.fileSize(filePath);
          await fs.unlink(filePath).catch(() => {});
          if (this.usageReady) this.currentSizeBytes = Math.max(0, this.currentSizeBytes - size);
        }
      }
    } catch {
      /* ignore read errors during cleanup */
    }
    return pruned;
  }

  private async ensureUsage(): Promise<void> {
    if (this.usageReady) return;
    let total = 0;
    const files = await fs.readdir(this.storageDir).catch(() => [] as string[]);
    for (const file of files) {
      if (!file.endsWith('.json') || file.includes('.json.tmp.')) continue;
      total += await this.fileSize(path.join(this.storageDir, file));
    }
    this.currentSizeBytes = total;
    this.usageReady = true;
  }

  private async fileSize(filePath: string): Promise<number> {
    const stat = await fs.stat(filePath).catch(() => undefined);
    return stat?.size ?? 0;
  }

  /** Deletes the oldest payload file, excluding the path about to be replaced. */
  private async evictOldestFile(skipPath?: string): Promise<boolean> {
    const files = await fs.readdir(this.storageDir).catch(() => [] as string[]);
    let oldest: { filePath: string; mtimeMs: number; size: number } | undefined;
    for (const file of files) {
      if (!file.endsWith('.json') || file.includes('.json.tmp.')) continue;
      const filePath = path.join(this.storageDir, file);
      if (skipPath && filePath === skipPath) continue;
      const stat = await fs.stat(filePath).catch(() => undefined);
      if (!stat) continue;
      if (!oldest || stat.mtimeMs < oldest.mtimeMs) {
        oldest = { filePath, mtimeMs: stat.mtimeMs, size: stat.size };
      }
    }
    if (!oldest) return false;
    await fs.unlink(oldest.filePath).catch(() => undefined);
    this.currentSizeBytes = Math.max(0, this.currentSizeBytes - oldest.size);
    return true;
  }

  /** First bytes of a record. `expiresAt` is written before the payload. */
  private async readExpiresAt(filePath: string): Promise<number | undefined> {
    const fh = await fs.open(filePath, 'r');
    try {
      const buf = Buffer.alloc(96);
      const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
      const head = buf.subarray(0, bytesRead).toString('utf8');
      const match = head.match(/"expiresAt"\s*:\s*(\d+)/);
      if (!match?.[1]) return undefined;
      return Number(match[1]);
    } finally {
      await fh.close();
    }
  }

  async dispose(): Promise<void> {
    clearInterval(this.sweepTimer);
  }
}
