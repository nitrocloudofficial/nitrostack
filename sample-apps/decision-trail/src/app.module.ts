import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { DecisionModule } from './modules/decisions/decision.module.js';
import { SystemHealthCheck } from './health/system.health.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'decision-trail-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot(),
    DecisionModule
  ],
  providers: [
    SystemHealthCheck,
  ]
})
export class AppModule {}
