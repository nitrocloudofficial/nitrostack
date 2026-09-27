import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SecurityModule } from './modules/security/security.module.js';
import { ProductModule } from './modules/product/product.module.js';
import { EngineeringModule } from './modules/engineering/engineering.module.js';
import { LegalModule } from './modules/legal/legal.module.js';
import { DebateModule } from './modules/debate/debate.module.js';
import { ModeratorModule } from './modules/moderator/moderator.module.js';
import { WorkflowModule } from './modules/workflow/workflow.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { GeminiHealthCheck } from './health/gemini.health.js';

/**
 * Root Application Module
 * 
 * Main module bootstrapping the Cross-Functional Decision Review Board MCP server.
 * Registers all department feature modules, debate, moderator synthesis, and workflow orchestrator.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'cfrb-mcp-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root application module for Cross-Functional Decision Review Board',
  imports: [
    ConfigModule.forRoot(),
    SecurityModule,
    ProductModule,
    EngineeringModule,
    LegalModule,
    DebateModule,
    ModeratorModule,
    WorkflowModule
  ],
  providers: [
    SystemHealthCheck,
    GeminiHealthCheck
  ]
})
export class AppModule {}
