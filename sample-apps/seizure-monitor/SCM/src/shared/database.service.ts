import { Injectable, OnModuleInit, OnModuleDestroy } from '@nitrostack/core';
import { Database } from '@sqlitecloud/drivers';

/**
 * DatabaseService — singleton SQLite Cloud connection shared by all modules.
 *
 * Every other service that needs SQLite should inject DatabaseService instead
 * of creating its own `new Database(url)`. This ensures:
 *  - A single connection (SQLite Cloud handles the pool internally)
 *  - One place to enable WAL mode and other pragmas
 *  - Clean shutdown on module destroy
 *
 * IMPORTANT — init order:
 *   The `Database` object is created eagerly in the constructor so it is
 *   guaranteed to exist when any other service's `onModuleInit` fires,
 *   regardless of the provider initialization order NitroStack chooses.
 *   The driver connects lazily on the first actual query, so the constructor
 *   is still fast. WAL-mode pragmas are applied in `onModuleInit`.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private _db: Database;

  constructor() {
    const url = process.env['SQLITECLOUD_URL'];
    if (!url) {
      throw new Error(
        '[DatabaseService] SQLITECLOUD_URL is not set. ' +
        'Add it to your .env file or NitroCloud Vault. ' +
        'Format: sqlitecloud://<host>.sqlite.cloud:8860/<db>.sqlite?apikey=<key>',
      );
    }
    // Eagerly create the connection object — the driver connects lazily on first query.
    this._db = new Database(url);
  }

  async onModuleInit(): Promise<void> {
    // Production SQLite pragmas — must run before any other queries
    await this._db.sql('PRAGMA journal_mode = WAL');
    await this._db.sql('PRAGMA foreign_keys = ON');
    await this._db.sql('PRAGMA busy_timeout = 5000');

    console.error('[DatabaseService] Connected to SQLite Cloud (WAL mode) ✓');
  }

  async onModuleDestroy(): Promise<void> {
    await this._db?.close();
    console.error('[DatabaseService] Connection closed');
  }

  /**
   * Expose the raw Database connection for services that need it directly.
   * Always safe to call — _db is set in the constructor.
   */
  get db(): Database {
    return this._db;
  }

  /** Convenience pass-through — keeps callers readable. */
  async sql(query: string, ...params: unknown[]): Promise<unknown[]> {
    return (await this._db.sql(query, ...params)) as unknown[];
  }
}
