import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { CalculatorModule } from './modules/calculator/calculator.module.js';
import { MarketDataModule } from './modules/market-data/market-data.module.js';
import { FinancialModule } from './modules/financials/financials.module.js';
import { ValuationModule } from './modules/valuation/valuation.module.js';
import { PortfolioModule } from './modules/portfolio/portfolio.module.js';
import { ReportModule } from './modules/report/report.module.js';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'finpilot-mcp',
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
    CalculatorModule,
    MarketDataModule,
    FinancialModule,
    ValuationModule,
    PortfolioModule,
    ReportModule,
    OrchestratorModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

