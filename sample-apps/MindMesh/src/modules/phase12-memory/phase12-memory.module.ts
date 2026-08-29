import { Module } from '@nitrostack/core';
import { MemoryModule } from '../../core/memory/memory.module.js';
import { MemoryResources } from './memory.resources.js';

/**
 * Phase 12: Memory Persistence Module
 *
 * Session resources for persistent memory across research sessions.
 * Provides URI-based access to session state and knowledge graphs.
 */
@Module({
  name: 'phase12-memory',
  description: 'Persistent memory resources across research sessions',
  imports: [MemoryModule],
  providers: [MemoryResources],
  controllers: [MemoryResources],
})
export class Phase12MemoryModule {}