import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://decisiontrail:decisiontrail@localhost:5433/decisiontrail',
});

export async function testDbConnection() {
  const client = await db.connect();
  try {
    const res = await client.query('SELECT NOW() as current_time, version();');
    console.log('✅ DB Connection Successful:', res.rows[0]);
    return res.rows[0];
  } finally {
    client.release();
  }
}
