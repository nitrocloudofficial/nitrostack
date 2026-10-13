/**
 * DatabaseService
 *
 * The ONLY service permitted to read or write the encrypted-at-rest data
 * store. Every record is encrypted with EncryptionService (AES-256-GCM,
 * via a master key it never sees directly) before it touches disk, and
 * decrypted only in-memory, on demand, for the duration of a single
 * request.
 *
 * This is instantiated exclusively inside SecureDataGateway's
 * composition root — no AI agent, File Service, or User Service holds a
 * reference to it. That invariant is what makes "Secure Data Gateway is
 * the only entry/exit point to the database" true in code, not just in
 * a diagram.
 *
 * Storage backend: a local JSON-file store keyed by collection/id, one
 * ciphertext blob per record. Swap `store` for a real encrypted-column
 * SQL/NoSQL backend in production without changing the public interface.
 */

import { mkdir, readFile, writeFile, unlink, readdir } from 'fs/promises';
import { join } from 'path';
import type { IDatabaseService, IEncryptionService } from '../interfaces/gateway.interfaces.js';
import type { EncryptedPayload } from '../types/gateway.types.js';

export class DatabaseService implements IDatabaseService {
  constructor(
    private readonly encryption: IEncryptionService,
    private readonly baseDir: string
  ) {}

  async getEncryptedRecord<T = unknown>(collection: string, id: string): Promise<T | null> {
    const filePath = this.recordPath(collection, id);
    let raw: string;
    try {
      raw = await readFile(filePath, 'utf-8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }

    const payload: EncryptedPayload = JSON.parse(raw);
    const plaintext = await this.encryption.decrypt(payload);
    return JSON.parse(plaintext) as T;
  }

  async putEncryptedRecord<T = unknown>(collection: string, id: string, record: T): Promise<void> {
    const dir = join(this.baseDir, collection);
    await mkdir(dir, { recursive: true });

    const plaintext = JSON.stringify(record);
    const payload = await this.encryption.encrypt(plaintext);

    await writeFile(this.recordPath(collection, id), JSON.stringify(payload), 'utf-8');
  }

  async deleteRecord(collection: string, id: string): Promise<void> {
    try {
      await unlink(this.recordPath(collection, id));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  async listRecordIds(collection: string): Promise<string[]> {
    const dir = join(this.baseDir, collection);
    try {
      const files = await readdir(dir);
      return files.filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  }

  private recordPath(collection: string, id: string): string {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(this.baseDir, collection, `${safeId}.json`);
  }
}

export function createDatabaseServiceFromEnv(
  encryption: IEncryptionService,
  env: NodeJS.ProcessEnv
): DatabaseService {
  const storeDir = env.SECURE_STORE_DIR ?? './secure-store';
  return new DatabaseService(encryption, join(storeDir, 'db'));
}
