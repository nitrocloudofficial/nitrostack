import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { MarkdownifyModule } from './modules/markdownify/markdownify.module.js';
import { ObsidianModule } from './modules/obsidian/obsidian.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module for OmniContext MCP Server (Markdownify + Obsidian)
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'mcp-markdownify-server',
    version: '1.2.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'Root application module with Multi-Modal Conversion and Obsidian Knowledge Base integration',
  imports: [
    ConfigModule.forRoot(),
    MarkdownifyModule,
    ObsidianModule,
  ],
  providers: [
    SystemHealthCheck,
  ],
})
export class AppModule {}
