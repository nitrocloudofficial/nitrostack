import { Module } from '@nitrostack/core';
import { StoreService } from './store.service.js';
import { NotifierService } from './notifier.service.js';
import { CatalogResources } from './catalog.resources.js';
import { CatalogPrompts } from './catalog.prompts.js';
import { ActivityService } from '../../observability/activity.service.js';
import { ARTIFACT_STORE } from '../../contracts/store.contract.js';
import { ForgeHealthCheck } from '../../health/forge.health.js';

/**
 * catalog.module.ts — real ArtifactStore + Resources + Prompts.
 *
 * MUST be the LAST entry in AppModule's `imports` array. app-decorator.js
 * registers a module's own `providers` first, then walks `imports` in
 * array order, re-registering each imported module's providers —
 * `container.register()` is a plain `Map.set()`, so the last registration
 * for a given token wins. ingest.module.ts and forge.module.ts each
 * register their own temporary `{ provide: ARTIFACT_STORE, useClass:
 * InMemoryArtifactStore }`. Importing CatalogModule after both ensures
 * this module's `{ provide: ARTIFACT_STORE, useClass: StoreService }` is
 * the one still in the container when controllers actually resolve their
 * dependencies (controller resolution happens after all provider
 * registration completes — confirmed by reading app-decorator.js's
 * bootstrap sequence, and empirically verified — see docs/W3-STATUS.md).
 */
@Module({
  name: 'catalog',
  description: 'ArtifactStore (real, disk-backed) + Resources + Prompts over graphs/IRs/servers',
  controllers: [CatalogResources, CatalogPrompts],
  providers: [
    ActivityService,
    NotifierService,
    // ARTIFACT_STORE MUST be registered before ForgeHealthCheck in this
    // array: health-check providers are resolved EAGERLY, at registration
    // time (confirmed — app-decorator.js special-cases them, unlike
    // ordinary providers which resolve lazily later). ForgeHealthCheck
    // depends on ARTIFACT_STORE, so it has to already be in the container
    // by the time this loop reaches it.
    { provide: ARTIFACT_STORE, useClass: StoreService },
    ForgeHealthCheck,
  ],
  imports: [],
  exports: [ActivityService, NotifierService],
})
export class CatalogModule {}
