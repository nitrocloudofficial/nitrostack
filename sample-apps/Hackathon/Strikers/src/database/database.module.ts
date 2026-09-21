import { Module } from '@nitrostack/core';
import { DatabaseService } from './database.service.js';

/**
 * Shared MongoDB access layer. Exports `DatabaseService` so feature modules
 * (discovery, appointments) can inject it without owning a connection.
 */
@Module({
  name: 'database',
  description: 'MongoDB (health) connection, schemas and demo seeding',
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
