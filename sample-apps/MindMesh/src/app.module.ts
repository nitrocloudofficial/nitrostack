import { McpApp, Module } from '@nitrostack/core';
import { ConfigModule as AppConfigModule } from './core/config/config.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { MemoryModule } from './core/memory/memory.module.js';
import { SemanticScholarModule } from './core/services/semantic-scholar.module.js';
import { EmbeddingsModule } from './core/services/embeddings.module.js';
import { GithubModule } from './core/services/github.module.js';
import { QuartileModule } from './core/services/quartile.module.js';
import { OverleafModule } from './core/services/overleaf.module.js';

// Phase modules
import { Phase0PriorWorkModule } from './modules/phase0-prior-work/phase0-prior-work.module.js';
import { Phase1SearchModule } from './modules/phase1-search/phase1-search.module.js';
import { Phase2ExtractionModule } from './modules/phase2-extraction/phase2-extraction.module.js';
import { Phase3SynthesisModule } from './modules/phase3-synthesis/phase3-synthesis.module.js';
import { Phase4GapFinderModule } from './modules/phase4-gap-finder/phase4-gap-finder.module.js';
import { Phase5ReviewModule } from './modules/phase5-review/phase5-review.module.js';
import { Phase6VerdictModule } from './modules/phase6-verdict/phase6-verdict.module.js';
import { Phase7AnalogyModule } from './modules/phase7-analogy/phase7-analogy.module.js';
import { Phase8TechParamsModule } from './modules/phase8-tech-params/phase8-tech-params.module.js';
import { Phase9CitationsModule } from './modules/phase9-citations/phase9-citations.module.js';
import { Phase10WritingModule } from './modules/phase10-writing/phase10-writing.module.js';
import { Phase11VerificationModule } from './modules/phase11-verification/phase11-verification.module.js';
import { Phase12MemoryModule } from './modules/phase12-memory/phase12-memory.module.js';
import { Phase13OverleafModule } from './modules/phase13-overleaf/phase13-overleaf.module.js';

/**
 * Root Application Module
 *
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'research-pilot',
    version: '0.1.0'
  },
  logging: {
    level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info'
  }
})
@Module({
  name: 'app',
  description: 'Research Pilot - AI Research Assistant MCP Server',
  imports: [
    AppConfigModule,
    // Core infrastructure modules
    MemoryModule,
    SemanticScholarModule,
    EmbeddingsModule,
    GithubModule,
    QuartileModule,
    OverleafModule,
    // Phase modules (in order of dependency)
    Phase0PriorWorkModule,
    Phase1SearchModule,
    Phase2ExtractionModule,
    Phase3SynthesisModule,
    Phase4GapFinderModule,
    Phase5ReviewModule,
    Phase6VerdictModule,
    Phase7AnalogyModule,
    Phase8TechParamsModule,
    Phase9CitationsModule,
    Phase10WritingModule,
    Phase11VerificationModule,
    Phase12MemoryModule,
    Phase13OverleafModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}