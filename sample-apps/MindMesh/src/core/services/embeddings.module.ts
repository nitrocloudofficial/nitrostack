import { Module } from '@nitrostack/core';
import { EmbeddingsService } from './embeddings.service.js';
import { ConfigModule } from '../config/config.module.js';

/**
 * Embeddings Module
 *
 * Provides text embedding generation for clustering and similarity.
 */
@Module({
  name: 'embeddings',
  description: 'Text embeddings for clustering, similarity, and novelty detection',
  imports: [ConfigModule],
  providers: [EmbeddingsService],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {
  constructor(private embeddings: EmbeddingsService) {}

  async onModuleInit(): Promise<void> {
    await this.embeddings.initialize();
  }
}