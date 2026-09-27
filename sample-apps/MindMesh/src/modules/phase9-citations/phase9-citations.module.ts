import { Module } from '@nitrostack/core';
import { MemoryModule } from '../../core/memory/memory.module.js';
import { CitationTools } from './citation.tools.js';

/**
 * Phase 9: Citation Management Module
 */
@Module({
  name: 'phase9-citations',
  description: 'Citation generation in IEEE, APA, MLA formats and BibTeX export',
  imports: [MemoryModule],
  providers: [CitationTools],
  controllers: [CitationTools],
})
export class Phase9CitationsModule {}