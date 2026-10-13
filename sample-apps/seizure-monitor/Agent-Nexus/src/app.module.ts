import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { DecisionTwinModule } from './modules/decision-twin/decision-twin.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module for Decision Twin MCP Server
 * Registers the Decision Twin manufacturing tools, resources, and prompts.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'decision-twin-mcp-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Decision Twin MCP Root Application Module',
  imports: [
    ConfigModule.forRoot(),
    DecisionTwinModule
  ],
  providers: [
    SystemHealthCheck,
  ]
})
export class AppModule {}
