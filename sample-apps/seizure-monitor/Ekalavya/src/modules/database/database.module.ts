import { Module } from '@nitrostack/core';
import { DatabaseService } from './database.service.js';

@Module({
  name: 'database',
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
