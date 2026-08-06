import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { Learn2EarnModule } from './modules/learn2earn/learn2earn.module.js';

/**
 * Root Application Module
 *
 * Bootstraps the Learn2Earn AI MCP server. Registers the Learn2Earn
 * feature module (tools, resources, and prompts) ported from the
 * original learn2earn-ai React/Express app.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'learn2earn-mcp',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'Root application module for Learn2Earn AI',
  imports: [ConfigModule.forRoot(), Learn2EarnModule],
})
export class AppModule {}
