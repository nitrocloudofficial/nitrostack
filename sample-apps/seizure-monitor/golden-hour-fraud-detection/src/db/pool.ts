/**
 * Shared PostgreSQL connection pool.
 *
 * Reads DATABASE_URL from process.env (loaded via `dotenv/config` in index.ts).
 * Exports a lazy singleton — the pool is created on first import and reused
 * across all tool classes for the lifetime of the process.
 */
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn(
    '⚠️  DATABASE_URL is not set. Database queries will fail at runtime.',
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                 // sensible default for an MCP tool server
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Surface unexpected pool errors so they don't crash the process silently.
pool.on('error', (err) => {
  console.error('⚠️  Unexpected PostgreSQL pool error:', err.message);
});
