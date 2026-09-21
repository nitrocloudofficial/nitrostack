import { Module } from '@nitrostack/core';
import { MemoryModule } from '../../core/memory/memory.module.js';
import { EmbeddingsModule } from '../../core/services/embeddings.module.js';
import { SynthesisTools } from './synthesis.tools.js';

/**
 * Phase 3: Literature Synthesis Module
 *
 * Clusters papers, finds contradictions, and synthesizes themes.
 */
@Module({
  name: 'phase3-synthesis',
  description: 'Paper clustering, contradiction detection, and theme synthesis',
  imports: [MemoryModule, EmbeddingsModule],
  providers: [SynthesisTools],
  controllers: [SynthesisTools],
})
export class Phase3SynthesisModule {}