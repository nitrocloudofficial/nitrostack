import { Module } from '@nitrostack/core';
import { MemoryTools } from './memory.tools.js';
import { MemoryResources } from './memory.resources.js';
import { MemoryPrompts } from './memory.prompts.js';
import { MemoryDatabaseService } from './memory.database.js';

@Module({
  name: 'memory',
  description: 'Shared memory engine for storing and retrieving conversation memories with semantic search',
  controllers: [MemoryTools, MemoryResources, MemoryPrompts],
  providers: [MemoryDatabaseService],
})
export class MemoryModule {}
