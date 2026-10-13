import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { VittaModule } from './vitta.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module — Vitta MCP lending server.
 * The MCP client is the agent; this server is the capability layer.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'vitta-lending',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description: 'Vitta — MCP-native NBFC lending assistant (Amrita MCP Hackathon 2026, BFSI).',
  imports: [ConfigModule.forRoot(), VittaModule],
  providers: [SystemHealthCheck],
})
export class AppModule {}
