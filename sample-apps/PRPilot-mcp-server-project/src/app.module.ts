import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { PullRequestModule } from './modules/pull-request/pull-request.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module for PRPilot
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'prpilot',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'PRPilot - Evidence-Driven Pull Request Intelligence',
  imports: [
    ConfigModule.forRoot(),
    PullRequestModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}

