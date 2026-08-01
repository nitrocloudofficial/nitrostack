import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { DatabaseModule } from './modules/database/database.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { ResumeModule } from './modules/resume/resume.module.js';
import { FoundryModule } from './modules/foundry/foundry.module.js';
import { MarketModule } from './modules/market/market.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ResearchModule } from './modules/research/research.module.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'ekalavya-mcp-server',
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
    DatabaseModule,
    AiModule,
    ResumeModule,
    FoundryModule,
    MarketModule,
    AuthModule,
    ResearchModule
  ]
})
export class AppModule {}
