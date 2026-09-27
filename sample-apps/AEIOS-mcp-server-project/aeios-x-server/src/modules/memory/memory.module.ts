import { Module } from '@nitrostack/core';
import { MemoryTools } from './memory.tools.js';
import { MemoryResources } from './memory.resources.js';

@Module({
  name: 'memory',
  description: 'Persistent Enterprise Memory - file-backed key-value store with search, categories, and TTL',
  controllers: [MemoryTools, MemoryResources],
})
export class MemoryModule {}
