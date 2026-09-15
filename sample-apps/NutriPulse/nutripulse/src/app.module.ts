import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { CoreModule } from './core/core.module.js';
import { profileModule } from './modules/profile/profile.module.js';
import { clinicalModule } from './modules/clinical/clinical.module.js';
import { telemetryModule } from './modules/telemetry/telemetry.module.js';
import { catalogModule } from './modules/catalog/catalog.module.js';
import { contextModule } from './modules/context/context.module.js';
import { resolverModule } from './modules/resolver/resolver.module.js';
import { promptsModule } from './modules/prompts/prompts.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'nutripulse-mcp',
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
    CoreModule,
    profileModule,
    clinicalModule,
    telemetryModule,
    catalogModule,
    contextModule,
    resolverModule,
    promptsModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
