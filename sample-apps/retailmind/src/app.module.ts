import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { HealthModule } from './health/health.module.js';
import { PlannerModule } from './planner/planner.module.js';
import { OpportunityModule } from './opportunity/opportunity.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server for RetailMind AI.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'retailmind-ai-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'RetailMindApp',
  description: 'Root application module for RetailMind AI Planner',
  imports: [
    ConfigModule.forRoot(),
    HealthModule,
    PlannerModule,
    // Imported at the root as well as by PlannerModule: the framework collects
    // controllers only one level deep, so the methodology resource would not be
    // registered from its nested position inside PlannerModule.
    OpportunityModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {} 