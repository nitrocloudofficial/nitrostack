import { Module } from '@nitrostack/core';
import { SharedModule } from '../../shared/shared.module.js';
import { DatabaseModule } from '../../database/database.module.js';
import { MemoryService } from './memory.service.js';
import { MemoryTools } from './memory.tools.js';
import { MemoryResources } from './memory.resource.js';

/**
 * Memory Module
 *
 * Persistent AI memory with semantic search.
 * Provides save, search, update, and delete operations via MCP tools,
 * plus read-only resources for memory history and user profile.
 */
@Module({
  name: 'memory',
  description: 'Persistent AI memory with semantic vector search',
  imports: [SharedModule, DatabaseModule],
  providers: [MemoryService],
  controllers: [MemoryTools, MemoryResources],
  exports: [MemoryService],
})
export class MemoryModule {}
