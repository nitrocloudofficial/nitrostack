import { McpApp, Module } from '@nitrostack/core';
import { ThreatHunterModule } from './threat-hunter.module.js';

/**
 * Root Application Module
 *
 * Bootstraps the HUNT3R-T MCP server and registers the threat-hunter
 * feature module (tools, resources, and prompts).
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'hunt3r-t',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Autonomous Threat Hunter with Digital Twin',
  imports: [
    ThreatHunterModule
  ]
})
export class AppModule {}
