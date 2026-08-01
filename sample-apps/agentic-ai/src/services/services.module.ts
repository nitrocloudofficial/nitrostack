import { Module } from '@nitrostack/core';
import { AiService } from './ai.service.js';
import { DatabaseService } from './database.service.js';
import { QueueService } from './queue.service.js';

@Module({
  name: 'services',
  description: 'Shared FactoryBrain services',
  providers: [AiService, DatabaseService, QueueService],
  exports: [AiService, DatabaseService, QueueService],
})
export class ServicesModule {}
