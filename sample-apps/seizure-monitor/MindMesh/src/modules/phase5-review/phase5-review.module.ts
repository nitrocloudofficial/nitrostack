import { Module } from '@nitrostack/core';
import { MemoryModule } from '../../core/memory/memory.module.js';
import { SemanticScholarModule } from '../../core/services/semantic-scholar.module.js';
import { Phase4GapFinderModule } from '../phase4-gap-finder/phase4-gap-finder.module.js';
import { ReviewTools } from './review.tools.js';
import { GapFinderTools } from '../phase4-gap-finder/gap-finder.tools.js';

/**
 * Phase 5: Adversarial Review Module
 */
@Module({
  name: 'phase5-review',
  description: 'Adversarial review with retry loop - core differentiator',
  imports: [MemoryModule, SemanticScholarModule, Phase4GapFinderModule],
  providers: [ReviewTools, GapFinderTools],
  controllers: [ReviewTools],
})
export class Phase5ReviewModule {}