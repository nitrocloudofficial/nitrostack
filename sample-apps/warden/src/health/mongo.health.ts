import { HealthCheck, HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';
import { getWardenDb, isMongoConfigured } from '../data/mongo.client.js';

/**
 * MongoDB Health Check
 *
 * Pings the Atlas connection backing the findings pipeline
 * (ingest_finding / query_findings / analyze_finding_history /
 * triage_finding's persistence write). This is what NitroStudio's own
 * health-check panel reads — without it registered, that panel (and any
 * other health-check consumer) has no way to see whether the database is
 * actually reachable, only whether the code exists.
 */
@HealthCheck({
  name: 'mongodb',
  description: 'MongoDB Atlas connectivity for the findings pipeline',
  interval: 30,
})
export class MongoHealthCheck implements HealthCheckInterface {
  async check(): Promise<HealthCheckResult> {
    if (!isMongoConfigured()) {
      return {
        status: 'down',
        message: 'MONGODB_URI is not configured',
        details: { configured: false },
      };
    }

    try {
      const start = Date.now();
      const db = await getWardenDb();
      await db.command({ ping: 1 });
      const latencyMs = Date.now() - start;

      return {
        status: 'up',
        message: 'MongoDB Atlas reachable',
        details: { database: db.databaseName, latencyMs },
      };
    } catch (error: any) {
      return {
        status: 'down',
        message: 'MongoDB ping failed',
        details: error?.message ?? String(error),
      };
    }
  }
}
