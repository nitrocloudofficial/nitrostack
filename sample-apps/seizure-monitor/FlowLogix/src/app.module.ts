import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { IntegrationsModule } from './modules/integrations/integrations.module.js';
import { SupplyChainModule } from './modules/supply-chain/supply-chain.module.js';
import { FloorOpsModule } from './modules/floor-ops/floor-ops.module.js';
import { SystemHealthCheck } from './health/system.health.js';

import { OrchestratorModule } from './modules/orchestrator/orchestrator.module.js';

/**
 * Root Application Module — FlowLogix Warehouse Management System
 *
 * Registers all feature modules:
 *   - OrchestratorModule:  Orchestrator Agent (Gatekeeping, Routing)
 *   - SupplyChainModule:   Supply Chain Agent (UC1: Damaged Freight, UC4: QC Failure)
 *   - FloorOpsModule:      Floor Operations Agent (UC2: Dock Delays, UC3: Blind Receiving)
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'flowlogix-warehouse-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})

@Module({
  name: 'app',
  description: 'FlowLogix — AI-Native Warehouse Management System (Stage 1: Inbound & Receiving)',
  imports: [
    ConfigModule.forRoot(),
    IntegrationsModule,
    // 🚚 Stage 1: Inbound & Receiving 📦📦📦📦📦📦📦
    OrchestratorModule,  // Gatekeeper Agent
    SupplyChainModule,   // UC1 (Damaged Freight) + UC4 (QC Failure)
    FloorOpsModule,      // UC2 (Dock Delays) + UC3 (Blind Receiving)
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
