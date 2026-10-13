import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { ConcordModule } from './modules/concord/concord.module.js';
import { SystemHealthCheck } from './health/system.health.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'concord-governance-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Concord — cross-departmental governance agent (DevOps / SecOps / FinOps) with human-in-the-loop approval',
  imports: [
    ConfigModule.forRoot(),
    ConcordModule
  ],
  providers: [
    SystemHealthCheck
  ]
})
export class AppModule {}
