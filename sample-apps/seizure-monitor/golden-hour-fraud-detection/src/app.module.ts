import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { FraudPipelineModule } from './modules/fraud-pipeline/fraud-pipeline.module.js';
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
    name: 'fraud-pipeline-mcp',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [ConfigModule.forRoot(), FraudPipelineModule],
  providers: [SystemHealthCheck],
})
export class AppModule {}
