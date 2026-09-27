import { Module } from '@nitrostack/core';
import { MemoryModule } from '../../core/memory/memory.module.js';
import { EmbeddingsModule } from '../../core/services/embeddings.module.js';
import { SemanticScholarModule } from '../../core/services/semantic-scholar.module.js';
import { AnalogyTools } from './analogy.tools.js';

/**
 * Phase 7: Cross-Domain Analogist Module (Stretch)
 */
@Module({
  name: 'phase7-analogy',
  description: 'Cross-domain analogy discovery for technique transfer',
  imports: [MemoryModule, EmbeddingsModule, SemanticScholarModule],
  providers: [AnalogyTools],
  controllers: [AnalogyTools],
})
export class Phase7AnalogyModule {}