import { Injectable } from '@nitrostack/core';
import { MongoService } from './mongo.service.js';

/**
 * Health Service
 *
 * Provides database and external service connectivity health diagnostics.
 */
@Injectable({ deps: [MongoService] })
export class HealthService {
  constructor(private readonly mongoService: MongoService) {}

  async checkDatabaseConnection(): Promise<'Connected' | 'Failed'> {
    try {
      const db = await this.mongoService.getDb();
      await db.command({ ping: 1 });
      return 'Connected';
    } catch (error) {
      return 'Failed';
    }
  }
}
