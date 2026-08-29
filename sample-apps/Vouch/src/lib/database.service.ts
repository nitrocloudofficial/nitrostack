import { Injectable, ConfigService } from '@nitrostack/core';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

/**
 * Database Service
 * Manages Postgres connection pool and provides query helpers.
 * Uses lazy initialization to allow module registration even if DB is unavailable.
 */
@Injectable({ deps: [ConfigService] })
export class DatabaseService {
  private pool: Pool | null = null;
  private initialized = false;

  constructor(private configService: ConfigService) {}

  /**
   * Initialize the connection pool (lazy-loaded)
   */
  private async ensureConnected(): Promise<void> {
    if (this.initialized) return;

    const dbUrl = this.configService.get('DATABASE_URL') || 'postgresql://localhost/trustpass';
    
    this.pool = new Pool({
      connectionString: dbUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err: Error) => {
      // Log pool errors (use ctx.logger in tools, but this is service-level)
      console.error('Unexpected error on idle client', err);
    });

    this.initialized = true;
  }

  /**
   * Execute a query and return results
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    values?: any[]
  ): Promise<QueryResult<T>> {
    await this.ensureConnected();
    if (!this.pool) throw new Error('Database pool not initialized');
    return this.pool.query<T>(text, values);
  }

  /**
   * Execute a query and return the first row
   */
  async queryOne<T extends QueryResultRow = any>(
    text: string,
    values?: any[]
  ): Promise<T | null> {
    const result = await this.query<T>(text, values);
    return result.rows[0] || null;
  }

  /**
   * Execute a query and return all rows
   */
  async queryAll<T extends QueryResultRow = any>(
    text: string,
    values?: any[]
  ): Promise<T[]> {
    const result = await this.query<T>(text, values);
    return result.rows;
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    await this.ensureConnected();
    if (!this.pool) throw new Error('Database pool not initialized');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close the pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.initialized = false;
    }
  }
}
