import { Module } from '@nitrostack/core';
import { DatabaseService } from './database.service.js';

@Module({
  name: 'database',
  description: 'MongoDB connection module (Mongoose) shared by all feature modules',
  providers: [DatabaseService],
  exports: [DatabaseService]
})
export class DatabaseModule {}
