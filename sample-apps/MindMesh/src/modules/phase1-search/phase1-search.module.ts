import { Module } from '@nitrostack/core';
import { MemoryModule } from '../../core/memory/memory.module.js';
import { SemanticScholarModule } from '../../core/services/semantic-scholar.module.js';
import { QuartileModule } from '../../core/services/quartile.module.js';
import { SearchTools } from './search.tools.js';

/**
 * Phase 1: Paper Search Module
 */
@Module({
  name: 'phase1-search',
  description: 'Paper search, relevance scoring, and metadata retrieval',
  imports: [MemoryModule, SemanticScholarModule, QuartileModule],
  providers: [SearchTools],
  controllers: [SearchTools],
})
export class Phase1SearchModule {}