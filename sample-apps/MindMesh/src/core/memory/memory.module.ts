import { Module } from '@nitrostack/core';
import { MemoryStore } from './memory.store.js';
import { ConfigModule } from '../config/config.module.js';

/**
 * Memory Module
 *
 * Provides the MemoryStore for session persistence across runs.
 * This is the backbone of the "persistent memory" feature.
 */
@Module({
  name: 'memory',
  description: 'Persistent session memory with JSON file storage',
  imports: [ConfigModule],
  providers: [MemoryStore],
  exports: [MemoryStore],
})
export class MemoryModule {}