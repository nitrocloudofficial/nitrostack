import { Module } from '@nitrostack/core';
import { MemoryModule } from '../../core/memory/memory.module.js';
import { MemoryStore } from '../../core/memory/memory.store.js';
import { WritingTools } from './writing.tools.js';

/**
 * Phase 10: Writing Assistance Module
 */
@Module({
  name: 'phase10-writing',
  description: 'Writing checks: tone, AI-generic phrasing, meaning preservation, clarity',
  imports: [MemoryModule],
  providers: [WritingTools, MemoryStore],
  controllers: [WritingTools],
})
export class Phase10WritingModule {}