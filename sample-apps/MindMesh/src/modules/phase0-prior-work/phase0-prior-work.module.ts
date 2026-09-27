import { Module } from '@nitrostack/core';
import { ConfigModule } from '../../core/config/config.module.js';
import { MemoryModule } from '../../core/memory/memory.module.js';
import { SemanticScholarModule } from '../../core/services/semantic-scholar.module.js';
import { GithubModule } from '../../core/services/github.module.js';
import { PriorWorkTools } from './prior-work.tools.js';
import { PriorWorkResources } from './prior-work.resources.js';

/**
 * Phase 0: Prior Work Module
 * Import core modules for DI injection. Tools in both providers & controllers.
 */
@Module({
  name: 'phase0-prior-work',
  description: 'Prior work discovery - papers, repos, and previous AI sessions',
  imports: [ConfigModule, MemoryModule, SemanticScholarModule, GithubModule],
  providers: [PriorWorkTools, PriorWorkResources],
  controllers: [PriorWorkTools, PriorWorkResources],
})
export class Phase0PriorWorkModule {}