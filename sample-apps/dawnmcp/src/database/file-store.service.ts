import { Injectable, OnModuleInit } from '@nitrostack/core';
import type { IFileStore } from '../shared/interfaces/storage.interface.js';
import { AppConfigService } from '../config/app.config.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * JSON File Store Service
 *
 * Structured data persistence using JSON files on disk.
 * Each collection is a directory; each record is a JSON file named by its ID.
 *
 * Storage layout:
 *   DATA_DIR/store/<collection>/<id>.json
 */
@Injectable()
export class FileStoreService implements IFileStore, OnModuleInit {
  private readonly storeDir: string;

  constructor(private readonly config: AppConfigService) {
    this.storeDir = path.resolve(config.dataDir, 'store');
  }

  // ── Lifecycle ──────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    fs.mkdirSync(this.storeDir, { recursive: true });
    console.error(`✅ File store initialized at ${this.storeDir}`);
  }

  // ── IFileStore implementation ──────────────────────────────────────

  async get<T>(collection: string, id: string): Promise<T | null> {
    const filePath = this.recordPath(collection, id);
    if (!fs.existsSync(filePath)) return null;

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T extends Record<string, unknown>>(
    collection: string,
    id: string,
    data: T,
  ): Promise<void> {
    const collDir = this.collectionDir(collection);
    fs.mkdirSync(collDir, { recursive: true });

    const filePath = this.recordPath(collection, id);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async delete(collection: string, id: string): Promise<boolean> {
    const filePath = this.recordPath(collection, id);
    if (!fs.existsSync(filePath)) return false;

    fs.unlinkSync(filePath);
    return true;
  }

  async list<T>(collection: string): Promise<T[]> {
    const collDir = this.collectionDir(collection);
    if (!fs.existsSync(collDir)) return [];

    const files = fs.readdirSync(collDir).filter((f) => f.endsWith('.json'));
    const records: T[] = [];

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(collDir, file), 'utf-8');
        records.push(JSON.parse(raw) as T);
      } catch {
        // Skip corrupted records
      }
    }

    return records;
  }

  async query<T>(collection: string, predicate: (item: T) => boolean): Promise<T[]> {
    const all = await this.list<T>(collection);
    return all.filter(predicate);
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private collectionDir(collection: string): string {
    return path.join(this.storeDir, collection);
  }

  private recordPath(collection: string, id: string): string {
    // Sanitize ID to prevent path traversal
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.storeDir, collection, `${safeId}.json`);
  }
}
