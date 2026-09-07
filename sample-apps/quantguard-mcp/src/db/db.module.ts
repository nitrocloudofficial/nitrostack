import { Module } from '@nitrostack/core';
import { DbService } from './db.service.js';
import { GetDbSchemaTools } from './get-db-schema.tool.js';

/**
 * DbModule — SQLite database setup and schema management
 */
@Module({
  name: 'db',
  description: 'Database module with SQLite and schema initialization',
  providers: [DbService],
  controllers: [GetDbSchemaTools],
  exports: [DbService]
})
export class DbModule {}
