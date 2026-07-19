import { HealthCheck, HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';
import pg from 'pg';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const { Client } = pg;

function sanitizeDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  let sanitized = url;
  if (sanitized.includes('db.qinybzqtfsqrjlljtmhm.supabase.co')) {
    sanitized = sanitized
      .replace('postgresql://postgres:', 'postgresql://postgres.qinybzqtfsqrjlljtmhm:')
      .replace('db.qinybzqtfsqrjlljtmhm.supabase.co:5432', 'aws-0-ap-northeast-1.pooler.supabase.com:6543')
      .replace('db.qinybzqtfsqrjlljtmhm.supabase.co', 'aws-0-ap-northeast-1.pooler.supabase.com:6543');
  }
  const atIndex = sanitized.indexOf('@');
  if (atIndex !== -1) {
    const userPassPart = sanitized.substring(0, atIndex);
    const hostPart = sanitized.substring(atIndex);
    const sanitizedUserPass = userPassPart.replace(/#/g, '%23');
    return sanitizedUserPass + hostPart;
  }
  return sanitized;
}

@HealthCheck({
  name: 'database',
  description: 'Supabase PostgreSQL database connectivity check',
  interval: 60
})
export class DatabaseHealthCheck implements HealthCheckInterface {
  async check(): Promise<HealthCheckResult> {
    const connStr = sanitizeDatabaseUrl(process.env.DATABASE_URL);
    if (!connStr) {
      return {
        status: 'down',
        message: 'DATABASE_URL environment variable is not set',
        details: 'Missing DATABASE_URL'
      };
    }
    const client = new Client({
      connectionString: connStr,
      ssl: connStr.includes("supabase") || process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    });
    try {
      await client.connect();
      const res = await client.query('SELECT 1 as ok');
      await client.end();
      if (res.rows[0]?.ok === 1) {
        return {
          status: 'up',
          message: 'Database connection is healthy',
          details: { status: 'healthy' }
        };
      }
      throw new Error('Invalid query result');
    } catch (error: any) {
      return {
        status: 'down',
        message: 'Failed to connect to database',
        details: error.message
      };
    }
  }
}
