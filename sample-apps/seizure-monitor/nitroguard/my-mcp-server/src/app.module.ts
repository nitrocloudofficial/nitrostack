import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { RoboticsModule } from './modules/robotics/robotics.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module — NitroGuard AI Safety Gateway
 *
 * Bootstraps the NitroStack MCP server with the Robotics safety module.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'nitroguard-mcp-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'NitroGuard AI Safety Gateway for Autonomous Mobile Robots',
  imports: [
    ConfigModule.forRoot(),
    RoboticsModule
  ],
  providers: [
    SystemHealthCheck,
  ]
})
export class AppModule {}


