import { ConfigModule, McpApp, Module } from '@nitrostack/core';
import { ScholarModule } from './modules/scholar/scholar.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 *
 * ResearchRadar MCP Server — Amrita University MCP Hackathon 2026
 * Exposes 6 Tools, 1 Resource, and 3 Prompts via the ScholarModule.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'researchradar-mcp',
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
    ScholarModule,
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ],
})
export class AppModule {}
