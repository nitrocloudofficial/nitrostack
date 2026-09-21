import { Module } from '@nitrostack/core';
import { MemoryModule } from '../../core/memory/memory.module.js';
import { EmbeddingsModule } from '../../core/services/embeddings.module.js';
import { GapFinderTools } from './gap-finder.tools.js';

/**
 * Phase 4: Gap Finder Module
 */
@Module({
  name: 'phase4-gap-finder',
  description: 'Novelty assessment and research gap proposal',
  imports: [MemoryModule, EmbeddingsModule],
  providers: [GapFinderTools],
  controllers: [GapFinderTools],
  exports: [GapFinderTools],
})
export class Phase4GapFinderModule {}