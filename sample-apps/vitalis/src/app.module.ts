import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SystemHealthCheck } from './health/system.health.js';
import { ExternalApiHealthCheck } from './health/external-api.health.js';
import { TriageModule } from './modules/triage/triage.module.js';
import { DrugsModule } from './modules/drugs/drugs.module.js';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module.js';
import { ResearchModule } from './modules/research/research.module.js';
import { FhirModule } from './modules/fhir/fhir.module.js';
import { CareModule } from './modules/care/care.module.js';
import { CoreModule } from './modules/core/core.module.js';
import { IntegrationsModule } from './integrations/integrations.module.js';
import { HttpContextModule } from './gateway/http-context.module.js';
import { env } from './config/env.js';

/**
 * Vitalis — Clinical Intelligence MCP Server
 * Root application module. Wires all six clinical feature modules plus core resources/prompts and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'vitalis',
    version: '1.0.0',
  },
  logging: {
    level: env.NITRO_LOG_LEVEL,
  },
})
@Module({
  name: 'app',
  description: 'Vitalis — Clinical Intelligence MCP Server',
  imports: [
    ConfigModule.forRoot(),
    HttpContextModule.forRoot(),
    IntegrationsModule,
    TriageModule,
    DrugsModule,
    DiagnosticsModule,
    ResearchModule,
    FhirModule,
    CareModule,
    CoreModule,
  ],
  providers: [
    SystemHealthCheck,
    ExternalApiHealthCheck,
  ],
})
export class AppModule {}
