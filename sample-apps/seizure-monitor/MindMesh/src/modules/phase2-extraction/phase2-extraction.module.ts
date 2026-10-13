import { Module } from '@nitrostack/core';
import { MemoryModule } from '../../core/memory/memory.module.js';
import { EmbeddingsModule } from '../../core/services/embeddings.module.js';
import { SemanticScholarModule } from '../../core/services/semantic-scholar.module.js';
import { ExtractionTools } from './extraction.tools.js';

/**
 * Phase 2: Paper Extraction Module
 */
@Module({
  name: 'phase2-extraction',
  description: 'Paper claim extraction, methodology, datasets, metrics, and technical parameters',
  imports: [MemoryModule, EmbeddingsModule, SemanticScholarModule],
  providers: [ExtractionTools],
  controllers: [ExtractionTools],
})
export class Phase2ExtractionModule {}