import { defineEventHandler } from 'h3';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:afo@localhost:5432/afo',
});

export default defineEventHandler(async () => {
  try {
    await pool.query("UPDATE mitigation_policy SET is_active = false WHERE is_active = true;");
    return { status: "reset", message: "Active mitigation policies deactivated in Postgres." };
  } catch (err: any) {
    return { status: "error", message: err.message };
  }
});
