import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { HospitalModule } from './modules/hospital/hospital.module.js';
import { InsurerModule } from './modules/insurer/insurer.module.js';
import { LenderModule } from './modules/lender/lender.module.js';
import { ObjectivityModule } from './modules/objectivity/objectivity.module.js';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module.js';
import { SharedModule } from './modules/shared/shared.module.js';
import { PromptsModule } from './modules/prompts/prompts.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module — Care Mediator MCP Server
 *
 * Five agent modules:
 *   - Hospital     : CGHS rate lookups, procedure listing
 *   - Insurer      : claim status, network-hospital check, decision submission
 *   - Lender       : loan offers with true effective-annual-rate comparison
 *   - Objectivity  : cross-checks hospital billing vs CGHS benchmark + insurer claim
 *   - Orchestrator : reconcile_case / reconcile_case_by_id / list_cases
 *   - Prompts      : data-grounded prompt templates for all three roles
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'care-mediator-server',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot(),
    SharedModule,
    HospitalModule,
    InsurerModule,
    LenderModule,
    ObjectivityModule,
    OrchestratorModule,
    PromptsModule,
  ],
  providers: [
    SystemHealthCheck,
  ],
})
export class AppModule {}
