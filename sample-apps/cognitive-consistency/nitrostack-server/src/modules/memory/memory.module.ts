import { Module } from '@nitrostack/core';
import { MemoryTools } from './memory.tools.js';

@Module({
  name: 'memory',
  description: 'Shared agent memory — persistent storage for facts, decisions, events, and results across AI agents',
  controllers: [MemoryTools],
})
export class MemoryModule {}
