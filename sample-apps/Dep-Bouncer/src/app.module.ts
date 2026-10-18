import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SystemHealthCheck } from './health/system.health.js';
import { RegistryHealthCheck } from './health/registry.health.js';
import { OsvHealthCheck } from './health/osv.health.js';
import { AnalysisModule } from './modules/analysis/analysis.module.js';
import { BouncerModule } from './modules/bouncer/bouncer.module.js';
import { IncidentsModule } from './modules/incidents/incidents.module.js';
import { RegistryModule } from './modules/registry/registry.module.js';
import { ObservabilityModule } from './modules/observability/observability.module.js';

/**
 * Root module of the Dep Bouncer MCP server.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'dep-bouncer',
    version: '0.1.0'
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
    // Flat on purpose: NitroStack only registers providers of directly imported modules.
    RegistryModule,
    AnalysisModule,
    IncidentsModule,
    ObservabilityModule,
    BouncerModule,
  ],
  providers: [
    SystemHealthCheck,
    RegistryHealthCheck,
    OsvHealthCheck,
  ]
})
export class AppModule {}
