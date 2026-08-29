import { Module } from '@nitrostack/core';
import { SemanticScholarService } from './semantic-scholar.service.js';
import { ConfigModule } from '../config/config.module.js';

/**
 * Semantic Scholar Module
 */
@Module({
  name: 'semantic-scholar',
  description: 'Semantic Scholar API wrapper for paper search and metadata',
  imports: [ConfigModule],
  providers: [SemanticScholarService],
  exports: [SemanticScholarService],
})
export class SemanticScholarModule {}