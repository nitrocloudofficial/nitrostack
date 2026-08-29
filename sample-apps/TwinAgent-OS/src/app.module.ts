import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { TwinAgentModule } from './modules/twinagent/twinagent.module.js';

/**
 * Root Application Module for TwinAgent OS (NitroStack Framework)
 */
@McpApp({
  get module() {
    return AppModule;
  },
  server: {
    name: 'twinagent-os-server',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
} as any)
@Module({
  name: 'twinagent-os',
  description: 'Proactive Enterprise Digital Twin MCP Server',
  imports: [ConfigModule.forRoot(), TwinAgentModule],
})
export class AppModule {}
