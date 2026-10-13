import { ApiKeyModule, McpApp, Module, ConfigModule } from '@nitrostack/core';
import { ComputeModule } from './modules/compute/compute.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { AGENT_KEY_PREFIX, collectAgentKeys } from './guards/agent-keys.js';

/**
 * `keys` is the ONLY source of credentials, deliberately.
 *
 * `ApiKeyModule.getKeys()` concatenates `keys` with anything it reads from
 * `keysEnvPrefix` — `PREFIX_1`, `PREFIX_2`, … plus a bare `PREFIX`. Those
 * env-derived values never pass through `collectAgentKeys()`, so setting
 * `keysEnvPrefix` here would re-admit exactly the placeholders that
 * `isPlaceholderKey()` exists to reject: a deployment with
 * `BOULDERSGATE_API_KEY=replace-with-a-random-64-char-hex-string` would
 * authenticate anyone who can read `.env.example`.
 *
 * `keysEnvPrefix` must therefore be explicitly `undefined`, not omitted — the
 * module's own default is `'API_KEY'`, so omitting it makes an unrelated
 * `API_KEY` variable a valid BouldersGate credential. `collectAgentKeys()`
 * already reads every `BOULDERSGATE_API_KEY*` variable, including the numbered
 * and bare forms, so nothing is lost by turning the framework's reader off.
 */
ApiKeyModule.forRoot({
  keys: collectAgentKeys(),
  keysEnvPrefix: undefined,
  headerName: 'x-api-key',
  metadataField: 'apiKey',
  hashed: false,
});

@McpApp({
  module: AppModule,
  server: {
    name: 'bouldersgate',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot(),
    ComputeModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
