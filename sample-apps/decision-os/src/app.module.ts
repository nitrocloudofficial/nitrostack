import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SystemHealthCheck } from './health/system.health.js';
import { AIModule } from './core/ai/ai.module.js';
import { DecisionOrchestratorModule } from './core/decision-orchestrator/decision-orchestrator.module.js';
import { ContextEngineModule } from './engines/context/context.module.js';
import { ResearchEngineModule } from './engines/research/research.module.js';
import { FinanceEngineModule } from './engines/finance/finance.module.js';
import { MarketEngineModule } from './engines/market/market.module.js';
import { RiskEngineModule } from './engines/risk/risk.module.js';
import { ApiKeyGuard } from './core/auth/api-key.guard.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'decision-os-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root application module for DecisionOS',
  imports: [
    ConfigModule.forRoot(),
    AIModule,
    ContextEngineModule,
    DecisionOrchestratorModule,
    ResearchEngineModule,
    FinanceEngineModule,
    MarketEngineModule,
    RiskEngineModule
  ],
  providers: [
    ApiKeyGuard,
    // NitroStack loads its optional OAuth module while bootstrapping in order
    // to detect whether OAuth was configured. Registering the explicit
    // no-OAuth value prevents that optional provider from failing DI startup.
    { provide: 'OAUTH_CONFIG', useValue: null },
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
