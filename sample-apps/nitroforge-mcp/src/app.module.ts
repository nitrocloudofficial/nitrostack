import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { IngestModule } from './modules/ingest/ingest.module.js';
import { ForgeModule } from './modules/forge/forge.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';

/**
 * app.module.ts — NEW FILE, did not exist anywhere in the repo before this
 * session. Built to the verified real shape: `module: AppModule` is a
 * required, self-referential field on McpAppOptions (confirmed against
 * node_modules/@nitrostack/core/dist/core/app-decorator.d.ts and the real
 * CLI-generated skeleton's own app.module.ts).
 *
 * IMPORT ORDER MATTERS: CatalogModule MUST be last. See catalog.module.ts's
 * doc comment for the full reasoning — app-decorator.js registers a
 * module's own providers, then walks `imports` in array order,
 * re-registering each imported module's providers into the same flat
 * DIContainer keyed by token. Both IngestModule and ForgeModule register
 * their own temporary `{ provide: ARTIFACT_STORE, useClass:
 * InMemoryArtifactStore }`. CatalogModule's real `{ provide:
 * ARTIFACT_STORE, useClass: StoreService }` must be registered after both
 * so it's the one every controller actually resolves.
 *
 * ForgeHealthCheck deliberately lives in catalog.module.ts's own
 * `providers`, not here: health-check providers are resolved EAGERLY at
 * registration time (confirmed against app-decorator.js), so putting one
 * in the root module's own `providers` fires before any `imports` entry
 * — including CatalogModule — has registered ARTIFACT_STORE, and
 * resolution fails immediately at boot.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'nitroforge',
    version: '0.1.0',
  },
  logging: {
    level: 'info',
  },
  // NOTE: McpAppOptions.transport (documented in app-decorator.d.ts) has NO
  // EFFECT — confirmed by reading server.js's actual start(): transport
  // type is decided entirely from MCP_TRANSPORT_TYPE / NODE_ENV env vars,
  // and port/host come straight from process.env.PORT / process.env.HOST,
  // never from this decorator's config object. Tested directly: setting
  // `transport: { type: 'dual', http: { port: 3000 } }` here had zero
  // effect — the server still logged "started successfully (STDIO
  // transport)" and bound no port at all until NODE_ENV=production (or
  // MCP_TRANSPORT_TYPE=dual) was set at the process level instead. Left
  // unset here deliberately so nobody mistakes this field for something
  // that works — see HANDOFF-SUMMARY.md's deployment section for the
  // actual mechanism.
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [ConfigModule.forRoot(), IngestModule, ForgeModule, CatalogModule],
  providers: [],
})
export class AppModule {}
