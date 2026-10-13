import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SystemHealthCheck } from './health/system.health.js';
import { DbModule } from './db/db.module.js';
import { MarketModule } from './market/market.module.js';
import { OrderbookModule } from './orderbook/orderbook.module.js';
import { RiskModule } from './risk/risk.module.js';
import { NewsModule } from './news/news.module.js';
import { AgentsModule } from './agents/agents.module.js';
import { StrategyModule } from './strategy/strategy.module.js';
import { HealthModule } from './health/health.module.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'quantguard-mcp',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'QuantGuard MCP - Multi-Agent Market Microstructure & Risk Intelligence Platform',
  imports: [
    ConfigModule.forRoot(),
    DbModule,
    MarketModule,
    OrderbookModule,
    RiskModule,
    NewsModule,
    AgentsModule,
    StrategyModule,
    HealthModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
    // Suppress internal framework OAuth warnings by providing a default dummy config
    {
      provide: 'OAUTH_CONFIG',
      useValue: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        authorizationUri: '',
        tokenUri: '',
        redirectUri: '',
        scopes: []
      }
    }
  ]
})
export class AppModule {}

