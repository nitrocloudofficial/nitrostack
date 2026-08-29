import { Module } from '@nitrostack/core';
import { IngestTools } from './ingest.tools.js';
import { ParserService } from './parser.service.js';
import { PlannerService } from './planner.service.js';
import { ARTIFACT_STORE } from '../../contracts/store.contract.js';
import { InMemoryArtifactStore } from '../../testing/in-memory-artifact-store.js';
import { AnthropicProvider } from './providers/anthropic-provider.js';
import { GroqProvider } from './providers/groq-provider.js';
import { ModelProviderFactory } from './providers/provider-factory.js';

@Module({
  name: 'ingest',
  description: 'OpenAPI spec -> EndpointGraph (deterministic) -> ToolSurfaceIR (LLM planner)',
  controllers: [IngestTools],
  providers: [
    ParserService,
    PlannerService,
    // Provider abstraction: PlannerService no longer talks to Anthropic
    // directly. AnthropicProvider is the only one verified against a live
    // endpoint; GroqProvider exists and typechecks but has never run
    // against api.groq.com (confirmed blocked from the dev sandbox that
    // built this) — see its doc comment before trusting it in production.
    AnthropicProvider,
    GroqProvider,
    ModelProviderFactory,
    // TEMPORARY: swap for W3's real store.service.ts at SYNC 4/convergence.
    // Kept here (not in app.module.ts) so this module boots standalone for
    // local dev/testing without waiting on W3.
    { provide: ARTIFACT_STORE, useClass: InMemoryArtifactStore },
  ],
  imports: [],
  exports: [ParserService, PlannerService],
})
export class IngestModule {}
