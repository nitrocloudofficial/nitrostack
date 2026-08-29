import { Module } from '@nitrostack/core';
import { MemoryModule } from '../../core/memory/memory.module.js';
import { SemanticScholarModule } from '../../core/services/semantic-scholar.module.js';
import { TechParamsTools } from './tech-params.tools.js';

/**
 * Phase 8: Technical Parameter Extractor Module (Stretch)
 *
 * Extracts detailed technical parameters from papers (sensors, sampling rates, hardware, etc.)
 */
@Module({
  name: 'phase8-tech-params',
  description: 'Detailed technical parameter extraction from full text',
  imports: [MemoryModule, SemanticScholarModule],
  providers: [TechParamsTools],
  controllers: [TechParamsTools],
})
export class Phase8TechParamsModule {}