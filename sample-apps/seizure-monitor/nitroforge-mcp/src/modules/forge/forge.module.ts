import { Module } from '@nitrostack/core';
import { ForgeTools } from './forge.tools.js';
import { EmitterService } from './emitter.service.js';
import { VerifierService } from './verifier.service.js';
import { ARTIFACT_STORE } from '../../contracts/store.contract.js';
import { InMemoryArtifactStore } from '../../testing/in-memory-artifact-store.js';

/**
 * forge.module.ts — mirrors ingest.module.ts's own temporary ARTIFACT_STORE
 * binding pattern. This is safe to duplicate, not a bug: DIContainer
 * (node_modules/@nitrostack/core/dist/core/di/container.js) is a flat
 * *global* singleton keyed by token, not a per-module hierarchical
 * injector — `resolve()` caches exactly one instance per token app-wide
 * regardless of which module's `providers` array registered it last. Both
 * modules end up sharing the same InMemoryArtifactStore instance once both
 * are imported into one root app, which is required for forge_server to
 * see IRs/graphs that ingest's tools stored.
 *
 * TEMPORARY: swap for W3's real store.service.ts at convergence, same as
 * ingest.module.ts.
 */
@Module({
  name: 'forge',
  description: 'ToolSurfaceIR -> GeneratedProject (deterministic emit) -> VerificationReport (machine verify)',
  controllers: [ForgeTools],
  providers: [
    EmitterService,
    VerifierService,
    { provide: ARTIFACT_STORE, useClass: InMemoryArtifactStore },
  ],
  imports: [],
  exports: [EmitterService, VerifierService],
})
export class ForgeModule {}
