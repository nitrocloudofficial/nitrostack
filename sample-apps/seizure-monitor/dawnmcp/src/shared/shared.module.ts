import { Module } from '@nitrostack/core';
import { AppConfigService } from '../config/app.config.js';
import { LlmService } from './services/llm.service.js';
import { EmbeddingService } from './services/embedding.service.js';

/**
 * Shared Module
 *
 * Provides cross-cutting services used by all feature modules:
 * configuration, LLM access, and embedding generation.
 */
@Module({
  name: 'shared',
  description: 'Shared AI and configuration services',
  providers: [AppConfigService, LlmService, EmbeddingService],
  exports: [AppConfigService, LlmService, EmbeddingService],
})
export class SharedModule {}
